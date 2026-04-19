import { ScrollView, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Text } from '@/design-system';
import type { TournamentMatch } from '@/features/matches/types';

/**
 * Port Emergent d5ac086 [components/BracketView.js:9-200] adapté RN + SVG.
 *
 * Stratégie de layout — lignes absolues déterministes (pas de `ref.getBoundingClientRect`
 * indispo en RN) :
 *  - Colonnes = rounds, triées DESC (R4 = 8èmes en 1er visuellement, R1 = Finale à droite).
 *  - Hauteur de chaque match fixe (MATCH_H).
 *  - Pitch vertical par colonne : 2^(colIdx) × (MATCH_H + BASE_GAP) / 2 → la finale
 *    est centrée entre ses deux demi-finales, les quarts entre leurs 8èmes, etc.
 *  - Chaque paire (m1, m2) d'une colonne ri rejoint nextMatch[ri/2] dans ri+1.
 *  - Connecteurs SVG = 3 segments (horiz court / vertical central / horiz long).
 *
 * L'approche `d5ac086` utilisait computeLines avec getBoundingClientRect ; on adopte ici
 * une formule analytique équivalente, stable car aucun reflow async.
 */

const MATCH_W = 220;
const MATCH_H = 64;
const COL_GAP = 48;
const COL_PAD_X = 12;
const BASE_GAP = 16;
const HEADER_H = 24;

const ROUND_NAMES: Record<number, string> = {
  1: 'Finale',
  2: 'Demi-finales',
  3: 'Quarts',
  4: '8èmes',
  5: '16èmes',
};

interface Props {
  matches: TournamentMatch[];
}

