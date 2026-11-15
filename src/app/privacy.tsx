import { Linking, StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from '@/features/legal/privacy';
import { colors, radius, space } from '@/theme/tokens';

const ISSUES_URL = 'https://github.com/borkangole/Repster---Your-progress-partner/issues';

export default function PrivacyScreen() {
  return (
    <Screen edges={['bottom']}>
      <View style={styles.wrap}>
        <Text variant="display" style={styles.title}>
          Privacy
        </Text>
        <Text variant="caption">Last updated {PRIVACY_UPDATED}</Text>
        {PRIVACY_SECTIONS.map((s, i) => (
          <View key={s.title} style={[styles.section, i === 0 && styles.lead]}>
            <Text variant="title" style={styles.heading}>
              {s.title}
            </Text>
            {s.body.map((p, j) => (
              <Text key={j} style={styles.para}>
                {p}
              </Text>
            ))}
          </View>
        ))}
        <Text
          accent
          accessibilityRole="link"
          style={styles.link}
          onPress={() => Linking.openURL(ISSUES_URL)}
        >
          Contact via GitHub
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: space.lg, gap: space.sm },
  title: { fontSize: 34 },
  section: { marginTop: space.md, gap: space.xs },
  lead: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md },
  heading: { fontSize: 17 },
  para: { lineHeight: 22, color: colors.muted },
  link: { marginTop: space.lg, fontWeight: '700' },
});
