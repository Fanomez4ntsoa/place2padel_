import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera as CameraIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/design-system';

/**
 * Scanner QR tournoi plein écran.
 * Le payload QR = share_link Laravel (ex: https://app.placetopadel.com/tournois/{uuid})
 * → on extrait l'uuid et on push vers /(tabs)/tournois/{uuid}.
 */
export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const lastScan = useRef<number>(0);

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-brand-bg px-8">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange-light">
          <CameraIcon size={28} color="#E8650A" />
        </View>
        <Text variant="h2" className="text-center text-[18px]">
          Autoriser la caméra
        </Text>
        <Text variant="caption" className="mt-2 text-center">
          On utilise la caméra uniquement pour scanner les QR codes de tournoi.
        </Text>
        <Button
          label="Autoriser"
          onPress={() =>
            requestPermission().then((res) => {
              if (!res.granted && !res.canAskAgain) {
                Alert.alert(
                  'Permission refusée',
                  'Ouvre les réglages système pour réactiver la caméra.',
                );
              }
            })
          }
          className="mt-6"
        />
        <Button
          label="Retour"
          variant="ghost"
          onPress={() => router.back()}
          className="mt-2"
        />
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    // Debounce 1s : la caméra émet le même payload 30x/s tant que le QR est visible.
    const now = Date.now();
    if (now - lastScan.current < 1000 || scanned) return;
    lastScan.current = now;

    const uuid = extractTournamentUuid(data);
    if (!uuid) {
      Alert.alert('QR invalide', 'Ce code ne correspond pas à un tournoi PlaceToPadel.', [
        { text: 'OK', onPress: () => (lastScan.current = 0) },
      ]);
      return;
    }
    setScanned(true);
    router.replace(`/(tabs)/tournois/${uuid}`);
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0">
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/50"
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text variant="body-medium" className="ml-3 text-[14px] text-white">
            Scanner un QR tournoi
          </Text>
        </View>
      </SafeAreaView>

      {/* Cadre de visée */}
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View
          className="rounded-3xl border-2 border-white/80"
          style={{ width: 240, height: 240 }}
        />
        <Text variant="caption" className="mt-4 text-center text-[12px] text-white/80">
          Place le QR dans le cadre
        </Text>
      </View>
    </View>
  );
}

/**
 * Extrait l'UUID v7 d'un share_link tournoi. Accepte :
 *   - URL complète : https://host/tournois/{uuid} ou /tournaments/{uuid}
 *   - UUID nu (au cas où le backend évolue)
 */
function extractTournamentUuid(payload: string): string | null {
  const UUID7_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = payload.match(UUID7_REGEX);
  return match ? match[0] : null;
}
