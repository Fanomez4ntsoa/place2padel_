import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Layers,
  MapPin as MapPinIcon,
  Search,
  Trophy,
  Users,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text } from '@/design-system';
import { formatApiError } from '@/lib/api';
import type { Club } from '@/features/clubs/types';
import { useClubsQuickSearch } from '@/features/clubs/useClubs';
import type {
  CreateTournamentBody,
} from '@/features/tournaments/useTournament';
import { useCreateTournament } from '@/features/tournaments/useTournament';

/**
 * Wizard création tournoi — port CreateTournamentPage.js Emergent 39b6544.
 *
 * 3 étapes avec barre de progression :
 *   0. Infos : nom, club (autocomplete /clubs/search), type, niveau
 *   1. Dates : date, heure (default 09:00), deadline inscription (optionnel)
 *   2. Paramètres + récap : max_teams, courts_available, prix, payment_method
 *      (affiché uniquement si prix renseigné) + récap key/value
 *
 * POST /tournaments en étape 2 → redirect /(tabs)/tournois/{uuid}.
 */

type TournamentType = 'masculin' | 'feminin' | 'mixte' | 'open';
type TournamentLevel = 'P25' | 'P50' | 'P100' | 'P250' | 'P500' | 'P1000' | 'P2000';
type PaymentMethod = 'on_site' | 'online';

const STEPS = ['Infos tournoi', 'Dates', 'Paramètres'] as const;
const LEVELS: TournamentLevel[] = ['P25', 'P50', 'P100', 'P250', 'P500', 'P1000', 'P2000'];

interface FormState {
  name: string;
  club: Club | null;
  type: TournamentType;
  level: TournamentLevel;
  date: Date | null;
  start_time: string; // HH:MM
  inscription_deadline: Date | null;
  max_teams: number;
  courts_available: number;
  price: string;
  payment_method: PaymentMethod;
}

const INITIAL: FormState = {
  name: '',
  club: null,
  type: 'mixte',
  level: 'P500',
  date: null,
  start_time: '09:00',
  inscription_deadline: null,
  max_teams: 16,
  courts_available: 4,
  price: '',
  payment_method: 'on_site',
};

