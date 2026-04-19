import type { AvailabilitySlot } from './useProfile';

export interface SlotPreset {
  key: string;
  label: string;
  day_of_week: number | null;
  period: AvailabilitySlot['period'];
}

/**
 * 10 créneaux pré-configurés — miroir de la règle métier backend
 * (UserAvailability + UpdateProfileRequest) : tuple {day_of_week, period}.
 * "Flexible" est exclusif : day_of_week=null ⇔ period='all'.
 * Partagé entre /profil/[id].tsx (édition profil) et /(auth)/register.tsx.
 */
export const SLOT_PRESETS: SlotPreset[] = [
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

export function slotKey(slot: AvailabilitySlot): string {
  return `${slot.day_of_week ?? 'null'}:${slot.period}`;
}

/**
 * Toggle immuable d'un preset sur la liste courante. Règle Flexible :
 * - cliquer Flexible quand il est activé → le désélectionner
 * - cliquer Flexible quand il n'est pas activé → purge tous les autres
 * - cliquer un preset jour-spécifique → désélectionne Flexible si présent
 * Miroir exact de la logique `togglePreset` dans profil/[id].tsx.
 */
export function toggleSlotPreset(
  current: AvailabilitySlot[],
  preset: SlotPreset,
): AvailabilitySlot[] {
  const key = `${preset.day_of_week ?? 'null'}:${preset.period}`;
  const exists = current.some((s) => slotKey(s) === key);
  if (exists) {
    return current.filter((s) => slotKey(s) !== key);
  }
  if (preset.day_of_week === null) {
    return [{ day_of_week: null, period: 'all' }];
  }
  const withoutFlex = current.filter((s) => s.day_of_week !== null);
  return [
    ...withoutFlex,
    { day_of_week: preset.day_of_week, period: preset.period },
  ];
}
