import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

/* Every modal in the web app was a bottom sheet under 640px and a centred
 * dialog above it, driven by the .modal-scrim / .modal-panel keyframes in
 * globals.css. A phone is always the first case, so this is a bottom sheet —
 * which also removes the reason those keyframes used
 * `animation-duration: 1ms` under prefers-reduced-motion instead of
 * `animation: none` (RefundApplyModal closed off onAnimationEnd, and a removed
 * animation never fires the event). RN's Modal handles the transition.
 */
export default function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  headerColor,
  children,
  footer = null,
  scroll = true,
}) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
      >
        <Pressable className="flex-1 bg-black/55" onPress={onClose} />
        <View className="bg-white rounded-t-2xl overflow-hidden max-h-[88%]">
          {/* Drag handle — the web drew one on its mobile sheets. */}
          <View className="items-center pt-2">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          {!!title && (
            <View
              className="flex-row items-center gap-3 px-4 py-3"
              style={headerColor ? { backgroundColor: headerColor } : undefined}
            >
              <View className="flex-1">
                <Text
                  className={`font-bold text-md ${headerColor ? 'text-white' : 'text-foreground'}`}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {!!subtitle && (
                  <Text className={`text-2xs ${headerColor ? 'text-white/75' : 'text-gray-400'}`}>
                    {subtitle}
                  </Text>
                )}
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={18} color={headerColor ? 'rgba(255,255,255,0.85)' : '#6b7280'} />
              </Pressable>
            </View>
          )}

          <Body
            {...(scroll
              ? { contentContainerClassName: 'px-4 py-4', keyboardShouldPersistTaps: 'handled' }
              : { className: 'px-4 py-4' })}
          >
            {children}
          </Body>

          {footer && (
            <View
              className="px-4 pt-3 border-t border-gray-100"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              {footer}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
