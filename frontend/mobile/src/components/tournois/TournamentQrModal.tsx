import { Share2, X } from 'lucide-react-native';
import { Modal, Pressable, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '@/design-system';

interface Props {
  visible: boolean;
  onClose: () => void;
  tournamentName: string;
  shareLink: string | null;
}

/**
 * Modal affichage QR tournoi — port d541157. Génère le QR depuis share_link
 * via react-native-qrcode-svg (SVG, pas de permission caméra requise).
 */
export function TournamentQrModal({ visible, onClose, tournamentName, shareLink }: Props) {
  const shareApp = async () => {
    if (!shareLink) return;
    try {
      await Share.share({ message: `${tournamentName} — ${shareLink}` });
    } catch {
      /* user cancel */
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/55" />
      <View className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-6 pb-10 pt-5">
        <View className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
        <Pressable onPress={onClose} hitSlop={8} className="absolute right-4 top-4">
          <X size={22} color="#1A2A4A" />
        </Pressable>

        <View className="items-center">
          <Text variant="h2" className="text-[18px]">
            Partage le tournoi
          </Text>
          <Text variant="caption" className="mt-1 text-center text-[12px]">
            Les joueurs scannent ce code pour s'inscrire.
          </Text>

          {shareLink ? (
            <View className="mt-5 items-center rounded-3xl bg-white p-4" style={{ elevation: 3 }}>
              <QRCode value={shareLink} size={220} color="#1A2A4A" backgroundColor="#FFFFFF" />
            </View>
          ) : (
            <Text variant="caption" className="mt-5 text-center">
              Lien de partage indisponible.
            </Text>
          )}

          {shareLink ? (
            <Text
              variant="caption"
              className="mt-3 text-center text-[11px]"
              numberOfLines={1}
              selectable
            >
              {shareLink}
            </Text>
          ) : null}

          <Pressable
            onPress={shareApp}
            className="mt-5 flex-row items-center gap-2 rounded-full bg-brand-navy px-5 py-2.5"
          >
            <Share2 size={16} color="#FFFFFF" />
            <Text className="font-heading-black text-[13px] text-white">
              Partager le lien
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
