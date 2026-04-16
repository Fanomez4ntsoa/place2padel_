import { X } from 'lucide-react-native';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '@/design-system';
import { useTournamentQr } from '@/features/tournaments/useTournament';

interface Props {
  tournamentUuid: string;
  visible: boolean;
  onClose: () => void;
}

export function TournamentQrModal({ tournamentUuid, visible, onClose }: Props) {
  const { data, isLoading } = useTournamentQr(tournamentUuid, visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-black/70 px-8">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-[340px] items-center rounded-3xl bg-white p-6"
        >
          <View className="mb-3 w-full flex-row items-center justify-between">
            <Text variant="h2" className="text-[17px]">
              QR Tournoi
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color="#1A2A4A" />
            </Pressable>
          </View>

          {isLoading || !data ? (
            <View className="h-[260px] items-center justify-center">
              <ActivityIndicator color="#E8650A" />
            </View>
          ) : (
            <>
              <View className="items-center rounded-2xl bg-white p-3">
                <QRCode value={data.share_link} size={240} color="#1A2A4A" backgroundColor="#FFFFFF" />
              </View>
              <Text variant="body-medium" className="mt-4 text-center text-[14px]" numberOfLines={2}>
                {data.tournament.name}
              </Text>
              <Text variant="caption" className="mt-1 text-center text-[12px]">
                {data.club.name} — {data.club.city}
              </Text>
              <Text variant="caption" className="mt-3 text-center text-[11px]">
                Partage ce code avec les joueurs pour qu'ils accèdent au tournoi en un scan.
              </Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
