import { createClient } from '@/lib/supabase/client';

type RealtimeCallback<T> = (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: T | null; old: T | null }) => void;

type TableConfig = {
  table: string;
  schema?: string;
};

class AppRealtimeService {
  private channels: Map<string, any> = new Map();
  private listeners: Map<string, Set<RealtimeCallback<any>>> = new Map();

  subscribe<T = any>(tables: TableConfig[], callback: RealtimeCallback<T>): () => void {
    const key = tables.map(t => `${t.schema || 'public'}.${t.table}`).join(',');

    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
      this.initRealtimeSubscription(tables, key);
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
      if (this.listeners.get(key)?.size === 0) {
        this.teardownSubscription(key);
      }
    };
  }

  private initRealtimeSubscription(tables: TableConfig[], channelKey: string) {
    try {
      const supabase = createClient();
      let channel = supabase.channel(channelKey);

      tables.forEach(({ table, schema = 'public' }) => {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema, table },
          (payload) => {
            this.broadcast(channelKey, {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: payload.new as any,
              old: payload.old as any,
            });
          }
        ) as typeof channel;
      });

      channel.subscribe();
      this.channels.set(channelKey, channel);
    } catch (err) {
      console.warn('[AppRealtimeService] Realtime subscription failed:', err);
    }
  }

  private broadcast(channelKey: string, payload: any) {
    this.listeners.get(channelKey)?.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error('[AppRealtimeService] Listener error:', err);
      }
    });
  }

  private teardownSubscription(channelKey: string) {
    const channel = this.channels.get(channelKey);
    if (channel) {
      try {
        const supabase = createClient();
        supabase.removeChannel(channel);
      } catch {
        // cleanup ignore
      }
      this.channels.delete(channelKey);
    }
    this.listeners.delete(channelKey);
  }
}

export const appRealtimeService = new AppRealtimeService();
