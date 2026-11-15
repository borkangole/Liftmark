import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { FIX_INFO } from '@/features/progression';
import { usePlateaus } from '@/stores/usePlateaus';
import { colors, radius, space } from '@/theme/tokens';

/** "Plateau broken": shown once after a fix leads to a new best. */
export function PlateauBroken() {
  const e = usePlateaus((s) => s.justBroken);
  const clear = usePlateaus((s) => s.clearJustBroken);
  if (!e) return null;
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.icon}>
        <Ionicons name="trophy" size={20} color={colors.voltInk} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" style={styles.kicker}>
          PLATEAU BROKEN
        </Text>
        <Text style={{ color: colors.chalk, fontWeight: '800' }}>{e.name}: new best</Text>
        <Text variant="caption">
          {FIX_INFO[e.fix].short} worked in {e.sessions} session{e.sessions === 1 ? '' : 's'}. Liftmark will suggest it
          first next time.
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={clear} hitSlop={10}>
        <Ionicons name="close" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.voltSoft,
    borderWidth: 1,
    borderColor: colors.volt,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { color: colors.volt, fontWeight: '800', letterSpacing: 1.2 },
});
