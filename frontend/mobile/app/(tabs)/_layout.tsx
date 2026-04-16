import { Tabs } from 'expo-router';

import { BottomTabBar } from '@/components/BottomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="actualites" options={{ title: 'Actu' }} />
      <Tabs.Screen name="tournois/index" options={{ title: 'Tournois' }} />
      {/* Détail tournoi masqué de la tab bar mais accessible via router.push. */}
      <Tabs.Screen name="tournois/[id]" options={{ href: null }} />
      <Tabs.Screen name="tournois/creer" options={{ href: null }} />
      <Tabs.Screen name="cockpit" options={{ title: 'Cockpit' }} />
      {/* Match (Phase 6.2 G7) — remplace Clubs dans la navbar (Emergent 39b6544). */}
      <Tabs.Screen name="match/index" options={{ title: 'Match' }} />
      <Tabs.Screen name="match/[id]/live" options={{ href: null }} />
      <Tabs.Screen name="partenaires" options={{ title: 'Partenaires' }} />
      {/* Clubs conservée en route mais masquée de la navbar (décision Emergent 39b6544). */}
      <Tabs.Screen name="clubs" options={{ href: null }} />
    </Tabs>
  );
}
