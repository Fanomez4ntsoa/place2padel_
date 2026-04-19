import { Slot } from 'expo-router';
import { View } from 'react-native';

import { AppHeader } from './AppHeader';

/**
 * Shell global — monte l'AppHeader au-dessus de toutes les routes, y compris
 * (auth) (pattern web Emergent d5ac086 : hamburger + logo + CTA Inscription
 * + search visibles sur login/register). L'AppHeader détecte lui-même la
 * route active pour adapter ses CTAs.
 */
export function RootShell() {
  return (
    <View className="flex-1 bg-brand-bg">
      <AppHeader />
      <Slot />
    </View>
  );
}
