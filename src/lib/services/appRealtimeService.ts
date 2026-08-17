import { createClient } from '@/lib/supabase/client';

type RealtimeCallback<T> = (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: T | null; old: T | null }) => void;

type TableConfig = {
  table: string;
  schema?: string;
};

class AppRealtimeService {
  private channels: Map<string, any> = new Map();
  private listeners: Map<string, Set<RealtimeCallback<any>>> = new Map();
  private isSubscribed = false;

  subscribe<T = any>(tables: TableConfig[], callback: RealtimeCallback<T>): () => void {
    const key = tables.map(t => `${t.schema || 'public'}.${t.table}`).join(',');

    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    if (!this.isSubscribed) {
      this.initRealtimeSubscription(tables);
    }

    return () => {
      this.listeners.get(key)?.delete(callback);
      if (this.listeners.get(key)?.size === 0) {
        this.teardownSubscription(key);
      }
    };
  }

  private initRealtimeSubscription(tables: TableConfig[]) {
    try {
      const supabase = createClient();
      const channelName = `app-realtime-${Date.now()}`;

      let channel = supabase.channel(channelName);

      tables.forEach(({ table, schema = 'public' }) => {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema, table },
          (payload) => {
            this.broadcast(tables, {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: payload.new as any,
              old: payload.old as any,
            });
          }
        ) as typeof channel;
      });

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
        }
      });

      this.channels.set(tables.map(t => t.table).join(','), channel);
    } catch (err) {
      console.warn('[AppRealtimeService] Realtime subscription failed:', err);
    }
  }

  private broadcast(tables: TableConfig[], payload: any) {
    const key = tables.map(t => `${t.schema || 'public'}.${t.table}`).join(',');
    this.listeners.get(key)?.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error('[AppRealtimeService] Listener error:', err);
      }
    });
  }

  private teardownSubscription(key: string) {
    const channelKey = key.split('.').pop();
    if (this.channels.has(channelKey || key)) {
      try {
        const supabase = createClient();
        const channel = this.channels.get(channelKey || key);
        if (channel) supabase.removeChannel(channel);
      } catch {
        // cleanup ignore
      }
      this.channels.delete(channelKey || key);
      this.listeners.delete(key);
    }
  }
}

export const appRealtimeService = new AppRealtimeService();
