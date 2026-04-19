import { Image } from 'expo-image';
import { Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Card, Text } from '@/design-system';
import type { FeedPost } from '@/features/feed/types';
import {
  flattenFeed,
  useCreatePost,
  useTournamentPosts,
} from '@/features/feed/useFeed';
import { formatApiError } from '@/lib/api';

interface Props {
  tournamentUuid: string;
  tournamentName: string;
  /** True si l'user peut écrire (organizer | admin | captain | partner team registered). */
  canPost: boolean;
  /** True si authentifié (sinon CTA login au lieu de placeholder "Inscris-toi"). */
  isAuthenticated: boolean;
  onLogin: () => void;
}

/**
 * Port Emergent d5ac086 [TournamentDetailPage.js:951-1062] — chat tournoi.
 *
 * Lecture : tout le monde (auth optionnelle côté backend, polling 5s via
 * useTournamentPosts refetchInterval).
 * Écriture : `canPost` = organizer + admin + participants (règle backend
 * CreatePostController:24-31 — 403 sinon).
 *
 * Le rôle "referee" est signalé par un badge orange "Juge" à côté du nom,
 * cohérent Emergent.
 */
export function TournamentSalon({
  tournamentUuid,
  tournamentName,
  canPost,
  isAuthenticated,
  onLogin,
}: Props) {
  const postsQuery = useTournamentPosts(tournamentUuid);
  const createMut = useCreatePost();
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const posts = flattenFeed(postsQuery.data);
  const orderedPosts = [...posts].reverse(); // plus anciens en haut, nouveaux en bas (chat UX)

  useEffect(() => {
    // Scroll auto vers le bas à chaque nouveau message.
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(id);
  }, [posts.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await createMut.mutateAsync({
        text: trimmed,
        tournament_uuid: tournamentUuid,
      });
      setText('');
      postsQuery.refetch();
    } catch (err) {
      Alert.alert('Erreur', formatApiError(err));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View className="gap-3">
        <ScrollView
          ref={scrollRef}
          style={{ maxHeight: 400 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          showsVerticalScrollIndicator
        >
          {postsQuery.isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#E8650A" />
            </View>
          ) : orderedPosts.length === 0 ? (
            <Card>
              <View className="items-center py-4">
                <Text style={{ fontSize: 28 }}>💬</Text>
                <Text variant="body-medium" className="mt-2 text-[14px]">
                  Aucun message pour le moment
                </Text>
                <Text variant="caption" className="mt-1 text-center text-[12px]">
                  {canPost
                    ? 'Écris le premier message de ce salon !'
                    : `Le salon de ${tournamentName} attend les premiers échanges.`}
                </Text>
              </View>
            </Card>
          ) : (
            orderedPosts.map((post) => <SalonMessage key={post.uuid} post={post} />)
          )}
        </ScrollView>

        {/* Composer — règles d'accès identiques à Emergent */}
        {canPost ? (
          <View className="flex-row items-center gap-2 border-t border-brand-border/60 pt-3">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Écris un message…"
              placeholderTextColor="#94A3B8"
              className="h-11 flex-1 rounded-full border border-brand-border bg-white px-4 font-body text-[14px] text-brand-navy"
              multiline={false}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!createMut.isPending}
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || createMut.isPending}
              className="h-11 w-11 items-center justify-center rounded-full bg-brand-orange"
              style={{ opacity: !text.trim() || createMut.isPending ? 0.4 : 1 }}
            >
              {createMut.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Send size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        ) : !isAuthenticated ? (
          <View className="border-t border-brand-border/60 pt-3">
            <Text variant="caption" className="text-center text-[12px]">
              <Pressable onPress={onLogin} hitSlop={4}>
                <Text
                  variant="caption"
                  className="text-[12px] font-heading-black text-brand-orange"
                >
                  Connecte-toi
                </Text>
              </Pressable>{' '}
              pour participer au salon.
            </Text>
          </View>
        ) : (
          <View className="border-t border-brand-border/60 pt-3">
            <Text variant="caption" className="text-center text-[12px]">
              Inscris-toi au tournoi pour écrire dans le salon.
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Une ligne de message — avatar rond, nom + heure, texte.
 * Préserve le badge orange "Juge" pour les posts d'un referee/admin
 * (signal Emergent pour distinguer les annonces officielles du chat).
 */
function SalonMessage({ post }: { post: FeedPost }) {
  const author = post.author;
  const isReferee = post.post_type === 'referee_announcement';
  const createdAt = new Date(post.created_at);
  const hhmm = createdAt.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View className="flex-row items-start gap-2.5">
      <View
        className="h-9 w-9 items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: isReferee ? '#E8650A' : '#1A2A4A' }}
      >
        {author?.picture_url ? (
          <Image
            source={author.picture_url}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <Text className="font-heading-black text-[12px] text-white">
            {(author?.name ?? '?').charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text variant="body-medium" className="text-[12px]" numberOfLines={1}>
            {author?.name ?? 'PlaceToPadel'}
          </Text>
          {isReferee ? (
            <View className="rounded-full bg-brand-orange-light px-1.5 py-0.5">
              <Text
                className="font-heading-black text-brand-orange"
                style={{ fontSize: 9 }}
              >
                JUGE
              </Text>
            </View>
          ) : null}
          <Text variant="caption" className="text-[10px]">
            {hhmm}
          </Text>
        </View>
        {post.text ? (
          <Text variant="body" className="mt-0.5 text-[13px] leading-5">
            {post.text}
          </Text>
        ) : null}
        {post.image_url ? (
          <Image
            source={post.image_url}
            style={{
              width: 200,
              aspectRatio: 4 / 5,
              borderRadius: 12,
              marginTop: 6,
            }}
            contentFit="cover"
          />
        ) : null}
      </View>
    </View>
  );
}
