import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar as CalendarIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/design-system';

interface Props {
  from: Date | null;
  to: Date | null;
  onChangeFrom: (d: Date | null) => void;
  onChangeTo: (d: Date | null) => void;
}

/**
 * Filtre plage de dates — port TournamentsPage.js Emergent d5ac086 (2 inputs
 * date séparés par "à"). Chaque input a une croix pour reset individuel.
 *
 * Backend : `date_from`/`date_to` format YYYY-MM-DD (cf. ListTournamentsController
 * which(filled) + whereDate >=, <=). Bornes : `from` ne peut pas dépasser `to`
 * et vice-versa.
 */
export function DateRangeFilter({ from, to, onChangeFrom, onChangeTo }: Props) {
  return (
    <View className="flex-row items-center gap-2 px-5 pb-3">
      <View className="flex-1">
        <DatePill
          value={from}
          placeholder="Date début"
          maximumDate={to ?? undefined}
          onChange={onChangeFrom}
        />
      </View>
      <Text variant="caption" className="text-[11px] font-body-medium text-brand-muted">
        à
      </Text>
      <View className="flex-1">
        <DatePill
          value={to}
          placeholder="Date fin"
          minimumDate={from ?? undefined}
          onChange={onChangeTo}
        />
      </View>
    </View>
  );
}

function DatePill({
  value,
  placeholder,
  minimumDate,
  maximumDate,
  onChange,
}: {
  value: Date | null;
  placeholder: string;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (d: Date | null) => void;
}) {
  const [show, setShow] = useState(false);

  const handlePick = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) {
      onChange(selected);
    } else if (event.type === 'dismissed') {
      // No-op : Android ferme naturellement, iOS reste ouvert jusqu'à OK.
    }
  };

  return (
    <>
      <View className="flex-row items-center gap-2 rounded-2xl border border-brand-border bg-white px-3 py-2">
        <CalendarIcon size={14} color="#94A3B8" />
        <Pressable onPress={() => setShow(true)} className="flex-1" hitSlop={4}>
          <Text
            className={`font-body text-[12px] ${value ? 'text-brand-navy' : 'text-slate-400'}`}
            numberOfLines={1}
          >
            {value ? formatShortFR(value) : placeholder}
          </Text>
        </Pressable>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={6}>
            <X size={12} color="#94A3B8" />
          </Pressable>
        ) : null}
      </View>

      {show ? (
        <DateTimePicker
          value={value ?? minimumDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handlePick}
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

function formatShortFR(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

/**
 * Format YYYY-MM-DD local — évite le décalage UTC de toISOString().
 * Exporté pour que l'écran appelant puisse sérialiser avant envoi backend.
 */
export function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
