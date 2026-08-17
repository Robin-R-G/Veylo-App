import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { AppSession, AppRole } from '@/types';

const SESSION_KEY = 'veylo_session_v1';

let inMemorySession: AppSession | null = null;

class AuthService {
  getSession(): AppSession | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return inMemorySession;
    }
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as AppSession;
    } catch {
      return inMemorySession;
    }
    return null;
  }

  setSession(session: AppSession): void {
    inMemorySession = session;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch {}
    }
  }

  clearSession(): void {
    inMemorySession = null;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {}
    }
  }

  hasRole(role: AppRole | 'SUPER_ADMIN'): boolean {
    const session = this.getSession();
    if (!session) return false;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return session.role === 'ADMIN' || (session.role as string) === 'SUPER_ADMIN';
    }
    return session.role === role;
  }

  isPlatformAdmin(): boolean {
    return this.hasRole('ADMIN') || this.hasRole('SUPER_ADMIN');
  }

  isOwner(): boolean {
    return this.hasRole('OWNER');
  }

  isRider(): boolean {
    return this.hasRole('RIDER');
  }

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  getDisplayName(): string {
    return this.getSession()?.name || 'Guest';
  }

  getCurrentUserId(): string | null {
    return this.getSession()?.userId || null;
  }

  requireRole(role: AppRole): boolean {
    return this.hasRole(role);
  }

  /**
   * Owner signup with email + password.
   * Creates Supabase Auth user + profiles row + organization.
   */
  async signupOwner(
    email: string,
    password: string,
    fullName: string,
    phone?: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' };
    }

    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'OWNER' } },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Signup failed — no user returned.' };
    }

    // Create organization
    const orgId = `org_${authData.user.id.slice(0, 8)}`;
    const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    await supabase.from('organizations').insert({
      id: orgId,
      name: fullName + "'s Fleet",
      slug: slug || `fleet-${Date.now()}`,
      plan_tier: 'FREE',
      business_name: fullName,
      email,
      phone: phone || null,
      default_state: 'Kerala',
      default_city: 'Kozhikode',
      upi_id: 'vehicleowner@upi',
      upi_payee_name: fullName,
      upi_enabled: false,
      tax_enabled: false,
      cgst_rate: 0,
      sgst_rate: 0,
      igst_rate: 0,
      invoice_prefix: 'INV',
    });

    // Create profile
    await supabase.from('profiles').insert({
      id: `prof_${authData.user.id.slice(0, 8)}`,
      user_id: authData.user.id,
      full_name: fullName,
      email,
      phone: phone || null,
      role: 'OWNER',
      organization_id: orgId,
    });

    // Create default subscription
    await supabase.from('subscriptions').insert({
      id: `sub_${authData.user.id.slice(0, 8)}`,
      organization_id: orgId,
      plan_id: 'FREE',
      status: 'ACTIVE',
      started_at: new Date().toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      provider: 'SUPABASE',
    });

    // Set session
    const session: AppSession = {
      role: 'OWNER',
      userId: authData.user.id,
      name: fullName,
      email,
      createdAt: new Date().toISOString(),
    };
    this.setSession(session);

    return { success: true };
  }

  /**
   * Owner login with email + password.
   */
  async loginAsOwner(
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' };
    }

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Login failed.' };
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    const session: AppSession = {
      role: (profile?.role as AppRole) || 'OWNER',
      userId: data.user.id,
      name: profile?.full_name || data.user.email || 'User',
      email: data.user.email,
      phone: profile?.phone,
      createdAt: profile?.created_at || new Date().toISOString(),
    };
    this.setSession(session);

    return { success: true };
  }

  /**
   * Rider quick-register — name + phone, creates Supabase auth user.
   */
  async loginAsRider(
    name: string,
    phone: string,
  ): Promise<{ success: boolean; error?: string; session?: AppSession }> {
    if (!name.trim()) {
      return { success: false, error: 'Name is required.' };
    }
    if (!phone.trim() || phone.trim().length < 10) {
      return { success: false, error: 'Valid 10-digit phone number is required.' };
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const email = `rider_${cleanPhone}@veylo.app`;
    const password = `rider_${cleanPhone}_${Date.now()}`;

    if (isSupabaseConfigured) {
      const supabase = createClient();

      // Try to sign up rider (may fail if already exists)
      const { data: authData } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, role: 'RIDER', phone } },
      });

      if (authData?.user) {
        // Create rider profile
        await supabase.from('profiles').insert({
          id: `prof_rider_${cleanPhone}`,
          user_id: authData.user.id,
          full_name: name,
          phone,
          role: 'RIDER',
        }); // Ignore if duplicate
      }

      // Sign in
      await supabase.auth.signInWithPassword({ email, password });
    }

    const displayPhone = cleanPhone.length === 10
      ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
      : phone.trim();

    const session: AppSession = {
      role: 'RIDER',
      userId: `rider_${cleanPhone}_${Date.now().toString(36)}`,
      name: name.trim(),
      phone: displayPhone,
      createdAt: new Date().toISOString(),
    };

    this.setSession(session);
    return { success: true, session };
  }

  /**
   * Platform Admin login — email + password via Supabase Auth.
   */
  async loginAsAdmin(
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' };
    }

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Login failed.' };
    }

    // Check if user has admin profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      await supabase.auth.signOut();
      return { success: false, error: 'Not authorized as admin.' };
    }

    const session: AppSession = {
      role: 'ADMIN',
      userId: data.user.id,
      name: profile?.full_name || data.user.email || 'Admin',
      email: data.user.email,
      createdAt: profile?.created_at || new Date().toISOString(),
    };
    this.setSession(session);

    return { success: true };
  }

  /**
   * Logout — signs out from Supabase + clears local session.
   */
  async logout(): Promise<void> {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    this.clearSession();
  }
}

export const authService = new AuthService();
