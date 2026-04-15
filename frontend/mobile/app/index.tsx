import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Route racine — redirige vers (tabs)/cockpit si authentifié, (auth)/login sinon.
 * Spinner pendant l'hydratation AuthContext (lecture secure-store + /me).
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

  return <Redirect href={user ? '/(tabs)/cockpit' : '/(auth)/login'} />;
}
