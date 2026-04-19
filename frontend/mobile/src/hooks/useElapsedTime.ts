import { useEffect, useState } from 'react';

/**
 * Hook timer live — retourne un string formaté mm:ss depuis un timestamp
 * ISO de départ. Port Emergent MatchLivePage.js:26-34.
 *
 * - Si `startedAtIso` est null/undefined, retourne null (caller masque le timer).
 * - Si `active` est false, fige le compteur (pas d'interval) — utilisé quand
 *   le match passe `completed` pour figer le temps de jeu affiché.
 *
 * Tick interne 1s via setInterval. Reset propre à l'unmount.
 */
export function useElapsedTime(
  startedAtIso: string | null | undefined,
  active: boolean = true,
): string | null {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!startedAtIso || !active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAtIso, active]);

  if (!startedAtIso) return null;
  const startMs = new Date(startedAtIso).getTime();
  if (Number.isNaN(startMs)) return null;

  const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
