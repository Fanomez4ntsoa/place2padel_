import { useRouter } from 'expo-router';
import { MapPin, Trophy } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateRangeFilter, dateToISO } from '@/components/tournois/DateRangeFilter';
import { LevelFilterPills } from '@/components/tournois/LevelFilterPills';
import { TournamentCard } from '@/components/tournois/TournamentCard';
import { TournamentListSkeleton } from '@/components/tournois/TournamentListSkeleton';
import { TournamentsHeader } from '@/components/tournois/TournamentsHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Text } from '@/design-system';
import type { TournamentLevel, TournamentSummary } from '@/features/tournaments/types';
import {
  flattenTournamentPages,
  useTournaments,
} from '@/features/tournaments/useTournaments';

export default function TournoisListScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [city, setCity] = useState<string>((user?.['city'] as string | undefined) ?? '');
  const [radius, setRadius] = useState<number>(30);
  const [level, setLevel] = useState<TournamentLevel | ''>('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  const filters = useMemo(
    () => ({
      city,
      level,
      dateFrom: dateFrom ? dateToISO(dateFrom) : undefined,
      dateTo: dateTo ? dateToISO(dateTo) : undefined,
      perPage: 20,
    }),
    [city, level, dateFrom, dateTo],
  );

  const query = useTournaments(filters);
  const tournaments = flattenTournamentPages(query.data?.pages);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  const resetFilters = () => {
    setCity('');
    setRadius(30);
    setLevel('');
    setDateFrom(null);
    setDateTo(null);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: TournamentSummary; index: number }) => (
      <View className="px-5 pb-3" style={index === 0 ? undefined : undefined}>
        <TournamentCard
          tournament={item}
          delay={Math.min(index * 40, 240)}
          onPress={() => router.push(`/(tabs)/tournois/${item.uuid}`)}
        />
      </View>
    ),
    [router],
  );

  const ListHeader = (
    <>
      <TournamentsHeader
        city={city}
        onCityChange={setCity}
        radius={radius}
        onRadiusChange={setRadius}
      />
      <LevelFilterPills value={level} onChange={setLevel} />
      <DateRangeFilter
        from={dateFrom}
        to={dateTo}
        onChangeFrom={setDateFrom}
        onChangeTo={setDateTo}
      />

      {city.trim().length > 0 ? (
        <View className="mx-5 mb-3 flex-row items-center gap-1.5 rounded-xl bg-brand-orange-light px-3.5 py-2">
          <MapPin size={12} color="#E8650A" />
          <Text variant="caption" className="flex-1 text-brand-orange font-body-medium">
            Tournois autour de <Text className="font-heading text-brand-orange">{city}</Text> dans un
            rayon de <Text className="font-heading text-brand-orange">{radius} km</Text>
          </Text>
        </View>
      ) : null}
    </>
  );

  const ListFooter = query.isFetchingNextPage ? (
    <View className="py-6">
      <ActivityIndicator color="#E8650A" />
    </View>
  ) : (
    <View className="h-6" />
  );

  const ListEmpty = query.isLoading ? (
    <TournamentListSkeleton />
  ) : (
    <View className="mx-5 items-center rounded-3xl border border-brand-border bg-white p-12">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
        <Trophy size={28} color="#CBD5E1" />
      </View>
      <Text variant="h3" className="text-[18px]">
        Aucun tournoi trouvé
      </Text>
      <Text variant="caption" className="mt-1 text-center">
        {city.trim().length > 0
          ? `Pas de tournoi à ${city} dans ${radius} km`
          : 'Modifie tes filtres ou reviens plus tard'}
      </Text>
      {city.trim().length > 0 ? (
        <Button label="Voir tous les tournois" onPress={resetFilters} className="mt-4 px-5" size="md" />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <FlatList
        data={tournaments}
        keyExtractor={(t) => t.uuid}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            tintColor="#E8650A"
          />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
