import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import colors from '@/theme/colors';

/* Renders one of the extracted legal documents. The web drew each of these as
   a bespoke page; they only ever differed in their content, so there is one
   renderer and the copy lives in data/legalContent.js. */
export default function ContentPage({ doc, children }) {
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <View className="flex-1">
          <Text className="text-md font-bold text-foreground">{doc?.title}</Text>
          {!!doc?.subtitle && <Text className="text-2xs text-gray-400">{doc.subtitle}</Text>}
        </View>
      </View>

      <ScrollView contentContainerClassName="p-3 pb-10">
        {children}

        {(doc?.sections || []).map((section, i) => (
          <View
            key={`${section.title}-${i}`}
            className="bg-white rounded-2xl border border-gray-100 mb-3 overflow-hidden"
          >
            <View className="h-0.5" style={{ backgroundColor: section.color }} />
            <View className="px-4 py-3 border-b border-gray-50">
              <Text className="text-smd font-bold text-foreground">{section.title}</Text>
            </View>
            <View className="px-4 py-3">
              {section.body.map((b, n) =>
                b.type === 'item' ? (
                  <View key={n} className="flex-row gap-2.5 py-1.5">
                    {!!b.n && (
                      <View
                        className="w-6 h-6 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${section.color}18` }}
                      >
                        <Text className="text-2xs font-bold" style={{ color: section.color }}>
                          {b.n}
                        </Text>
                      </View>
                    )}
                    <Text className="flex-1 text-smd text-gray-600 leading-relaxed">{b.text}</Text>
                  </View>
                ) : (
                  <Text key={n} className="text-smd text-gray-600 leading-relaxed py-1">
                    {b.text}
                  </Text>
                ),
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