function formatDateISO(d: Date): string {
  // Format YYYY-MM-DD local (éviter toISOString qui renvoie UTC et décale le jour).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateFR(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function CreateTournamentScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const createMut = useCreateTournament();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const nextStep = () => {
    if (step === 0) {
      if (!form.name.trim()) return Alert.alert('Validation', 'Le nom du tournoi est obligatoire.');
      if (!form.club) return Alert.alert('Validation', 'Le club organisateur est obligatoire.');
    }
    if (step === 1) {
      if (!form.date) return Alert.alert('Validation', 'La date du tournoi est obligatoire.');
    }
    setStep((s) => Math.min(2, s + 1));
  };

  const prevStep = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!form.club || !form.date) return;

    const body: CreateTournamentBody = {
      club_uuid: form.club.uuid,
      name: form.name.trim(),
      type: form.type,
      level: form.level,
      date: formatDateISO(form.date),
      start_time: form.start_time,
      inscription_deadline: form.inscription_deadline ? formatDateISO(form.inscription_deadline) : null,
      max_teams: form.max_teams,
      courts_available: form.courts_available,
      price: form.price.trim() || null,
      payment_method: form.price.trim() ? form.payment_method : null,
    };

    try {
      const tournament = await createMut.mutateAsync(body);
      router.replace(`/(tabs)/tournois/${tournament.uuid}`);
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      {/* Hero navy + barre de progression */}
      <LinearGradient
        colors={['#1A2A4A', '#2A4A6A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={prevStep}
            className="h-9 w-9 items-center justify-center rounded-xl bg-white/10"
            hitSlop={8}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </Pressable>
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-orange">
            <Trophy size={18} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="font-heading-black text-[15px] text-white">Créer un tournoi</Text>
            <Text variant="caption" className="text-[10px] text-white/50">
              5 minutes · Gratuit · Automatique
            </Text>
          </View>
        </View>

        {/* Progress bar 3 segments */}
        <View className="mt-4 flex-row gap-1">
          {STEPS.map((_, i) => (
            <View
              key={i}
              className={`h-[3px] flex-1 rounded-full ${i <= step ? 'bg-brand-orange' : 'bg-white/20'}`}
            />
          ))}
        </View>
        <View className="mt-1.5 flex-row justify-between">
          {STEPS.map((label, i) => (
            <Text
              key={label}
              variant="caption"
              className={`text-[9px] font-heading-black uppercase ${
                i <= step ? 'text-brand-orange' : 'text-white/30'
              }`}
              style={{ letterSpacing: 0.5 }}
            >
              {label}
            </Text>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {step === 0 ? <Step1Infos form={form} update={update} /> : null}
        {step === 1 ? <Step2Dates form={form} update={update} /> : null}
        {step === 2 ? <Step3Params form={form} update={update} /> : null}
      </ScrollView>

      {/* CTA sticky bottom */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-brand-border bg-white px-4 pb-6 pt-3">
        {step < 2 ? (
          <Button label="Suivant →" onPress={nextStep} />
        ) : (
          <Button
            label="Créer mon tournoi"
            leftIcon={<Check size={18} color="#FFFFFF" />}
            loading={createMut.isPending}
            onPress={handleSubmit}
          />
        )}
        <View className="mt-2 items-center rounded-xl bg-emerald-50 px-3 py-2">
          <Text variant="caption" className="text-[11px] text-emerald-800">
            ⚡ Ton tournoi sera en ligne en moins de 5 minutes
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────────────
// Étape 1 — Infos tournoi
// ───────────────────────────────────────────────────────────────
function Step1Infos({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <Card>
      <View className="gap-4">
        <Field label="Nom du tournoi *">
          <TextInput
            value={form.name}
            onChangeText={(v) => update('name', v)}
            placeholder="Ex : Open Printemps 2026 — Agde"
            placeholderTextColor="#94A3B8"
            className="h-11 rounded-2xl border border-brand-border bg-brand-bg px-3 font-body text-[14px] text-brand-navy"
          />
        </Field>

        <ClubAutocomplete
          current={form.club}
          onPick={(c) => update('club', c)}
          onClear={() => update('club', null)}
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Type">
              <Segmented
                options={[
                  { value: 'masculin', label: 'M' },
                  { value: 'feminin', label: 'F' },
                  { value: 'mixte', label: 'Mixte' },
                ]}
                value={form.type}
                onChange={(v) => update('type', v as TournamentType)}
              />
            </Field>
          </View>
          <View className="flex-1">
            <Field label="Niveau" accent>
              <Pill
                options={LEVELS.map((l) => ({ value: l, label: l }))}
                value={form.level}
                onChange={(v) => update('level', v as TournamentLevel)}
              />
            </Field>
          </View>
        </View>
      </View>
    </Card>
  );
}

function ClubAutocomplete({
  current,
  onPick,
  onClear,
}: {
  current: Club | null;
  onPick: (c: Club) => void;
  onClear: () => void;
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
      <Field label="Club organisateur *">
        <View className="flex-row items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
          <MapPinIcon size={14} color="#059669" />
          <View className="flex-1">
            <Text variant="body-medium" className="text-[13px] text-emerald-900" numberOfLines={1}>
              {current.name}
            </Text>
            <Text variant="caption" className="text-[11px] text-emerald-700">
              {current.city}
              {current.postal_code ? ` (${current.postal_code})` : ''}
            </Text>
          </View>
          <Pressable onPress={onClear} hitSlop={8}>
            <Text variant="caption" className="text-[11px] font-heading text-emerald-700">
              Changer
            </Text>
          </Pressable>
        </View>
      </Field>
    );
  }

  return (
    <Field label="Club organisateur *">
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
          className="h-11 flex-1 font-body text-[14px] text-brand-navy"
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
                Aucun club pour « {debounced} ».
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
                className="flex-row items-center gap-2 border-b border-brand-border/40 px-3 py-2.5"
              >
                <View className="flex-1">
                  <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text variant="caption" className="text-[11px]" numberOfLines={1}>
                    {c.city}
                    {c.postal_code ? ` (${c.postal_code})` : ''}
                  </Text>
                </View>
                <ChevronRight size={12} color="#CBD5E1" />
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </Field>
  );
}

// ───────────────────────────────────────────────────────────────
// Étape 2 — Dates
// ───────────────────────────────────────────────────────────────
function Step2Dates({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <Card>
      <View className="gap-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Date *" icon={CalendarIcon}>
              <DateField
                value={form.date}
                onChange={(d) => update('date', d)}
                placeholder="Sélectionner"
                minimumDate={new Date()}
              />
            </Field>
          </View>
          <View className="flex-1">
            <Field label="Heure" icon={Clock}>
              <TimeField
                value={form.start_time}
                onChange={(t) => update('start_time', t)}
              />
            </Field>
          </View>
        </View>

        <Field label="Date limite d'inscription" icon={CalendarIcon}>
          <DateField
            value={form.inscription_deadline}
            onChange={(d) => update('inscription_deadline', d)}
            placeholder="Optionnel — par défaut = jour du tournoi"
            minimumDate={new Date()}
            maximumDate={form.date ?? undefined}
          />
          <Text variant="caption" className="mt-1 text-[10px]">
            Les inscriptions se ferment automatiquement à cette date.
          </Text>
        </Field>
      </View>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────
// Étape 3 — Paramètres + récap
// ───────────────────────────────────────────────────────────────
function Step3Params({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <View className="gap-3">
      <Card>
        <View className="gap-4">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Nb équipes" icon={Users}>
                <NumberInput
                  value={form.max_teams}
                  onChange={(n) => update('max_teams', n)}
                  min={2}
                  max={64}
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Terrains" icon={Layers}>
                <NumberInput
                  value={form.courts_available}
                  onChange={(n) => update('courts_available', n)}
                  min={1}
                  max={20}
                />
              </Field>
            </View>
          </View>

          <Field label="Prix d'inscription" icon={Trophy}>
            <TextInput
              value={form.price}
              onChangeText={(v) => update('price', v)}
              placeholder='Ex : 20€/équipe (ou laisser vide)'
              placeholderTextColor="#94A3B8"
              className="h-11 rounded-2xl border border-brand-border bg-brand-bg px-3 font-body text-[14px] text-brand-navy"
            />
          </Field>

          {form.price.trim() ? (
            <View>
              <Text
                variant="caption"
                className="mb-2 text-[10px] font-heading-black uppercase"
                style={{ letterSpacing: 1 }}
              >
                MODE DE PAIEMENT
              </Text>
              <View className="flex-row gap-2">
                <PaymentOption
                  active={form.payment_method === 'on_site'}
                  icon={MapPinIcon}
                  label="Sur place"
                  hint="À l'arrivée"
                  tint="#1A2A4A"
                  onPress={() => update('payment_method', 'on_site')}
                />
                <PaymentOption
                  active={form.payment_method === 'online'}
                  icon={CreditCard}
                  label="En ligne"
                  hint="Stripe sécurisé"
                  tint="#E8650A"
                  onPress={() => update('payment_method', 'online')}
                />
              </View>
              {form.payment_method === 'online' ? (
                <View className="mt-2 flex-row items-start gap-2 rounded-xl border border-brand-orange/15 bg-brand-orange-light px-3 py-2.5">
                  <CreditCard size={13} color="#E8650A" />
                  <Text variant="caption" className="flex-1 text-[11px] text-brand-orange">
                    Les joueurs paieront lors de l'inscription. Les fonds sont versés sur ton compte Stripe.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <Text variant="h3" className="mb-2 text-[14px]">
          Récapitulatif
        </Text>
        <RecapRow label="Tournoi" value={form.name} />
        <RecapRow label="Club" value={form.club?.name ?? '—'} />
        <RecapRow label="Ville" value={form.club?.city ?? '—'} />
        <RecapRow label="Niveau" value={form.level} />
        <RecapRow label="Type" value={form.type === 'mixte' ? 'Mixte' : form.type === 'masculin' ? 'Masculin' : form.type === 'feminin' ? 'Féminin' : 'Open'} />
        <RecapRow label="Date" value={formatDateFR(form.date)} />
        <RecapRow label="Heure" value={form.start_time} />
        <RecapRow label="Équipes max" value={String(form.max_teams)} />
        <RecapRow label="Terrains" value={String(form.courts_available)} />
        {form.price.trim() ? (
          <RecapRow
            label="Prix"
            value={`${form.price.trim()} — ${form.payment_method === 'online' ? 'Paiement en ligne (Stripe)' : 'Paiement sur place'}`}
          />
        ) : (
          <RecapRow label="Prix" value="Gratuit" />
        )}
      </Card>
    </View>
  );
}

// ───────────────────────────────────────────────────────────────
// Primitives UI partagées
// ───────────────────────────────────────────────────────────────
function Field({
  label,
  icon: Icon,
  accent,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View className="mb-1 flex-row items-center gap-1">
        {Icon ? <Icon size={11} color={accent ? '#E8650A' : '#1A2A4A'} /> : null}
        <Text
          variant="caption"
          className={`text-[10px] font-heading-black uppercase ${accent ? 'text-brand-orange' : 'text-brand-navy'}`}
          style={{ letterSpacing: 1 }}
        >
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`flex-1 items-center rounded-xl border py-2 ${
              active ? 'border-brand-navy bg-brand-navy' : 'border-brand-border bg-brand-bg'
            }`}
          >
            <Text
              variant="caption"
              className={`text-[12px] font-heading ${active ? 'text-white' : 'text-brand-navy'}`}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Pill<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`rounded-full border px-2.5 py-1 ${
              active ? 'border-brand-orange bg-brand-orange' : 'border-brand-border bg-white'
            }`}
          >
            <Text
              variant="caption"
              className={`text-[11px] font-heading ${active ? 'text-white' : 'text-brand-navy'}`}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-brand-border bg-brand-bg px-2">
      <Pressable
        onPress={() => onChange(clamp(value - 1))}
        className="h-10 w-10 items-center justify-center"
        hitSlop={4}
      >
        <Text className="font-heading-black text-[20px] text-brand-navy">−</Text>
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(raw) => {
          const n = parseInt(raw.replace(/[^0-9]/g, '') || '0', 10);
          onChange(clamp(n));
        }}
        keyboardType="number-pad"
        className="flex-1 text-center font-heading-black text-[17px] text-brand-navy"
      />
      <Pressable
        onPress={() => onChange(clamp(value + 1))}
        className="h-10 w-10 items-center justify-center"
        hitSlop={4}
      >
        <Text className="font-heading-black text-[20px] text-brand-navy">+</Text>
      </Pressable>
    </View>
  );
}

function DateField({
  value,
  onChange,
  placeholder,
  minimumDate,
  maximumDate,
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  placeholder: string;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [show, setShow] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) {
      onChange(selected);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        className="h-11 flex-row items-center rounded-2xl border border-brand-border bg-brand-bg px-3"
      >
        <Text
          className={`flex-1 font-body text-[14px] ${value ? 'text-brand-navy' : 'text-slate-400'}`}
        >
          {value ? formatDateFR(value) : placeholder}
        </Text>
        <CalendarIcon size={14} color="#94A3B8" />
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value ?? minimumDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
          locale="fr-FR"
        />
      ) : null}
      {Platform.OS === 'ios' && show ? (
        <Pressable
          onPress={() => setShow(false)}
          className="mt-2 self-end rounded-full bg-brand-orange px-4 py-1"
        >
          <Text variant="caption" className="text-[11px] font-heading-black text-white">
            OK
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

function TimeField({ value, onChange }: { value: string; onChange: (hhmm: string) => void }) {
  const [show, setShow] = useState(false);

  const timeToDate = useMemo(() => {
    const [hh, mm] = value.split(':').map((x) => parseInt(x, 10));
    const d = new Date();
    d.setHours(Number.isFinite(hh) ? hh : 9, Number.isFinite(mm) ? mm : 0, 0, 0);
    return d;
  }, [value]);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) {
      const hh = String(selected.getHours()).padStart(2, '0');
      const mm = String(selected.getMinutes()).padStart(2, '0');
      onChange(`${hh}:${mm}`);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        className="h-11 flex-row items-center rounded-2xl border border-brand-border bg-brand-bg px-3"
      >
        <Text className="flex-1 font-body text-[14px] text-brand-navy">{value}</Text>
        <Clock size={14} color="#94A3B8" />
      </Pressable>
      {show ? (
        <DateTimePicker
          value={timeToDate}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          locale="fr-FR"
        />
      ) : null}
      {Platform.OS === 'ios' && show ? (
        <Pressable
          onPress={() => setShow(false)}
          className="mt-2 self-end rounded-full bg-brand-orange px-4 py-1"
        >
          <Text variant="caption" className="text-[11px] font-heading-black text-white">
            OK
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

function PaymentOption({
  active,
  icon: Icon,
  label,
  hint,
  tint,
  onPress,
}: {
  active: boolean;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  hint: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center gap-1.5 rounded-2xl border-2 p-3 ${
        active ? 'bg-white' : 'border-brand-border bg-white'
      }`}
      style={{ borderColor: active ? tint : '#F0EBE8' }}
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: active ? tint : '#F1F5F9' }}
      >
        <Icon size={15} color={active ? '#FFFFFF' : '#94A3B8'} />
      </View>
      <Text
        variant="caption"
        className="text-[10px] font-heading-black"
        style={{ color: active ? tint : '#94A3B8' }}
      >
        {label}
      </Text>
      <Text variant="caption" className="text-[9px] text-slate-400">
        {hint}
      </Text>
    </Pressable>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-brand-border py-1.5 last:border-0">
      <Text variant="caption" className="text-[11px]">
        {label}
      </Text>
      <Text variant="body-medium" className="text-[11px]" numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}
