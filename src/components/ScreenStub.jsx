import React from 'react';
import { View, Text, ScrollView } from 'react-native';

/* Placeholder for a route whose real screen has not been ported yet. It exists
   so the navigator, the tab bar and every deep link are wired up and walkable
   from the first day, instead of the whole shell only becoming testable once
   the last screen lands. Each migration phase replaces these with the real
   thing; when none are left, the port is done. */
export default function ScreenStub({ name, route }) {
  const params = route?.params;
  return (
    <ScrollView contentContainerClassName="flex-grow items-center justify-center p-6">
      <View className="items-center">
        <Text className="text-primary text-lg font-bold">{name}</Text>
        <Text className="text-foreground/50 text-xs mt-2">Not ported yet</Text>
        {params && Object.keys(params).length > 0 && (
          <Text className="text-foreground/40 text-xxs mt-3">
            {JSON.stringify(params)}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
