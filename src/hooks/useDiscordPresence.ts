import { useEffect } from 'react';
import { PROFILE } from '../config/profile';
import {
  useAppStore,
  type DiscordActivity,
  type DiscordStatusType,
  type SpotifyData,
} from '../store/useAppStore';

export interface LanyardDataPayload {
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
  active_on_discord_desktop?: boolean;
  active_on_discord_mobile?: boolean;
  active_on_discord_web?: boolean;
  /** Optional test/debug flag for simulating unreachable Lanyard state */
  unreachable?: boolean;
}

interface LanyardSocketMessage {
  op: number;
  d?: LanyardDataPayload & {
    heartbeat_interval?: number;
  };
  t?: 'INIT_STATE' | 'PRESENCE_UPDATE';
}

// Module-level singleton state so StrictMode or route navigation never opens duplicate sockets
let sharedWs: WebSocket | null = null;
let sharedHeartbeatTimer: number | null = null;
let sharedReconnectTimer: number | null = null;
let sharedPollTimer: number | null = null;
let subscriberCount = 0;
let retryAttempt = 0;
let mockOverrideActive = false;

function applyPresencePayloadToStore(
  payload: LanyardDataPayload,
  viaSocket: boolean,
  userId: string,
): void {
  const setDiscordPresence = useAppStore.getState().setDiscordPresence;

  if (payload.unreachable) {
    setDiscordPresence({
      status: 'offline',
      username: 'christovandy',
      displayName: PROFILE.fullName,
      avatarUrl: null,
      customStatus: 'SIGNAL LOST: RETRYING',
      customStatusEmoji: null,
      activities: [],
      listeningToSpotify: false,
      spotify: null,
      platforms: { desktop: false, mobile: false, web: false },
      connected: false,
      usingFallback: true,
      unreachable: true,
    });
    return;
  }

  const user = payload.discord_user;

  if (!user) {
    setDiscordPresence({
      status: payload.discord_status ?? 'offline',
      username: 'christovandy',
      displayName: PROFILE.fullName,
      avatarUrl: null,
      customStatus: 'JOIN DISCORD.GG/LANYARD TO SYNC STATUS',
      customStatusEmoji: null,
      activities: [
        {
          name: 'LANYARD // AWAITING SERVER LINK',
          type: 0,
          details: `Discord User ID: ${userId}`,
          state: 'Join discord.gg/lanyard to bridge presence',
          timestamps: { start: Date.now() },
        },
      ],
      listeningToSpotify: false,
      spotify: null,
      platforms: {
        desktop: Boolean(payload.active_on_discord_desktop),
        mobile: Boolean(payload.active_on_discord_mobile),
        web: Boolean(payload.active_on_discord_web),
      },
      connected: viaSocket,
      usingFallback: true,
      unreachable: false,
    });
    return;
  }

  const avatarUrl =
    user.id && user.avatar
      ? user.avatar.startsWith('http') || user.avatar.startsWith('data:')
        ? user.avatar
        : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
      : null;

  const rawActivities = payload.activities ?? [];
  const customAct = rawActivities.find((a) => a.type === 4);
  const nonCustomActivities = rawActivities.filter((a) => a.type !== 4);

  setDiscordPresence({
    status: payload.discord_status ?? 'offline',
    username: user.username,
    displayName: user.global_name || user.display_name || user.username || PROFILE.fullName,
    avatarUrl,
    customStatus: customAct?.state || customAct?.details || null,
    customStatusEmoji: customAct?.emoji ?? null,
    activities: nonCustomActivities,
    listeningToSpotify: Boolean(payload.listening_to_spotify && payload.spotify),
    spotify: payload.spotify ?? null,
    platforms: {
      desktop: Boolean(payload.active_on_discord_desktop),
      mobile: Boolean(payload.active_on_discord_mobile),
      web: Boolean(payload.active_on_discord_web),
    },
    connected: viaSocket,
    usingFallback: false,
    unreachable: false,
  });
}

