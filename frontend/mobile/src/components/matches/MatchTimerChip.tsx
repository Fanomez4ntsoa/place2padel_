import { Clock } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/design-system';
import { useElapsedTime } from '@/hooks/useElapsedTime';

/**
 * Chip timer mm:ss depuis started_at — port MatchLivePage.js:122-135.
 * Retourne null si pas de started_at (match pas encore commencé).
 *
 * `frozen` = true quand le match est completed : on affiche toujours le
 * temps total mais sans tick (le useElapsedTime hook s'arrête).
 */
export function MatchTimerChip({
  startedAtIso,
  frozen = false,
  court,
}: {
  startedAtIso: string | null | undefined;
  frozen?: boolean;
  court?: string | null;
}) {
  const elapsed = useElapsedTime(startedAtIso, !frozen);
  if (!elapsed) return null;

  return (
    <View className="items-center">
      <View
        className="flex-row items-center gap-1.5 rounded-full bg-brand-navy/5 px-4 py-1.5"
      >
        <Clock size={15} color="#1A2A4A" />
        <Text
          className="font-heading-black text-brand-navy"
          style={{ fontSize: 16, fontVariant: ['tabular-nums'] }}
        >
          {elapsed}
        </Text>
      </View>
      {court ? (
        <Text variant="caption" className="mt-1 text-[11px]">
          Terrain {court}
        </Text>
      ) : null}
    </View>
  );
}
