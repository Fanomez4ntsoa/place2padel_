import { Search, UserPlus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Button, Text } from '@/design-system';
import { useUserSearch } from '@/features/friendly-matches/useFriendlyMatches';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (partnerUuid: string | null) => void;
  submitting: boolean;
  /** Label CTA — change selon on_site/online + montant. */
  submitLabel: string;
  /** Bandeau d'information paiement (facultatif). */
  paymentInfo?: {
    method: 'on_site' | 'online';
    priceLabel: string;
  } | null;
  /** UUIDs à exclure des résultats (viewer + déjà inscrits). */
  excludeUuids: string[];
}

/**
 * Port Emergent d5ac086 [TournamentDetailPage.js:414-479] — dialog de choix
 * du partenaire à l'inscription. Recherche /users/search debounce 300ms,
 * liste avatar + nom + points + badge prix si payment_method=online.
 *
 * Ajoute un bouton "S'inscrire seul" (non présent chez Emergent mais utile
 * pour les tournois open où le partenaire est laissé indéterminé — backend
 * accepte partner_uuid nullable depuis Phase 1).
 */
export function RegisterPartnerPicker({
  visible,
  onClose,
  onSubmit,
  submitting,
  submitLabel,
  paymentInfo,
  excludeUuids,
}: Props) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<{ uuid: string; name: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!visible) {
      setQ('');
      setDebounced('');
      setSelected(null);
    }
  }, [visible]);

  const searchQuery = useUserSearch(debounced);
  const results = (searchQuery.data ?? []).filter((u) => !excludeUuids.includes(u.uuid));

  const handlePick = (user: { uuid: string; name: string }) => {
    setSelected(user);
  };

  const handleConfirm = () => {
    onSubmit(selected?.uuid ?? null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable onPress={onClose} className="flex-1 bg-black/40" />
        <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <UserPlus size={18} color="#E8650A" />
              <Text variant="h2" className="text-[18px]">
                Choisis ton partenaire
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color="#1A2A4A" />
            </Pressable>
          </View>

          {/* Bandeau paiement — aligné Emergent bloc CreditCard info */}
          {paymentInfo ? (
            <View
              className={`mb-3 flex-row items-center gap-2 rounded-2xl border px-3 py-2.5 ${
                paymentInfo.method === 'online'
                  ? 'border-brand-orange/20 bg-brand-orange-light'
                  : 'border-brand-navy/10 bg-brand-navy/5'
              }`}
            >
              <Text style={{ fontSize: 16 }}>{paymentInfo.method === 'online' ? '💳' : '📍'}</Text>
              <View className="flex-1">
                <Text
                  className="font-heading-black"
                  style={{
                    fontSize: 12,
                    color: paymentInfo.method === 'online' ? '#E8650A' : '#1A2A4A',
                  }}
                >
                  {paymentInfo.method === 'online'
                    ? `Paiement en ligne — ${paymentInfo.priceLabel} / équipe`
                    : `Paiement sur place — ${paymentInfo.priceLabel} / équipe`}
                </Text>
                <Text
                  variant="caption"
                  className="text-[10px]"
                  style={{ color: '#64748B' }}
                >
                  {paymentInfo.method === 'online'
                    ? 'Paiement sécurisé via Stripe'
                    : 'À régler directement au club le jour J'}
                </Text>
              </View>
            </View>
          ) : null}

          {selected ? (
            <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-200">
                <Text className="font-heading-black text-[14px] text-emerald-800">
                  {selected.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  variant="body-medium"
                  className="text-[13px] text-emerald-900"
                  numberOfLines={1}
                >
                  {selected.name}
                </Text>
                <Text variant="caption" className="text-[11px] text-emerald-700">
                  Partenaire sélectionné
                </Text>
              </View>
              <Pressable onPress={() => setSelected(null)} hitSlop={8}>
                <X size={16} color="#059669" />
              </Pressable>
            </View>
          ) : (
            <View className="mb-2 flex-row items-center gap-2 rounded-2xl border border-brand-border bg-brand-bg px-3">
              <Search size={14} color="#94A3B8" />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Cherche par nom ou prénom…"
                placeholderTextColor="#94A3B8"
                className="h-11 flex-1 font-body text-[14px] text-brand-navy"
                autoCapitalize="none"
              />
            </View>
          )}

          {!selected ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 280 }}
              className="mb-3"
            >
              {debounced.trim().length < 2 ? (
                <Text variant="caption" className="py-4 text-center text-[12px]">
                  Tape au moins 2 caractères pour chercher.
                </Text>
              ) : searchQuery.isLoading ? (
                <ActivityIndicator color="#E8650A" className="my-4" />
              ) : results.length === 0 ? (
                <Text variant="caption" className="py-4 text-center text-[12px]">
                  Aucun joueur trouvé.
                </Text>
              ) : (
                results.map((u) => (
                  <Pressable
                    key={u.uuid}
                    onPress={() => handlePick(u)}
                    className="flex-row items-center gap-3 border-b border-brand-border/40 px-1 py-2.5"
                  >
                    <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-navy">
                      {u.picture_url ? (
                        <Image
                          source={{ uri: u.picture_url }}
                          style={{ width: 40, height: 40 }}
                        />
                      ) : (
                        <Text className="font-heading-black text-[13px] text-white">
                          {u.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
                        {u.name}
                      </Text>
                      {u.clubs && u.clubs.length > 0 ? (
                        <Text variant="caption" className="text-[11px]" numberOfLines={1}>
                          {u.clubs[0].name} · {u.clubs[0].city}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          ) : null}

          <View className="gap-2">
            <Button
              label={submitLabel}
              onPress={handleConfirm}
              loading={submitting}
              disabled={submitting}
              leftIcon={<UserPlus size={18} color="#FFFFFF" />}
            />
            {!selected ? (
              <Text
                variant="caption"
                className="text-center text-[11px]"
              >
                Aucun partenaire ? Tu peux t&apos;inscrire seul — tu pourras l&apos;ajouter plus tard.
              </Text>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
