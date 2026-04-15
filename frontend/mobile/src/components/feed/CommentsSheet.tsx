import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/design-system';
import type { FeedFilter } from '@/features/feed/types';
import { useCreateComment, usePostComments } from '@/features/feed/useFeed';

interface Props {
  postUuid: string | null;
  filter: FeedFilter;
  onClose: () => void;
}

/**
 * Bottom-sheet commentaires — liste + input envoi. Le post UUID null ferme
 * la modale. TanStack Query met à jour la liste optimistiquement via
 * useCreateComment.
 */
export function CommentsSheet({ postUuid, filter, onClose }: Props) {
  const { data: comments, isLoading } = usePostComments(postUuid);
  const createMut = useCreateComment(postUuid ?? '', filter);
  const [text, setText] = useState('');

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !postUuid) return;
    setText('');
    try {
      await createMut.mutateAsync(trimmed);
    } catch {
      setText(trimmed);
    }
  };

  return (
    <Modal
      visible={!!postUuid}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable onPress={onClose} className="flex-1 bg-black/40" />
        <View className="max-h-[70%] rounded-t-3xl bg-white px-5 pb-6 pt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text variant="h3" className="text-[16px]">
              Commentaires
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color="#1A2A4A" />
            </Pressable>
          </View>

          <ScrollView
            className="max-h-[360px]"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isLoading ? (
              <View className="items-center py-6">
                <ActivityIndicator color="#E8650A" />
              </View>
            ) : comments && comments.length > 0 ? (
              comments.map((c) => (
                <View key={c.uuid} className="mb-3">
                  <Text variant="body" className="text-[13px] leading-5">
                    <Text variant="body-medium">{c.user?.name ?? 'Utilisateur'} </Text>
                    {c.text}
                  </Text>
                </View>
              ))
            ) : (
              <Text variant="caption" className="py-4 text-center">
                Aucun commentaire. Sois le premier.
              </Text>
            )}
          </ScrollView>

          <View className="mt-3 flex-row items-center gap-2 border-t border-brand-border pt-3">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Ajouter un commentaire…"
              placeholderTextColor="#94A3B8"
              className="flex-1 rounded-2xl bg-brand-bg px-4 py-2 font-body text-[14px] text-brand-navy"
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || createMut.isPending}
              className="px-2"
            >
              <Text
                variant="caption"
                className={`font-heading text-[13px] ${
                  text.trim() ? 'text-brand-orange' : 'text-brand-muted'
                }`}
              >
                Publier
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
