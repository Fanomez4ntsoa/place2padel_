import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Swords, Trophy } from 'lucide-react-native';
import { ComponentType, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TournamentCard } from '@/components/tournois/TournamentCard';
import { Card, Text } from '@/design-system';
import type { TournamentSummary } from '@/features/tournaments/types';
import {
  flattenMyTournaments,
  useMyTournaments,
  type MyTournamentsStatus,
} from '@/features/tournaments/useMyTournaments';

/**
 * Écran "Mes tournois" — port MyTournamentsPage.js Emergent 39b6544.
 *
 * 3 pills En cours / À venir (default) / Passés mappent sur `?status=` du
 * nouvel endpoint `/tournaments/mine` (viewer = creator OU captain/partner).
 */
type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface Tab {
  key: MyTournamentsStatus;
  label: string;
  icon: IconCmp;
  emptyLabel: string;
  emptyHint?: string;
}

const TABS: Tab[] = [
  {
    key: 'in_progress',
    label: 'En cours',
    icon: Swords,
    emptyLabel: 'Aucun tournoi en cours',
  },
  {
    key: 'upcoming',
    label: 'À venir',
    icon: Calendar,
    emptyLabel: 'Aucun tournoi à venir',
    emptyHint: 'Inscris-toi ou crée un tournoi',
  },
  {
    key: 'completed',
    label: 'Passés',
    icon: Trophy,
    emptyLabel: 'Aucun tournoi passé',
  },
];

export default function MyTournamentsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<MyTournamentsStatus>('upcoming');
  const query = useMyTournaments(tab);
  const tournaments = flattenMyTournaments(query.data);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-brand-bg">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#1A2A4A" />
        </Pressable>
        <Text variant="h2" className="flex-1 text-[20px]">
          Mes tournois
        </Text>
      </View>

      <View className="mx-4 mb-3 flex-row gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl py-2.5 ${
                active ? 'bg-brand-navy' : 'border border-brand-border bg-white'
              }`}
            >
              <Icon size={14} color={active ? '#FFFFFF' : '#64748B'} />
              <Text
                variant="caption"
                className={`text-[12px] font-heading ${active ? 'text-white' : 'text-brand-muted'}`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList<TournamentSummary>
        data={tournaments}
        keyExtractor={(t) => t.uuid}
        renderItem={({ item, index }) => (
          <View className="px-4 pb-3">
            <TournamentCard
              tournament={item}
              delay={Math.min(index * 40, 240)}
              onPress={() => router.push(`/(tabs)/tournois/${item.uuid}`)}
            />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            tintColor="#E8650A"
          />
        }
        ListEmptyComponent={
          query.isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#E8650A" />
            </View>
          ) : (
            <View className="mx-4">
              <Card>
                <View className="items-center py-10">
                  <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
                    <Trophy size={28} color="#CBD5E1" />
                  </View>
                  <Text variant="h3" className="text-[16px]">
                    {activeTab.emptyLabel}
                  </Text>
                  {activeTab.emptyHint ? (
                    <Text variant="caption" className="mt-1 text-center">
                      {activeTab.emptyHint}
                    </Text>
                  ) : null}
                </View>
              </Card>
            </View>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color="#E8650A" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
