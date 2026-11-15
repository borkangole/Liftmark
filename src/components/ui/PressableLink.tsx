import { useRouter, type Href } from 'expo-router';
import { Pressable, type PressableProps } from 'react-native';

type Props = Omit<PressableProps, 'onPress'> & { href: Href; onPress?: () => void };

/**
 * A pressable card that navigates. `<Link asChild>` drops a Pressable's style *function*
 * (pressed state), which collapsed whole card layouts — this keeps the style intact.
 */
export function PressableLink({ href, onPress, accessibilityRole = 'link', ...rest }: Props) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      onPress={() => {
        onPress?.();
        router.push(href);
      }}
      {...rest}
    />
  );
}
