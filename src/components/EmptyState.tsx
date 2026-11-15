import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { Text } from './ui';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.wrap}>
      <Text variant="title">{title}</Text>
      <Text variant="label" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: space.xxl, gap: space.sm },
  message: { textAlign: 'center' },
});
