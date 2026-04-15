import { useRouter } from 'expo-router';
import { Building2, Heart, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClubRow } from '@/components/clubs/ClubRow';
import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';
import type { Club } from '@/features/clubs/types';
import { flattenClubs, useClubsSearch, useMyClubs } from '@/features/clubs/useClubs';

export default function ClubsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(rawQuery.trim()), 300);
    return () => clearTimeout(id);
  }, [rawQuery]);

  const filters = useMemo(
    () => (debouncedQuery.length >= 2 ? { q: debouncedQuery } : {}),
    [debouncedQuery],
  );

  const searchQuery = useClubsSearch(filters);
  const myClubsQuery = useMyClubs();

  const isSearching = debouncedQuery.length >= 2;
  const clubs = flattenClubs(searchQuery.data);

  const onEndReached = useCallback(() => {
    if (isSearching && searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
      searchQuery.fetchNextPage();
    }
  }, [isSearching, searchQuery]);

  const openClub = (c: Club) => router.push(`/clubs/${c.uuid}`);

  const renderItem = useCallback(
    ({ item }: { item: Club }) => (
      <View className="px-4 pb-2.5">
        <ClubRow club={item} onPress={() => openClub(item)} />
      </View>
    ),
    [],
  );

  // État initial non recherché : empty hint + "Mes clubs" si loggé
  const ListHeader = (
    <View>
      {!isSearching && isLoggedIn && myClubsQuery.data && myClubsQuery.data.length > 0 ? (
        <View className="px-4 pb-2 pt-3">
          <View className="mb-2 flex-row items-center gap-1.5">
            <Heart size={13} color="#E8650A" fill="#E8650A" />
            <Text
              variant="caption"
              className="text-[11px] font-heading-black uppercase tracking-wider text-brand-orange"
            >
              Mes abonnements ({myClubsQuery.data.length})
            </Text>
          </View>
          <View className="gap-2.5">
            {myClubsQuery.data.map((c) => (
              <ClubRow key={c.uuid} club={c} onPress={() => openClub(c)} />
            ))}
          </View>
        </View>
      ) : null}
      {isSearching && clubs.length > 0 ? (
        <Text
          variant="caption"
          className="px-4 pb-2 pt-3 text-[11px] font-heading-black uppercase tracking-wider"
        >
          {searchQuery.data?.pages[0].meta.total ?? clubs.length} club
          {(searchQuery.data?.pages[0].meta.total ?? clubs.length) > 1 ? 's' : ''} trouvé
          {(searchQuery.data?.pages[0].meta.total ?? clubs.length) > 1 ? 's' : ''}
        </Text>
      ) : null}
    </View>
  );

  const ListEmpty = isSearching ? (
    searchQuery.isLoading ? (
      <View className="items-center py-16">
        <ActivityIndicator color="#E8650A" />
      </View>
    ) : (
      <View className="items-center px-6 py-16">
        <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
          <Building2 size={28} color="#CBD5E1" />
        </View>
        <Text variant="h3" className="text-[16px]">
          Aucun club trouvé
        </Text>
        <Text variant="caption" className="mt-1 text-center">
          Essaie avec un autre nom ou une autre ville.
        </Text>
      </View>
    )
  ) : (
    <View className="items-center px-6 py-12">
      <View className="mb-4 h-18 w-18 items-center justify-center rounded-3xl bg-brand-orange-light">
        <Building2 size={32} color="#E8650A" />
      </View>
      <Text variant="h3" className="text-[16px]">
        Trouve ton club
      </Text>
      <Text variant="caption" className="mt-1 text-center">
        Cherche par nom de club ou par ville.{'\n'}85 clubs référencés en France.
      </Text>
    </View>
  );

  const ListFooter = searchQuery.isFetchingNextPage ? (
    <View className="py-6">
      <ActivityIndicator color="#E8650A" />
    </View>
  ) : (
    <View className="h-6" />
  );

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      {/* Barre recherche sticky */}
      <View className="border-b border-brand-border/60 bg-white px-4 py-3">
        <View className="flex-row items-center gap-2.5 rounded-2xl border border-brand-border bg-brand-bg px-3.5 py-2.5">
          <Search size={16} color="#94A3B8" />
          <TextInput
            value={rawQuery}
            onChangeText={setRawQuery}
            placeholder="Cherche un club ou une ville…"
            placeholderTextColor="#94A3B8"
            className="flex-1 font-body text-[14px] text-brand-navy"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {rawQuery.length > 0 ? (
            <Pressable onPress={() => setRawQuery('')} hitSlop={8}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={isSearching ? clubs : []}
        keyExtractor={(c) => c.uuid}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={
              (isSearching && searchQuery.isRefetching && !searchQuery.isFetchingNextPage) ||
              (!isSearching && myClubsQuery.isRefetching)
            }
            onRefresh={() =>
              isSearching ? searchQuery.refetch() : myClubsQuery.refetch()
            }
            tintColor="#E8650A"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}