export function useDiscordPresence(): void {
  useEffect(() => {
    const userId = PROFILE.discordUserId.trim();
    const isPlaceholder = !userId || userId.startsWith('TODO') || !/^\d{15,22}$/.test(userId);

    // Expose window.__setPresence for Playwright & interactive testing
    if (typeof window !== 'undefined') {
      const win = window as unknown as Record<string, unknown>;
      win.__setPresence = (mockPayload: LanyardDataPayload | null) => {
        if (!mockPayload) {
          mockOverrideActive = false;
          return;
        }
        mockOverrideActive = true;
        const normalized: LanyardDataPayload = {
          discord_user: mockPayload.unreachable
            ? undefined
            : (mockPayload.discord_user ?? {
                id: userId || '832522840682790913',
                username: 'christovandy',
                global_name: PROFILE.fullName,
                avatar: null,
              }),
          ...mockPayload,
        };
        applyPresencePayloadToStore(normalized, !mockPayload.unreachable, userId);
      };
    }

    if (isPlaceholder) {
      useAppStore.getState().setDiscordPresence({
        status: 'offline',
        username: 'christovandy',
        displayName: PROFILE.fullName,
        avatarUrl: null,
        customStatus: 'CONFIGURE discordUserId IN src/config/profile.ts FOR LIVE LANYARD SYNC',
        customStatusEmoji: null,
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
        platforms: { desktop: false, mobile: false, web: false },
        connected: false,
        usingFallback: true,
        unreachable: false,
      });
      return;
    }

    subscriberCount += 1;

    const stopRestPolling = () => {
      if (sharedPollTimer !== null) {
        clearInterval(sharedPollTimer);
        sharedPollTimer = null;
      }
    };

    const pollRestFallback = async () => {
      if (mockOverrideActive) return;
      try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`);
        if (!res.ok) {
          const errJson = (await res.json().catch(() => null)) as {
            error?: { code?: string; message?: string };
          } | null;
          if (errJson?.error?.code === 'user_not_monitored') {
            applyPresencePayloadToStore({}, false, userId);
            return;
          }
          applyPresencePayloadToStore({ unreachable: true }, false, userId);
          return;
        }
        const json = (await res.json()) as { success?: boolean; data?: LanyardDataPayload };
        if (json.success && json.data && !mockOverrideActive) {
          applyPresencePayloadToStore(json.data, false, userId);
        }
      } catch {
        if (!mockOverrideActive) {
          applyPresencePayloadToStore({ unreachable: true }, false, userId);
        }
      }
    };

    const startRestPolling = () => {
      if (sharedPollTimer !== null) return;
      void pollRestFallback();
      sharedPollTimer = window.setInterval(() => {
        void pollRestFallback();
      }, 30000);
    };

    const connectSocket = () => {
      if (subscriberCount <= 0) return;
      if (
        sharedWs &&
        (sharedWs.readyState === WebSocket.OPEN || sharedWs.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      try {
        sharedWs = new WebSocket('wss://api.lanyard.rest/socket');
        if (typeof window !== 'undefined') {
          const win = window as unknown as Record<string, unknown>;
          win.__LANYARD_SOCKET_COUNT__ = ((win.__LANYARD_SOCKET_COUNT__ as number) || 0) + 1;
        }
      } catch {
        startRestPolling();
        return;
      }

      sharedWs.onmessage = (event) => {
        if (mockOverrideActive) return;
        try {
          const msg = JSON.parse(event.data as string) as LanyardSocketMessage;
          if (msg.op === 1 && msg.d?.heartbeat_interval) {
            sharedWs?.send(
              JSON.stringify({
                op: 2,
                d: { subscribe_to_id: userId },
              }),
            );
            if (sharedHeartbeatTimer !== null) clearInterval(sharedHeartbeatTimer);
            sharedHeartbeatTimer = window.setInterval(() => {
              if (sharedWs?.readyState === WebSocket.OPEN) {
                sharedWs.send(JSON.stringify({ op: 3 }));
              }
            }, msg.d.heartbeat_interval);
          } else if (
            msg.op === 0 &&
            (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') &&
            msg.d
          ) {
            retryAttempt = 0;
            stopRestPolling();
            applyPresencePayloadToStore(msg.d, true, userId);
          }
        } catch {
          // Ignore malformed frame
        }
      };

      sharedWs.onerror = () => {
        sharedWs?.close();
      };

      sharedWs.onclose = () => {
        if (sharedHeartbeatTimer !== null) {
          clearInterval(sharedHeartbeatTimer);
          sharedHeartbeatTimer = null;
        }
        sharedWs = null;
        if (subscriberCount <= 0) return;
        startRestPolling();
        const attempt = retryAttempt;
        retryAttempt = Math.min(attempt + 1, 6);
        const backoffMs = Math.min(30000, 1500 * Math.pow(2, attempt));
        if (sharedReconnectTimer !== null) clearTimeout(sharedReconnectTimer);
        sharedReconnectTimer = window.setTimeout(connectSocket, backoffMs);
      };
    };

    connectSocket();

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      if (subscriberCount === 0) {
        if (sharedHeartbeatTimer !== null) {
          clearInterval(sharedHeartbeatTimer);
          sharedHeartbeatTimer = null;
        }
        if (sharedReconnectTimer !== null) {
          clearTimeout(sharedReconnectTimer);
          sharedReconnectTimer = null;
        }
        stopRestPolling();
        sharedWs?.close();
        sharedWs = null;
      }
    };
  }, []);
}
