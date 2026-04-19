import { useCallback, useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CandidateCard } from './CandidateCard';
import type { MatchingCandidate } from '@/features/matching/types';

interface Props {
  candidate: MatchingCandidate;
  onSwipeComplete: (action: 'like' | 'pass') => void;
  isPending?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const EXIT_DURATION = 250;

/**
 * Wrapper animé autour de CandidateCard. Les CTAs de la card déclenchent
 * `animateAndComplete(action)` qui joue la translation + rotation + fade
 * puis appelle `onSwipeComplete` pour que le parent passe à la card
 * suivante. Pas de pan gesture en Phase 4.2 — les boutons suffisent à
 * l'UX pour le MVP.
 *
 * Délai 250ms aligné Emergent (setTimeout 250 avant currentIdx++).
 */
export function SwipeableCandidate({ candidate, onSwipeComplete, isPending }: Props) {
  const translateX = useSharedValue(0);
  const completedRef = useRef(false);

  // Reset state on candidate change — évite que l'animation précédente
  // pollue l'affichage de la nouvelle card.
  useEffect(() => {
    translateX.value = 0;
    completedRef.current = false;
  }, [candidate.uuid, translateX]);

  const animateAndComplete = useCallback(
    (action: 'like' | 'pass') => {
      if (completedRef.current || isPending) return;
      completedRef.current = true;

      const target = action === 'like' ? SCREEN_WIDTH * 1.2 : -SCREEN_WIDTH * 1.2;
      translateX.value = withTiming(target, {
        duration: EXIT_DURATION,
        easing: Easing.out(Easing.cubic),
      });

      // Le parent avance d'une carte après l'animation — on laisse un petit
      // jeu (40ms) pour que la translation soit visuellement complète avant
      // que la nouvelle card remplace l'ancienne.
      setTimeout(() => {
        onSwipeComplete(action);
      }, EXIT_DURATION + 40);
    },
    [isPending, onSwipeComplete, translateX],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const rotateDeg = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-15, 0, 15],
      'clamp',
    );
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.6, SCREEN_WIDTH],
      [1, 0.9, 0],
      'clamp',
    );
    return {
      transform: [{ translateX: translateX.value }, { rotate: `${rotateDeg}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <CandidateCard
        candidate={candidate}
        onLike={() => animateAndComplete('like')}
        onPass={() => animateAndComplete('pass')}
        isPending={isPending}
      />
    </Animated.View>
  );
}
