import { supabase } from './client';
import type { AppSession } from '@/types';

export const supabaseAuth = {
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession(): Promise<AppSession | null> {
    const user = await this.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (!data) return null;
    return {
      userId: user.id,
      role: data.role || 'OWNER',
      name: data.full_name || user.email || 'User',
      phone: data.phone,
      email: user.email,
      createdAt: data.created_at,
    };
  },

  async getOrganizationId() {
    const user = await this.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    return data?.organization_id ?? null;
  },
};
