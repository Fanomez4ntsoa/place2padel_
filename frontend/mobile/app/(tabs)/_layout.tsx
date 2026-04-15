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
      <Tabs.Screen name="partenaires" options={{ title: 'Partenaires' }} />
      <Tabs.Screen name="clubs" options={{ title: 'Clubs' }} />
    </Tabs>
  );
}
