import { useRouter } from 'expo-router';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';

import { Text } from '@/design-system';
import type { FeedPost } from '@/features/feed/types';

import { aspectRatioFor } from './postAspect';

interface Props {
  post: FeedPost;
  onToggleLike: () => void;
  onOpenComments: () => void;
}

/**
 * Post card feed — port d541157 (image ratio 4/5, actions Heart/MessageCircle/Share,
 * compteur likes, texte + compteur commentaires). Tap carte → tournoi si lié.
 */
export function PostCard({ post, onToggleLike, onOpenComments }: Props) {
  const router = useRouter();
  const authorName = post.author?.name ?? 'PlaceToPadel';
  const initial = authorName.charAt(0).toUpperCase();
  const isSystem = post.type !== 'user';

  const goToTournament = () => {
    if (post.tournament) router.push(`/(tabs)/tournois/${post.tournament.uuid}`);
  };

  return (
    <View className="bg-white">
      {/* En-tête auteur */}
      <View className="flex-row items-center gap-3 px-4 py-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-orange">
          {post.author?.picture_url ? (
            <Image
              source={{ uri: post.author.picture_url }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
          ) : (
            <Text className="font-heading-black text-white">{initial}</Text>
          )}
        </View>
        <View className="flex-1">
          <Text variant="body-medium" className="text-[13px]" numberOfLines={1}>
            {authorName}
          </Text>
          {post.tournament ? (
            <Pressable onPress={goToTournament}>
              <Text
                variant="caption"
                className="text-[11px] font-body-medium text-brand-orange"
                numberOfLines={1}
              >
                {post.tournament.name}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text variant="caption" className="text-[11px]">
          {timeAgo(post.created_at)}
        </Text>
      </View>

      {/* Image — ratio piloté par post_aspect (square=1, landscape=16/9, default=4/5) */}
      {post.image_url ? (
        <Image
          source={{ uri: post.image_url }}
          style={{ width: '100%', aspectRatio: aspectRatioFor(post.post_aspect) }}
          resizeMode="cover"
        />
      ) : null}

      {/* Actions */}
      <View className="flex-row items-center gap-5 px-4 pb-1 pt-3">
        <Pressable onPress={onToggleLike} hitSlop={8}>
          <Heart
            size={22}
            color={post.liked_by_viewer ? '#E8650A' : '#1A2A4A'}
            fill={post.liked_by_viewer ? '#E8650A' : 'transparent'}
            strokeWidth={post.liked_by_viewer ? 0 : 1.8}
          />
        </Pressable>
        <Pressable onPress={onOpenComments} hitSlop={8}>
          <MessageCircle size={22} color="#1A2A4A" strokeWidth={1.8} />
        </Pressable>
        <Pressable hitSlop={8}>
          <Share2 size={20} color="#1A2A4A" strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* Compteurs + texte */}
      <View className="px-4 pb-3">
        {post.likes_count > 0 ? (
          <Text variant="body-medium" className="text-[13px]">
            {post.likes_count} j'aime
          </Text>
        ) : null}
        {post.text ? (
          <Text variant="body" className="mt-1 text-[13px] leading-5">
            {isSystem ? null : <Text variant="body-medium">{authorName} </Text>}
            {post.text}
          </Text>
        ) : null}
        {post.comments_count > 0 ? (
          <Pressable onPress={onOpenComments}>
            <Text variant="caption" className="mt-1 text-[12px]">
              Voir les {post.comments_count}{' '}
              {post.comments_count === 1 ? 'commentaire' : 'commentaires'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function timeAgo(dateStr: string): string {
  const diffSec = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diffSec < 60) return 'maintenant';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h`;
  return `${Math.floor(diffSec / 86400)} j`;
}
