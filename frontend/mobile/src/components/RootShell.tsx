import { Slot, usePathname } from 'expo-router';
import { View } from 'react-native';

import { AppHeader } from './AppHeader';

/**
 * Shell global — monte l'AppHeader au-dessus de toutes les routes sauf les écrans
 * d'auth (hero navy full-bleed). Utilise <Slot> pour déléguer la navigation aux
 * layouts des groupes (auth)/(tabs) qui possèdent chacun leur propre navigateur.
 */
const HIDE_HEADER_PREFIXES = ['/login', '/register'];

export function RootShell() {
  const pathname = usePathname();
  const hideHeader = HIDE_HEADER_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  return (
    <View className="flex-1 bg-brand-bg">
      {hideHeader ? null : <AppHeader />}
      <Slot />
    </View>
  );
}
