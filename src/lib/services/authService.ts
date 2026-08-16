import { AppSession, AppRole } from '@/types';

const SESSION_KEY = 'veylo_session_v1';
const OWNER_PIN = '1234'; // Default owner PIN (in production: hashed + salted)

/**
 * Auth Service — localStorage-based session management.
 * 
 * Architecture Note: This is a client-side session simulation designed for
 * the static export (GitHub Pages) deployment. For production with a server,
 * replace with Supabase Auth or JWT-based auth. The role separation logic
 * remains the same.
 */
class AuthService {
  /**
   * Get current active session from localStorage.
   */
  getSession(): AppSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as AppSession;
      
      // Auto-initialize default Robin owner session for smooth demo exploration
      const defaultSession: AppSession = {
        role: 'OWNER',
        userId: 'owner_robin',
        name: 'Robin',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(defaultSession));
      return defaultSession;
    } catch {
      return null;
    }
  }

  /**
   * Set a session (login).
   */
  setSession(session: AppSession): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  /**
   * Clear the current session (logout).
   */
  clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  /**
   * Check if user has a specific role.
   */
  hasRole(role: AppRole): boolean {
    const session = this.getSession();
    return session?.role === role;
  }

  /**
   * Check if user is authenticated with any role.
   */
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Owner login with PIN verification.
   * In production, this would be a server-side call with hashed passwords.
   */
  loginAsOwner(name: string, pin: string): { success: boolean; error?: string } {
    if (pin !== OWNER_PIN) {
      return { success: false, error: 'Invalid PIN. Please try again.' };
    }

    const session: AppSession = {
      role: 'OWNER',
      userId: `owner_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    this.setSession(session);
    return { success: true };
  }

  /**
   * Rider quick-register — name + phone only.
   * Creates a rider session with auto-generated ID.
   */
  loginAsRider(name: string, phone: string): { success: boolean; error?: string; session?: AppSession } {
    if (!name.trim()) {
      return { success: false, error: 'Name is required.' };
    }
    if (!phone.trim() || phone.trim().length < 10) {
      return { success: false, error: 'Valid phone number is required.' };
    }

    // Normalize phone
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const displayPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : phone.trim();

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
   * Admin login (future extensibility).
   */
  loginAsAdmin(name: string, pin: string): { success: boolean; error?: string } {
    if (pin !== 'admin2024') {
      return { success: false, error: 'Invalid admin credentials.' };
    }

    const session: AppSession = {
      role: 'ADMIN',
      userId: `admin_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    this.setSession(session);
    return { success: true };
  }

  /**
   * Require a specific role — used in page guards.
   * Returns true if the current session has the required role.
   */
  requireRole(role: AppRole): boolean {
    return this.hasRole(role);
  }

  /**
   * Get the current user display name.
   */
  getDisplayName(): string {
    return this.getSession()?.name || 'Guest';
  }

  /**
   * Get current user ID.
   */
  getCurrentUserId(): string | null {
    return this.getSession()?.userId || null;
  }
}

export const authService = new AuthService();
