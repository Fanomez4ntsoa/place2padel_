import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Pencil, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EloCard } from '@/components/friendly-matches/EloCard';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button, Card, Input, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import { useClubsQuickSearch } from '@/features/clubs/useClubs';
import type { Club } from '@/features/clubs/types';
import type { MatchHistoryEntry } from '@/features/friendly-matches/types';
import { useMatchHistory, useUserElo } from '@/features/friendly-matches/useFriendlyMatches';
import type { AvailabilitySlot, ProfileClub } from '@/features/profile/useProfile';
import { primaryClub, useProfile, useUpdateProfile } from '@/features/profile/useProfile';

type Position = 'left' | 'right' | 'both';

const POSITION_LABELS: Record<Position, string> = {
  left: 'Gauche',
  right: 'Droite',
  both: 'Les deux',
};

/**
 * 10 slots Emergent 39b6544 mappés vers tuples backend {day_of_week, period}.
 * Dernière entrée = Flexible = day null + period 'all'.
 */
interface SlotPreset {
  key: string;
  label: string;
  day_of_week: number | null;
  period: AvailabilitySlot['period'];
}

const SLOT_PRESETS: SlotPreset[] = [
  { key: 'lun-soir', label: 'Lundi soir', day_of_week: 1, period: 'evening' },
  { key: 'mar-soir', label: 'Mardi soir', day_of_week: 2, period: 'evening' },
  { key: 'mer-soir', label: 'Mercredi soir', day_of_week: 3, period: 'evening' },
  { key: 'jeu-soir', label: 'Jeudi soir', day_of_week: 4, period: 'evening' },
  { key: 'ven-soir', label: 'Vendredi soir', day_of_week: 5, period: 'evening' },
  { key: 'sam-matin', label: 'Samedi matin', day_of_week: 6, period: 'morning' },
  { key: 'sam-aprem', label: 'Samedi après-midi', day_of_week: 6, period: 'afternoon' },
  { key: 'dim-matin', label: 'Dimanche matin', day_of_week: 7, period: 'morning' },
  { key: 'dim-aprem', label: 'Dimanche après-midi', day_of_week: 7, period: 'afternoon' },
  { key: 'flexible', label: 'Flexible', day_of_week: null, period: 'all' },
];

const DAY_SHORT: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' };
const PERIOD_SHORT: Record<AvailabilitySlot['period'], string> = {
  morning: 'matin',
  afternoon: 'après-midi',
  evening: 'soir',
  all: 'flexible',
};

function slotKey(slot: AvailabilitySlot): string {
  return `${slot.day_of_week ?? 'null'}:${slot.period}`;
}

