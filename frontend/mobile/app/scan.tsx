import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera as CameraIcon, ScanLine } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/design-system';

/**
 * Scanner QR tournoi — expo-camera en plein écran. Extrait le UUID du
 * share_link (pattern: {FRONTEND_URL}/tournois/{uuid}) et route vers le détail.
 */
const TOURNAMENT_URL_PATTERN = /\/tournois\/([a-z0-9-]+)(?:[/?#]|$)/i;

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  const scanLock = useRef(false);

  const onScan = ({ data }: { data: string }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setHandled(true);

    const match = data.match(TOURNAMENT_URL_PATTERN);
    if (match?.[1]) {
      router.replace({ pathname: '/(tabs)/tournois/[id]', params: { id: match[1] } });
    } else {
      // Pas un lien tournoi reconnu — relâche le lock après 1.5s pour permettre nouveau scan.
      setTimeout(() => {
        scanLock.current = false;
        setHandled(false);
      }, 1500);
    }
  };

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#1A2A4A" />
          </Pressable>
          <Text variant="h2" className="text-[20px]">
            Scanner un QR
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-brand-orange-light">
            <CameraIcon size={28} color="#E8650A" />
          </View>
          <Text variant="h3" className="text-center text-[16px]">
            Accès caméra requis
          </Text>
          <Text variant="caption" className="mt-2 text-center leading-5">
            Scanne le QR d'un tournoi pour rejoindre directement son détail.
          </Text>
          <Button
            label="Autoriser la caméra"
            onPress={requestPermission}
            className="mt-6 px-6"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handled ? undefined : onScan}
      />

      {/* Overlay */}
      <SafeAreaView
        edges={['top']}
        className="absolute left-0 right-0 top-0 px-4 pt-2"
      >
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-black/60"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
      </SafeAreaView>

      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <View
          className="h-64 w-64 items-center justify-center rounded-3xl border-2 border-white/80"
          style={{ backgroundColor: 'transparent' }}
        >
          <ScanLine size={40} color="#FFFFFF" />
        </View>
        <Text className="mt-6 text-white font-heading-black text-[16px]">
          Pointe la caméra vers le QR
        </Text>
      </View>
    </View>
  );
}
