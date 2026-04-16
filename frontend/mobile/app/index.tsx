import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Route racine — redirige vers (tabs)/cockpit si authentifié, (tabs)/home sinon.
 * La HomePage marketing (hero + grille 9 features + bannière organisateur) est
 * la landing non-auth. AppHeader y expose aussi le CTA "Inscription gratuite"
 * pour convertir. Spinner pendant hydratation AuthContext (secure-store + /me).
 */
export default function IndexRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator color="#E8650A" />
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)/cockpit' : '/(tabs)/home'} />;
}
