import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import colors from '@/theme/colors';

/* An optional bold "Label: " lead-in, as the web pages draw it */
function LabelledText({ label, text }) {
  return (
    <Text className="text-smd text-gray-600 leading-relaxed">
      {!!label && <Text className="font-bold text-foreground">{label}: </Text>}
      {text}
    </Text>
  );
}

function Bullet({ color, label, text }) {
  return (
    <View className="flex-row gap-2.5 py-1">
      <View className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: color }} />
      <View className="flex-1">
        <LabelledText label={label} text={text} />
      </View>
    </View>
  );
}

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

        {!!doc?.intro && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
            <Text className="text-smd text-amber-800 leading-relaxed">{doc.intro}</Text>
          </View>
        )}

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
                    <View className="flex-1">
                      <LabelledText label={b.label} text={b.text} />
                      {(b.sub || []).map((s, k) => (
                        <Bullet key={k} color={section.color} label={s.label} text={s.text} />
                      ))}
                    </View>
                  </View>
                ) : b.type === 'bullet' ? (
                  <Bullet key={n} color={section.color} label={b.label} text={b.text} />
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
