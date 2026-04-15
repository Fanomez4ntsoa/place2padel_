/**
 * Toast minimal — event emitter global. Le host `<Toast />` dans _layout écoute.
 * Évite une dépendance externe pour un besoin aussi simple en Phase 6.1.
 */

type ToastTone = 'info' | 'error' | 'success';
type ToastPayload = { message: string; tone: ToastTone };
type Listener = (p: ToastPayload) => void;

const listeners = new Set<Listener>();

export function subscribeToast(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function showToast(message: string, tone: ToastTone = 'info'): void {
  listeners.forEach((l) => l({ message, tone }));
}
