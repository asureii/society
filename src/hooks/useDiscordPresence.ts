import { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import {
  useAppStore,
  type DiscordActivity,
  type DiscordStatusType,
  type SpotifyData,
} from '../store/useAppStore';

interface LanyardDataPayload {
  discord_user?: {
    id: string;
    username: string;
    global_name?: string;
    display_name?: string;
    avatar?: string | null;
  };
  discord_status?: DiscordStatusType;
  activities?: DiscordActivity[];
  listening_to_spotify?: boolean;
  spotify?: SpotifyData | null;
}

interface LanyardSocketMessage {
  op: number;
  d?: {
    heartbeat_interval?: number;
    discord_user?: LanyardDataPayload['discord_user'];
    discord_status?: DiscordStatusType;
    activities?: DiscordActivity[];
    listening_to_spotify?: boolean;
    spotify?: SpotifyData | null;
  };
  t?: 'INIT_STATE' | 'PRESENCE_UPDATE';
}

export function useDiscordPresence(): void {
  const setDiscordPresence = useAppStore((s) => s.setDiscordPresence);
  const retryAttemptRef = useRef<number>(0);

  useEffect(() => {
    const userId = PROFILE.discordUserId.trim();
    const isPlaceholder = !userId || userId.startsWith('TODO') || !/^\d{15,22}$/.test(userId);

    if (isPlaceholder) {
      setDiscordPresence({
        status: 'offline',
        username: 'christovandy',
        displayName: PROFILE.fullName,
        avatarUrl: null,
        customStatus: 'CONFIGURE discordUserId IN src/config/profile.ts FOR LIVE LANYARD SYNC',
        activities: [
          {
            name: 'PILOT FILE // ENTRY PLUG',
            type: 0,
            details: 'Awaiting Lanyard Discord User ID',
            state: 'Edit src/config/profile.ts',
            timestamps: { start: Date.now() - 1420 * 1000 },
          },
        ],
        listeningToSpotify: false,
        spotify: null,
        connected: false,
        usingFallback: true,
      });
      return;
    }

    let ws: WebSocket | null = null;
    let heartbeatTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let pollTimer: number | null = null;
    let unmounted = false;

    const applyLanyardPayload = (payload: LanyardDataPayload, viaSocket: boolean) => {
      if (unmounted) return;
      const user = payload.discord_user;
      const avatarUrl =
        user?.id && user?.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
          : null;

      const rawActivities = payload.activities ?? [];
      const customAct = rawActivities.find((a) => a.type === 4);
      const nonCustomActivities = rawActivities.filter((a) => a.type !== 4);

      setDiscordPresence({
        status: payload.discord_status ?? 'offline',
        username: user?.username ?? 'christovandy',
        displayName: user?.global_name || user?.display_name || PROFILE.fullName,
        avatarUrl,
        customStatus: customAct?.state || customAct?.details || null,
        activities: nonCustomActivities,
        listeningToSpotify: Boolean(payload.listening_to_spotify && payload.spotify),
        spotify: payload.spotify ?? null,
        connected: viaSocket,
        usingFallback: false,
      });
    };

    const pollRestFallback = async () => {
      try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { success?: boolean; data?: LanyardDataPayload };
        if (json.success && json.data) {
          applyLanyardPayload(json.data, false);
        }
      } catch {
        // Ignore network errors during fallback polling
      }
    };

    const startRestPolling = () => {
      if (pollTimer !== null) return;
      void pollRestFallback();
      pollTimer = window.setInterval(() => {
        void pollRestFallback();
      }, 30000);
    };

    const stopRestPolling = () => {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connectSocket = () => {
      if (unmounted) return;
      try {
        ws = new WebSocket('wss://api.lanyard.rest/socket');
      } catch {
        startRestPolling();
        return;
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as LanyardSocketMessage;
          if (msg.op === 1 && msg.d?.heartbeat_interval) {
            // op 1: Hello -> send op 2 Initialize and start op 3 heartbeat loop
            ws?.send(
              JSON.stringify({
                op: 2,
                d: { subscribe_to_id: userId },
              }),
            );
            if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
            heartbeatTimer = window.setInterval(() => {
              if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ op: 3 }));
              }
            }, msg.d.heartbeat_interval);
          } else if (
            msg.op === 0 &&
            (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') &&
            msg.d
          ) {
            retryAttemptRef.current = 0;
            stopRestPolling();
            applyLanyardPayload(msg.d, true);
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onerror = () => {
        ws?.close();
      };

      ws.onclose = () => {
        if (heartbeatTimer !== null) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (unmounted) return;
        // Start 30s REST polling fallback while socket is down, and schedule exponential backoff reconnect
        startRestPolling();
        const attempt = retryAttemptRef.current;
        retryAttemptRef.current = Math.min(attempt + 1, 6);
        const backoffMs = Math.min(30000, 1500 * Math.pow(2, attempt));
        reconnectTimer = window.setTimeout(connectSocket, backoffMs);
      };
    };

    connectSocket();

    return () => {
      unmounted = true;
      if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      stopRestPolling();
      ws?.close();
    };
  }, [setDiscordPresence]);
}