function readableSlot(slot: AvailabilitySlot): string {
  if (slot.day_of_week === null) return 'Flexible';
  return `${DAY_SHORT[slot.day_of_week] ?? slot.day_of_week} ${PERIOD_SHORT[slot.period]}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const { data: profile, isLoading } = useProfile(id);
  const updateMut = useUpdateProfile(id);

  const isSelf = !!user && user.uuid === id;
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'infos' | 'matchs'>('infos');
  const eloQuery = useUserElo(id);
  const historyQuery = useMatchHistory(id);

  if (isLoading || !profile) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator color="#E8650A" />
      </SafeAreaView>
    );
  }

  const initials = (profile.name || '?').trim().charAt(0).toUpperCase();
  const primary = primaryClub(profile);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full"
            hitSlop={8}
          >
            <ArrowLeft size={20} color="#1A2A4A" />
          </Pressable>
          {isSelf ? (
            <Pressable
              onPress={() => setEditing(true)}
              className="h-9 w-9 items-center justify-center rounded-full"
              hitSlop={8}
            >
              <Pencil size={18} color="#1A2A4A" />
            </Pressable>
          ) : (
            <View className="h-9 w-9" />
          )}
        </View>

        {/* Identité compacte */}
        <View className="px-6 pt-2">
          <View className="flex-row items-start gap-4">
            <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-brand-border bg-white">
              <Text variant="h1" className="text-brand-orange">{initials}</Text>
            </View>
            <View className="flex-1 pt-1">
              <Text variant="h2" className="text-[18px]" numberOfLines={1}>
                {profile.name}
              </Text>
              <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
                <Badge
                  label={profile.role === 'referee' ? 'Juge arbitre' : profile.role === 'admin' ? 'Admin' : 'Joueur'}
                  tone="neutral"
                />
                {profile.profile?.position ? (
                  <Badge label={POSITION_LABELS[profile.profile.position as Position] ?? profile.profile.position} tone="info" />
                ) : null}
              </View>
              {primary ? (
                <Text variant="caption" className="mt-1 font-heading text-brand-orange text-[11px]" numberOfLines={1}>
                  {primary.name}
                </Text>
              ) : null}
              {profile.city ? (
                <View className="mt-0.5 flex-row items-center gap-1">
                  <MapPin size={10} color="#94A3B8" />
                  <Text variant="caption" className="text-[10px]">{profile.city}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {profile.profile?.bio ? (
            <Text variant="caption" className="mt-3 leading-5">
              {profile.profile.bio}
            </Text>
          ) : null}
        </View>

        {/* Switch Infos / Matchs */}
        <View className="mx-5 mt-4 flex-row rounded-2xl border border-brand-border bg-white p-1">
          {(['infos', 'matchs'] as const).map((k) => {
            const active = tab === k;
            return (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                className={`flex-1 items-center rounded-xl py-2 ${active ? 'bg-brand-navy' : ''}`}
              >
                <Text
                  variant="caption"
                  className={`text-[12px] font-heading ${active ? 'text-white' : 'text-brand-muted'}`}
                >
                  {k === 'infos' ? 'Infos' : 'Matchs'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'infos' ? (
          <>
            <View className="mx-5 mt-4 flex-row gap-2">
              <StatCell value={profile.padel_points ?? 0} label="Points" sub="FFT" />
              <StatCell value={profile.ranking ?? '—'} label="Rang" />
              <StatCell value={profile.padel_level ?? '—'} label="Niveau" />
              <StatCell
                value={POSITION_LABELS[profile.profile?.position as Position] ?? '—'}
                label="Position"
              />
            </View>

            {profile.profile?.bio ? (
              <View className="mx-5 mt-4">
                <Card>
                  <Text variant="h3" className="text-[15px]">À propos</Text>
                  <Text variant="body" className="mt-2">
                    {profile.profile.bio}
                  </Text>
                </Card>
              </View>
            ) : null}

            {/* Clubs multiples */}
            {profile.clubs && profile.clubs.length > 0 ? (
              <View className="mx-5 mt-4">
                <Card>
                  <Text variant="h3" className="text-[15px]">
                    {profile.clubs.length > 1 ? 'Mes clubs' : 'Mon club'}
                  </Text>
                  <View className="mt-2 gap-1.5">
                    {profile.clubs.map((c) => (
                      <View key={c.uuid} className="flex-row items-center gap-2">
                        {c.priority === 1 ? (
                          <Badge label="Principal" tone="info" />
                        ) : (
                          <Badge label={`#${c.priority ?? '?'}`} tone="neutral" />
                        )}
                        <Text variant="body" className="flex-1 text-[13px]">
                          {c.name} <Text variant="caption" className="text-[11px]">· {c.city}</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </View>
            ) : null}

            {profile.preferred_levels && profile.preferred_levels.length > 0 ? (
              <View className="mx-5 mt-4">
                <Card>
                  <Text variant="h3" className="text-[15px]">Niveaux préférés</Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {profile.preferred_levels.map((lvl) => (
                      <Badge key={lvl} label={lvl} tone="info" />
                    ))}
                  </View>
                </Card>
              </View>
            ) : null}

            {profile.availabilities && profile.availabilities.length > 0 ? (
              <View className="mx-5 mt-4">
                <Card>
                  <Text variant="h3" className="text-[15px]">Disponibilités</Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {profile.availabilities.map((slot) => (
                      <Badge
                        key={slotKey(slot)}
                        label={readableSlot(slot)}
                        tone={slot.day_of_week === null ? 'info' : 'neutral'}
                      />
                    ))}
                  </View>
                </Card>
              </View>
            ) : null}
          </>
        ) : (
          <View className="mx-5 mt-4 gap-4">
            {eloQuery.data ? <EloCard elo={eloQuery.data} /> : (
              <Card><ActivityIndicator color="#E8650A" /></Card>
            )}

            <View>
              <Text variant="h3" className="mb-2 text-[15px]">Historique</Text>
              {historyQuery.isLoading ? (
                <ActivityIndicator color="#E8650A" />
              ) : !historyQuery.data || historyQuery.data.length === 0 ? (
                <Card>
                  <Text variant="caption" className="text-center">
                    Aucun match joué pour l'instant.
                  </Text>
                </Card>
              ) : (
                <View className="gap-2">
                  {historyQuery.data.map((entry) => (
                    <HistoryRow key={entry.match_uuid} entry={entry} />
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {editing ? (
        <EditProfileSheet
          profile={profile}
          onClose={() => setEditing(false)}
          onSave={async (body) => {
            try {
              await updateMut.mutateAsync(body);
              setEditing(false);
            } catch (err) {
              Alert.alert('Erreur', formatApiError(err));
            }
          }}
          saving={updateMut.isPending}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────────────
// EditProfileSheet — modal multi-step unifié
// ───────────────────────────────────────────────────────────────

function EditProfileSheet({
  profile,
  onClose,
  onSave,
  saving,
}: {
  profile: NonNullable<ReturnType<typeof useProfile>['data']>;
  onClose: () => void;
  onSave: (body: {
    first_name?: string;
    last_name?: string;
    bio?: string;
    city?: string;
    position?: Position;
    padel_level?: number;
    clubs?: string[];
    availabilities?: AvailabilitySlot[];
  }) => Promise<void>;
  saving: boolean;
}) {
  const [firstName, setFirstName] = useState(profile.first_name ?? '');
  const [lastName, setLastName] = useState(profile.last_name ?? '');
  const [bio, setBio] = useState(profile.profile?.bio ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [position, setPosition] = useState<Position | null>(
    (profile.profile?.position as Position | null | undefined) ?? null,
  );
  const [padelLevel, setPadelLevel] = useState<number | null>(profile.padel_level ?? null);
  const [clubs, setClubs] = useState<ProfileClub[]>(() =>
    [...(profile.clubs ?? [])].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)),
  );
  const [slots, setSlots] = useState<AvailabilitySlot[]>(profile.availabilities ?? []);

  const slotSet = useMemo(() => new Set(slots.map(slotKey)), [slots]);

  const togglePreset = (preset: SlotPreset) => {
    const key = `${preset.day_of_week ?? 'null'}:${preset.period}`;
    setSlots((prev) => {
      const exists = prev.some((s) => slotKey(s) === key);
      if (exists) return prev.filter((s) => slotKey(s) !== key);
      // Flexible est exclusif : activer Flexible purge les autres ; activer un autre purge Flexible.
      if (preset.day_of_week === null) {
        return [{ day_of_week: null, period: 'all' }];
      }
      const withoutFlex = prev.filter((s) => s.day_of_week !== null);
      return [...withoutFlex, { day_of_week: preset.day_of_week, period: preset.period }];
    });
  };

  const handleClubPick = (slot: 1 | 2 | 3, club: Club) => {
    setClubs((prev) => {
      const withoutDup = prev.filter((c) => c.uuid !== club.uuid);
      const next = [...withoutDup];
      while (next.length < slot) {
        next.push({ uuid: '__placeholder__', name: '', city: '', priority: next.length + 1 });
      }
      next[slot - 1] = { uuid: club.uuid, name: club.name, city: club.city, priority: slot };
      return next.filter((c) => c.uuid !== '__placeholder__').map((c, i) => ({ ...c, priority: i + 1 }));
    });
  };

  const removeClub = (uuid: string) => {
    setClubs((prev) => prev.filter((c) => c.uuid !== uuid).map((c, i) => ({ ...c, priority: i + 1 })));
  };

  const handleSave = () => {
    void onSave({
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      bio: bio.trim(),
      city: city.trim(),
      position: position ?? undefined,
      padel_level: padelLevel ?? undefined,
      clubs: clubs.map((c) => c.uuid),
      availabilities: slots,
    });
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable onPress={onClose} className="flex-1 bg-black/40" />
        <View className="max-h-[90%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between px-6 pb-2 pt-5">
            <Text variant="h2" className="text-[20px]">Modifier mon profil</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color="#1A2A4A" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <Input label="PRÉNOM" value={firstName} onChangeText={setFirstName} fieldBg="brand" />
              </View>
              <View className="flex-1">
                <Input label="NOM" value={lastName} onChangeText={setLastName} fieldBg="brand" />
              </View>
            </View>

            <View className="mt-3">
              <Input label="VILLE" placeholder="Ex : Agde" value={city} onChangeText={setCity} fieldBg="brand" />
            </View>

            <Text variant="caption" className="mb-1.5 mt-4 font-body-medium text-brand-navy">
              À PROPOS
            </Text>
            <TextInput
              multiline
              value={bio}
              onChangeText={setBio}
              placeholder="Quelques mots sur toi..."
              placeholderTextColor="#94A3B8"
              className="min-h-[80px] rounded-2xl border border-brand-border bg-brand-bg p-4 font-body text-[15px] text-brand-navy"
              style={{ textAlignVertical: 'top' }}
            />

            <Text variant="caption" className="mb-2 mt-4 font-body-medium text-brand-navy">
              POSITION PRÉFÉRÉE
            </Text>
            <View className="flex-row gap-2">
              {(['left', 'right', 'both'] as const).map((pos) => {
                const active = position === pos;
                return (
                  <Pressable
                    key={pos}
                    onPress={() => setPosition(pos)}
                    className={`flex-1 items-center rounded-2xl border py-2.5 ${
                      active ? 'border-brand-orange bg-brand-orange-light' : 'border-brand-border bg-brand-bg'
                    }`}
                  >
                    <Text
                      variant="caption"
                      className={`text-[12px] font-heading ${active ? 'text-brand-orange' : 'text-brand-navy'}`}
                    >
                      {POSITION_LABELS[pos]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="caption" className="mb-2 mt-4 font-body-medium text-brand-navy">
              NIVEAU (1-5)
            </Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const active = padelLevel === lvl;
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => setPadelLevel(active ? null : lvl)}
                    className={`flex-1 items-center rounded-2xl border py-2.5 ${
                      active ? 'border-brand-orange bg-brand-orange-light' : 'border-brand-border bg-brand-bg'
                    }`}
                  >
                    <Text
                      className={`text-[16px] font-heading-black ${active ? 'text-brand-orange' : 'text-brand-navy'}`}
                    >
                      {lvl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Clubs — 3 slots autocomplete */}
            <Text variant="caption" className="mb-2 mt-4 font-body-medium text-brand-navy">
              MES CLUBS (jusqu'à 3)
            </Text>
            {[1, 2, 3].map((slot) => {
              const current = clubs[slot - 1];
              const isPrincipal = slot === 1;
              return (
                <View key={slot} className="mb-2.5">
                  <Text variant="caption" className="mb-1 text-[10px] text-brand-muted">
                    {isPrincipal ? 'Club principal' : slot === 2 ? 'Club secondaire' : 'Club tertiaire'}
                  </Text>
                  <ClubAutocompleteRow
                    current={current}
                    onPick={(club) => handleClubPick(slot as 1 | 2 | 3, club)}
                    onRemove={() => current && removeClub(current.uuid)}
                  />
                </View>
              );
            })}

            {/* Disponibilités — 10 slots toggle */}
            <Text variant="caption" className="mb-2 mt-4 font-body-medium text-brand-navy">
              DISPONIBILITÉS
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SLOT_PRESETS.map((preset) => {
                const key = `${preset.day_of_week ?? 'null'}:${preset.period}`;
                const active = slotSet.has(key);
                const isFlex = preset.day_of_week === null;
                return (
                  <Pressable
                    key={preset.key}
                    onPress={() => togglePreset(preset)}
                    className={`rounded-full border px-3 py-1.5 ${
                      active
                        ? isFlex
                          ? 'border-brand-navy bg-brand-navy'
                          : 'border-brand-orange bg-brand-orange'
                        : 'border-brand-border bg-white'
                    }`}
                  >
                    <Text
                      variant="caption"
                      className={`text-[11px] font-heading ${
                        active ? 'text-white' : 'text-brand-navy'
                      }`}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              label={saving ? 'Enregistrement…' : 'Enregistrer'}
              loading={saving}
              onPress={handleSave}
              className="mt-5"
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────────────────────────────────────────────────────────
// ClubAutocompleteRow — recherche debounce 300ms sur /clubs/search
// ───────────────────────────────────────────────────────────────

function ClubAutocompleteRow({
  current,
  onPick,
  onRemove,
}: {
  current: ProfileClub | undefined;
  onPick: (club: Club) => void;
  onRemove: () => void;
}) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useClubsQuickSearch(debounced);

  if (current) {
    return (
      <View className="flex-row items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <Text variant="body-medium" className="flex-1 text-[13px] text-emerald-900" numberOfLines={1}>
          {current.name}
        </Text>
        <Text variant="caption" className="text-[11px] text-emerald-700">
          {current.city}
        </Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <X size={16} color="#047857" />
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row items-center gap-2 rounded-2xl border border-brand-border bg-brand-bg px-3">
        <Search size={14} color="#94A3B8" />
        <TextInput
          value={q}
          onChangeText={(v) => {
            setQ(v);
            setOpen(true);
          }}
          placeholder="Cherche ton club…"
          placeholderTextColor="#94A3B8"
          className="flex-1 py-2.5 font-body text-[14px] text-brand-navy"
        />
      </View>
      {open && debounced.trim().length >= 2 ? (
        <View className="mt-1 overflow-hidden rounded-2xl border border-brand-border bg-white">
          {query.isLoading ? (
            <View className="items-center py-3">
              <ActivityIndicator color="#E8650A" />
            </View>
          ) : !query.data || query.data.length === 0 ? (
            <View className="px-4 py-3">
              <Text variant="caption" className="text-[12px]">
                Aucun club trouvé pour « {debounced} ».
              </Text>
            </View>
          ) : (
            query.data.map((c) => (
              <Pressable
                key={c.uuid}
                onPress={() => {
                  onPick(c);
                  setQ('');
                  setOpen(false);
                }}
                className="border-b border-brand-border/40 px-4 py-2.5"
              >
                <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
                  {c.name}
                </Text>
                <Text variant="caption" className="text-[11px]" numberOfLines={1}>
                  {c.city}
                  {c.postal_code ? ` (${c.postal_code})` : ''}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function StatCell({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-brand-border bg-white p-2.5">
      <Text variant="h3" className="text-[18px] text-brand-navy">{value}</Text>
      <Text variant="caption" className="text-[9px]">{label}</Text>
      {sub ? <Text variant="caption" className="text-[9px] text-brand-muted">{sub}</Text> : null}
    </View>
  );
}

function HistoryRow({ entry }: { entry: MatchHistoryEntry }) {
  const won = entry.result === 'win';
  const date = new Date(entry.date);
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-brand-border bg-white px-4 py-3">
      <View
        className={`h-10 w-10 items-center justify-center rounded-2xl ${won ? 'bg-emerald-50' : 'bg-red-50'}`}
      >
        <Text className={`font-heading-black text-[15px] ${won ? 'text-emerald-700' : 'text-red-500'}`}>
          {won ? 'V' : 'D'}
        </Text>
      </View>
      <View className="flex-1">
        <Text variant="body-medium" className="text-[13px]">
          {entry.type === 'friendly' ? 'Match amical' : 'Tournoi'}
        </Text>
        <Text variant="caption" className="mt-0.5 text-[11px]">
          {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text variant="body-medium" className="text-[13px]" style={{ fontVariant: ['tabular-nums'] }}>
        {entry.score.team1_games}–{entry.score.team2_games}
      </Text>
    </View>
  );
}
