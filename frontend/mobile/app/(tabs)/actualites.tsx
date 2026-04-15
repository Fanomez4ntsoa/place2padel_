import { Newspaper } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentsSheet } from '@/components/feed/CommentsSheet';
import { FeedFilterPills } from '@/components/feed/FeedFilterPills';
import { PostCard } from '@/components/feed/PostCard';
import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/design-system';
import type { FeedFilter, FeedPost } from '@/features/feed/types';
import { flattenFeed, useFeed, useToggleLike } from '@/features/feed/useFeed';

export default function ActualitesScreen() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [filter, setFilter] = useState<FeedFilter>('all');
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);

  const feedQuery = useFeed(filter);
  const toggleLike = useToggleLike(filter);

  const posts = flattenFeed(feedQuery.data);

  const onEndReached = useCallback(() => {
    if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
      feedQuery.fetchNextPage();
    }
  }, [feedQuery]);

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => (
      <View className="border-b border-brand-border/60">
        <PostCard
          post={item}
          onToggleLike={() => toggleLike.mutate(item.uuid)}
          onOpenComments={() => setOpenCommentsFor(item.uuid)}
        />
      </View>
    ),
    [toggleLike],
  );

  const ListEmpty = feedQuery.isLoading ? (
    <View className="items-center py-16">
      <ActivityIndicator color="#E8650A" />
    </View>
  ) : (
    <View className="items-center px-6 py-16">
      <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl bg-brand-orange-light">
        <Newspaper size={28} color="#E8650A" />
      </View>
      <Text variant="h3" className="text-[16px]">
        Aucune actualité
      </Text>
      <Text variant="caption" className="mt-1 text-center">
        Les nouveautés tournois et clubs apparaîtront ici.
      </Text>
    </View>
  );

  const ListFooter = feedQuery.isFetchingNextPage ? (
    <View className="py-6">
      <ActivityIndicator color="#E8650A" />
    </View>
  ) : (
    <View className="h-6" />
  );

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-brand-bg">
      <FeedFilterPills value={filter} onChange={setFilter} isLoggedIn={isLoggedIn} />
      <FlatList
        data={posts}
        keyExtractor={(p) => p.uuid}
        renderItem={renderItem}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching && !feedQuery.isFetchingNextPage}
            onRefresh={() => feedQuery.refetch()}
            tintColor="#E8650A"
          />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      />

      <CommentsSheet
        postUuid={openCommentsFor}
        filter={filter}
        onClose={() => setOpenCommentsFor(null)}
      />
    </SafeAreaView>
  );
}
