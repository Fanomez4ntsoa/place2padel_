import { X } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/design-system';

interface Props {
  visible: boolean;
  onClose: () => void;
  mode: 'amical' | 'rencontre';
}

/**
 * Bottom-sheet "bientôt disponible" pour les modes amical (swipe global
 * Phase 4.2 backend) et rencontre (premium non prioritaire). Port du popup
 * premium Emergent d541157 réutilisé pour les deux cas.
 */
export function ComingSoonSheet({ visible, onClose, mode }: Props) {
  const isRencontre = mode === 'rencontre';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/55" />
      <View className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-6 pb-10 pt-5">
        <View className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
        <Pressable onPress={onClose} hitSlop={8} className="absolute right-4 top-4">
          <X size={22} color="#1A2A4A" />
        </Pressable>

        <View className="items-center pb-4">
          <Text className="text-[48px]">{isRencontre ? '❤️' : '🎾'}</Text>
          <Text variant="h2" className="mt-2 text-[20px]">
            {isRencontre ? 'Mode Rencontre' : 'Matching global amical'}
          </Text>
          <Text variant="caption" className="mt-2 text-center leading-5">
            {isRencontre
              ? 'Découvre les joueurs célibataires près de toi.\nRéservé au plan Premium.'
              : 'Swipe global sur tous les joueurs compatibles\nde ta zone — arrive avec la Phase 4.2.'}
          </Text>
        </View>

        <View className="mt-2 rounded-2xl bg-emerald-50 p-4">
          <Text variant="body-medium" className="text-[13px] text-emerald-700">
            ✅ Toujours gratuit
          </Text>
          {['Tournois', 'Matchs amicaux', 'Matching partenaire tournoi'].map((f) => (
            <Text key={f} variant="caption" className="mt-1 text-[12px]">
              ✓ {f}
            </Text>
          ))}
        </View>

        {isRencontre ? (
          <View className="mt-3 rounded-2xl bg-rose-50 p-4">
            <Text variant="body-medium" className="text-[13px] text-rose-700">
              ❤️ Premium uniquement
            </Text>
            {[
              'Voir qui est célibataire près de toi',
              'Matcher en mode rencontre',
              'Activer ton badge ❤️ sur ton profil',
            ].map((f) => (
              <Text key={f} variant="caption" className="mt-1 text-[12px]">
                ✓ {f}
              </Text>
            ))}
          </View>
        ) : null}

        <View className="mt-5 items-center rounded-2xl bg-brand-navy px-5 py-4">
          <Text className="text-[20px]">🚀</Text>
          <Text className="mt-1 font-heading-black text-[15px] text-white">
            Bientôt disponible
          </Text>
          <Text variant="caption" className="mt-1 text-[12px] text-white/70">
            Module en cours de développement
          </Text>
        </View>

        <Pressable onPress={onClose} className="mt-3 items-center py-2">
          <Text variant="caption" className="text-[13px]">
            Plus tard
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