export function BracketView({ matches }: Props) {
  // Ne garde que les matchs de phase bracket (+ bloc main). Le reclassement
  // / consolante / poule ne sont PAS des brackets arborescents.
  const bracketMatches = matches.filter(
    (m) => m.phase === 'bracket' && (m.bloc === 'main' || !m.bloc),
  );

  if (bracketMatches.length === 0) {
    return (
      <View className="items-center py-10">
        <Text variant="caption" className="text-center text-[12px]">
          Le tableau n&apos;a pas encore été généré.
        </Text>
      </View>
    );
  }

  // Group by round. Tri DESC : 1er tour (round max) à gauche, finale à droite.
  const grouped = new Map<number, TournamentMatch[]>();
  bracketMatches.forEach((m) => {
    const r = m.round ?? 1;
    if (!grouped.has(r)) grouped.set(r, []);
    grouped.get(r)!.push(m);
  });
  // Tri stable intra-round par match_number (fallback uuid string).
  for (const [, arr] of grouped) {
    arr.sort(
      (a, b) =>
        (a.match_number ?? 0) - (b.match_number ?? 0) || a.uuid.localeCompare(b.uuid),
    );
  }

  const rounds = Array.from(grouped.keys()).sort((a, b) => b - a);
  const maxMatchesPerCol = Math.max(...rounds.map((r) => grouped.get(r)!.length));

  // Hauteur totale = (maxMatches) × (MATCH_H + BASE_GAP) + HEADER_H.
  const totalHeight = maxMatchesPerCol * (MATCH_H + BASE_GAP) + HEADER_H + 16;
  const width =
    rounds.length * MATCH_W + (rounds.length - 1) * COL_GAP + COL_PAD_X * 2;

  // Coord Y du centre d'un match dans une colonne. Formule analytique :
  // yCenter(col, i) = HEADER_H + (colSpacing/2) + i × colSpacing
  // avec colSpacing = totalHeight_working / nbMatchesInCol
  const workingHeight = maxMatchesPerCol * (MATCH_H + BASE_GAP);
  const getMatchYCenter = (colIdx: number, idxInCol: number): number => {
    const nbMatchesInCol = grouped.get(rounds[colIdx])!.length;
    const colSpacing = workingHeight / nbMatchesInCol;
    return HEADER_H + colSpacing / 2 + idxInCol * colSpacing;
  };

  const getMatchX = (colIdx: number): number =>
    COL_PAD_X + colIdx * (MATCH_W + COL_GAP);

  // Lignes SVG : pour chaque colonne ri<rounds-1, connecte les paires (2i, 2i+1)
  // vers leur parent en colonne ri+1.
  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (let colIdx = 0; colIdx < rounds.length - 1; colIdx++) {
    const currentMatches = grouped.get(rounds[colIdx])!;
    for (let mi = 0; mi < currentMatches.length; mi += 2) {
      const m1 = currentMatches[mi];
      const m2 = currentMatches[mi + 1];
      const parentIdx = Math.floor(mi / 2);

      const y1 = getMatchYCenter(colIdx, mi);
      const y2 = m2 ? getMatchYCenter(colIdx, mi + 1) : y1;
      const yParent = getMatchYCenter(colIdx + 1, parentIdx);

      const xRight = getMatchX(colIdx) + MATCH_W;
      const xParent = getMatchX(colIdx + 1);
      const midX = xRight + (xParent - xRight) / 2;

      // Horiz m1 → midX
      lines.push({ x1: xRight, y1, x2: midX, y2: y1, key: `h1-${m1.uuid}` });
      // Vertical m1 → parent
      lines.push({ x1: midX, y1, x2: midX, y2: yParent, key: `v1-${m1.uuid}` });

      if (m2) {
        lines.push({
          x1: xRight,
          y1: y2,
          x2: midX,
          y2,
          key: `h2-${m2.uuid}`,
        });
        lines.push({
          x1: midX,
          y1: y2,
          x2: midX,
          y2: yParent,
          key: `v2-${m2.uuid}`,
        });
      }

      // Horiz midX → parent
      lines.push({
        x1: midX,
        y1: yParent,
        x2: xParent,
        y2: yParent,
        key: `hp-${parentIdx}-${colIdx}`,
      });
    }
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width, height: totalHeight, paddingVertical: 8 }}>
        {/* Connecteurs SVG */}
        <Svg
          width={width}
          height={totalHeight}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {lines.map((l) => (
            <Line
              key={l.key}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="#1A2A4A"
              strokeOpacity={0.2}
              strokeWidth={2}
            />
          ))}
        </Svg>

        {/* Colonnes */}
        {rounds.map((r, colIdx) => {
          const colMatches = grouped.get(r)!;
          const x = getMatchX(colIdx);
          return (
            <View key={r} style={{ position: 'absolute', left: x, top: 0 }}>
              <Text
                variant="caption"
                className="text-center text-[10px] font-heading-black uppercase tracking-wider text-brand-orange"
                style={{ width: MATCH_W, marginBottom: 4 }}
              >
                {ROUND_NAMES[r] ?? `Tour ${r}`}
              </Text>
              {colMatches.map((m, i) => {
                const y = getMatchYCenter(colIdx, i) - MATCH_H / 2;
                return (
                  <View
                    key={m.uuid}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: y,
                      width: MATCH_W,
                    }}
                  >
                    <BracketMatchNode match={m} />
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function BracketMatchNode({ match }: { match: TournamentMatch }) {
  const isLive = match.status === 'in_progress';
  const isCompleted = match.status === 'completed' || match.status === 'forfeit';
  const winner1 = match.winner?.id === match.team1?.id;
  const winner2 = match.winner?.id === match.team2?.id;

  const borderColor = isLive
    ? '#EF4444'
    : isCompleted
      ? '#6EE7B7'
      : 'rgba(26,42,74,0.10)';

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor,
        borderRadius: 10,
        minHeight: MATCH_H,
      }}
    >
      {isLive ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 2,
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#EF4444',
              marginRight: 6,
            }}
          />
          <Text
            className="font-heading-black uppercase text-red-500"
            style={{ fontSize: 9 }}
          >
            Live
          </Text>
        </View>
      ) : null}

      <BracketTeamRow
        team={match.team1}
        games={match.score.team1_games}
        winner={winner1}
        rounded="top"
      />
      <View style={{ height: 1, backgroundColor: 'rgba(26,42,74,0.08)', marginHorizontal: 6 }} />
      <BracketTeamRow
        team={match.team2}
        games={match.score.team2_games}
        winner={winner2}
        rounded="bottom"
      />
    </View>
  );
}

function BracketTeamRow({
  team,
  games,
  winner,
  rounded,
}: {
  team: TournamentMatch['team1'] | TournamentMatch['team2'];
  games: number | null;
  winner: boolean;
  rounded: 'top' | 'bottom';
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: winner ? '#ECFDF5' : 'transparent',
        borderTopLeftRadius: rounded === 'top' ? 8 : 0,
        borderTopRightRadius: rounded === 'top' ? 8 : 0,
        borderBottomLeftRadius: rounded === 'bottom' ? 8 : 0,
        borderBottomRightRadius: rounded === 'bottom' ? 8 : 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        {team?.seed ? (
          <Text
            className="font-heading-black text-brand-orange"
            style={{ fontSize: 10 }}
          >
            {team.seed}
          </Text>
        ) : null}
        <Text
          variant="body-medium"
          className="flex-1 text-[11px]"
          numberOfLines={1}
        >
          {team?.team_name ?? 'À déterminer'}
        </Text>
      </View>
      <Text
        className="font-heading-black text-brand-navy"
        style={{ fontSize: 13, marginLeft: 8, fontVariant: ['tabular-nums'] }}
      >
        {games ?? 0}
      </Text>
    </View>
  );
}
