import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Modal, TextInput, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Send } from 'lucide-react-native';
import { on, EVENTS } from '@/lib/events';
import { CONTACT, whatsappUrl } from '@/data/contact';
import colors from '@/theme/colors';

const AVATAR = require('@/assets/paicart_icon.png');

const GREETING =
  'Hi there! 👋 Welcome to Paicart.\nHow can we help you with our Buy For Me or Ship For Me services?';

/* A WhatsApp-styled sheet that composes a message and hands off to the real
   WhatsApp app. The web version faked the same chat UI and then called
   window.open('https://wa.me/...'). Here that is Linking.openURL, which opens
   the installed app directly rather than the web bridge. */
export default function FloatingWhatsApp() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => on(EVENTS.TOGGLE_WHATSAPP, () => setOpen((v) => !v)), []);

  const send = async () => {
    const url = whatsappUrl(text || undefined);
    setOpen(false);
    setText('');
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    /* wa.me resolves in a browser when WhatsApp is not installed, so there is
       always something to fall back to. */
    Linking.openURL(canOpen ? url : `https://wa.me/${CONTACT.whatsappNumber}`).catch(() => {});
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => setOpen(false)}
    >
      <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)} />
      <View className="bg-white rounded-t-2xl overflow-hidden" style={{ paddingBottom: insets.bottom }}>
        <View className="flex-row items-center gap-3 px-4 py-3" style={{ backgroundColor: colors.whatsappDark }}>
          <View className="w-9 h-9 rounded-full bg-white/20 overflow-hidden items-center justify-center">
            <Image source={AVATAR} className="w-6 h-6" resizeMode="contain" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-smd">Paicart Support</Text>
            <Text className="text-white/70 text-2xs">Typically replies within minutes</Text>
          </View>
          <Pressable onPress={() => setOpen(false)} hitSlop={8}>
            <X size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        <View className="px-4 py-5" style={{ backgroundColor: colors.whatsappBg }}>
          <View className="bg-white rounded-lg rounded-tl-none px-3 py-2.5 self-start max-w-[85%]">
            <Text className="text-smd text-foreground">{GREETING}</Text>
          </View>
        </View>

        <View
          className="flex-row items-center gap-2 px-3 py-3"
          style={{ backgroundColor: colors.whatsappInput }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            placeholderTextColor="#9ca3af"
            className="flex-1 bg-white rounded-full px-4 py-2.5 text-smd text-foreground"
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            className="w-11 h-11 rounded-full items-center justify-center active:opacity-80"
            style={{ backgroundColor: colors.whatsapp }}
          >
            <Send size={18} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
