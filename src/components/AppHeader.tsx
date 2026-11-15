import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';
import { LiftmarkIcon } from './brand/LiftmarkIcon';
import { Text } from './ui';

/** Brand header for the Today screen: icon, wordmark and tagline. */
export function AppHeader() {
  return (
    <View style={styles.row} accessibilityRole="header" accessible accessibilityLabel="Liftmark, your progress partner">
      <LiftmarkIcon size={48} />
      <View style={styles.titles}>
        <Text style={styles.wordmark} numberOfLines={1}>
          Liftmark<Text style={styles.dot}>.</Text>
        </Text>
        <Text variant="caption" style={styles.tagline}>
          YOUR PROGRESS PARTNER
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm },
  titles: { flex: 1, gap: 2 },
  wordmark: { color: colors.chalk, fontSize: 30, fontWeight: '700', letterSpacing: -1.2, lineHeight: 32 },
  dot: { color: colors.volt, fontSize: 30, fontWeight: '700' },
  tagline: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4, fontSize: 11 },
});
