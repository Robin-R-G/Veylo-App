import { AppSession, AppRole } from '@/types';

const SESSION_KEY = 'veylo_session_v1';
const OWNER_PIN = '1234'; // Default owner PIN

// In-memory fallback store for Node/SSR/Unit tests
let inMemorySession: AppSession | null = null;

/**
 * Auth Service — session management with strict role isolation.
 * Roles: 'OWNER' | 'RIDER' | 'ADMIN' | 'SUPER_ADMIN'
 */
class AuthService {
  /**
   * Get current active session.
   */
  getSession(): AppSession | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return inMemorySession;
    }
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as AppSession;
      
      // Auto-initialize default Owner session for demo exploration
      const defaultSession: AppSession = {
        role: 'OWNER',
        userId: 'owner_robin',
        name: 'Robin',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(defaultSession));
      return defaultSession;
    } catch {
      return inMemorySession;
    }
  }

  /**
   * Set a session (login).
   */
  setSession(session: AppSession): void {
    inMemorySession = session;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch {
        // storage quota ignore
      }
    }
  }

  /**
   * Clear the current session (logout).
   */
  clearSession(): void {
    inMemorySession = null;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Check if user has a specific role.
   */
  hasRole(role: AppRole | 'SUPER_ADMIN'): boolean {
    const session = this.getSession();
    if (!session) return false;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return session.role === 'ADMIN' || (session.role as string) === 'SUPER_ADMIN';
    }
    return session.role === role;
  }

  /**
   * Check if the current session is a Platform Admin (Super Admin).
   */
  isPlatformAdmin(): boolean {
    return this.hasRole('ADMIN') || this.hasRole('SUPER_ADMIN');
  }

  /**
   * Check if the current session is an Owner.
   */
  isOwner(): boolean {
    return this.hasRole('OWNER');
  }

  /**
   * Check if the current session is a Rider.
   */
  isRider(): boolean {
    return this.hasRole('RIDER');
  }

  /**
   * Check if user is authenticated with any valid session.
   */
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Owner login with PIN verification.
   */
  loginAsOwner(name: string, pin: string): { success: boolean; error?: string } {
    if (pin !== OWNER_PIN && pin !== '1234') {
      return { success: false, error: 'Invalid Owner PIN. Please enter 1234.' };
    }

    const session: AppSession = {
      role: 'OWNER',
      userId: `owner_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name: name.trim() || 'Fleet Owner',
      createdAt: new Date().toISOString(),
    };

    this.setSession(session);
    return { success: true };
  }

  /**
   * Rider quick-register — name + phone only.
   */
  loginAsRider(name: string, phone: string): { success: boolean; error?: string; session?: AppSession } {
    if (!name.trim()) {
      return { success: false, error: 'Name is required.' };
    }
    if (!phone.trim() || phone.trim().length < 10) {
      return { success: false, error: 'Valid 10-digit phone number is required.' };
    }

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
   * Platform Admin login.
   * Allowed admin keys: 'admin2024', 'veyloadmin', 'admin123', 'admin'
   */
  loginAsAdmin(identifier: string, pinOrPass: string): { success: boolean; error?: string } {
    const validPins = ['admin2024', 'veyloadmin', 'admin123', 'admin'];
    if (!validPins.includes(pinOrPass.trim())) {
      return { success: false, error: 'Invalid admin credentials or security key.' };
    }

    const session: AppSession = {
      role: 'ADMIN',
      userId: 'super_admin_veylo',
      name: identifier.trim() || 'Platform Super Admin',
      email: 'admin@veylo.app',
      createdAt: new Date().toISOString(),
    };

    this.setSession(session);
    return { success: true };
  }

  /**
   * Require a specific role.
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
