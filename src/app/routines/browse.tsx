import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { FadeIn } from '@/components/motion/FadeIn';
import { SplitCard } from '@/components/routines/SplitCard';
import { Screen, Text } from '@/components/ui';
import { createBlankRoutine } from '@/db/routines';
import { SPLIT_PRESETS } from '@/features/routines/presets';
import { colors, radius, space } from '@/theme/tokens';

export default function BrowseSplitsScreen() {
  const createBlank = async () => {
    const id = await createBlankRoutine();
    router.replace({ pathname: '/routines/[id]', params: { id: String(id) } });
  };

  return (
    <Screen edges={[]}>
      <FadeIn>
        <Text variant="label">
          Pick a proven split to start from. It gets copied into your routines, so you can change anything.
        </Text>
      </FadeIn>

      {SPLIT_PRESETS.map((preset, i) => (
        <FadeIn key={preset.key} delay={60 + i * 60}>
          <SplitCard preset={preset} />
        </FadeIn>
      ))}

      <FadeIn delay={60 + SPLIT_PRESETS.length * 60}>
        <Pressable accessibilityRole="button" onPress={createBlank} style={styles.blank}>
          <Ionicons name="create-outline" size={20} color={colors.chalk} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700' }}>Build your own</Text>
            <Text variant="caption">Start from a blank routine</Text>
          </View>
        </Pressable>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
});
