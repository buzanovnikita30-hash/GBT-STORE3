const DEFAULT_WINDOW_MS = 60_000;

type NotificationThrottleStore = Map<string, number>;

type GlobalWithChatEmailThrottle = typeof globalThis & {
  __chatEmailThrottleStore__?: NotificationThrottleStore;
};

function getStore(): NotificationThrottleStore {
  const g = globalThis as GlobalWithChatEmailThrottle;
  if (!g.__chatEmailThrottleStore__) {
    g.__chatEmailThrottleStore__ = new Map<string, number>();
  }
  return g.__chatEmailThrottleStore__;
}

/**
 * Returns true when email notification is allowed right now.
 * Throttles by (session + channel) key in-process.
 */
export function canSendChatEmailNotification(
  key: string,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();
  const store = getStore();
  const prev = store.get(key) ?? 0;

  if (now - prev < windowMs) return false;
  store.set(key, now);
  return true;
}
