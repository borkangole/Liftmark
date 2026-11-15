import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Stepper, Text } from '@/components/ui';
import { kcalFromMacros } from '@/features/nutrition/foods';
import { parseNumberInput } from '@/features/logging/prefill';
import { colors, radius, space } from '@/theme/tokens';

export interface MacroDraft {
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}

export const num = (s: string) => {
  const n = s.trim() === '' ? 0 : parseNumberInput(s);
  return n === null || n < 0 ? null : n;
};

/** A labelled text field in the app's style. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" style={styles.label}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoFocus={autoFocus}
        autoCorrect={false}
        style={[styles.input, Platform.OS === 'web' && ({ outlineWidth: 0 } as object)]}
      />
    </View>
  );
}

/** Calories plus protein, carbs and fat, with a check that the numbers add up. */
export function MacroFields({
  draft,
  onChange,
  macrosOptional,
  per,
}: {
  draft: MacroDraft;
  onChange: (d: MacroDraft) => void;
  macrosOptional?: boolean;
  /** Shown in each label, e.g. "per 100 g". */
  per?: string;
}) {
  const p = per ? ` ${per}` : '';
  const set = (k: keyof MacroDraft) => (v: string) => onChange({ ...draft, [k]: v });
  const kcal = num(draft.kcal) ?? 0;
  const implied = kcalFromMacros({
    proteinG: num(draft.protein) ?? 0,
    carbsG: num(draft.carbs) ?? 0,
    fatG: num(draft.fat) ?? 0,
  });
  const mismatch = kcal > 0 && implied > 0 && Math.abs(implied - kcal) > Math.max(25, kcal * 0.2);
  return (
    <View style={{ gap: space.md }}>
      <Stepper label={`Calories${p} (kcal)`} value={draft.kcal} onChange={set('kcal')} step={10} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Stepper
            label={`Protein${p} (g)${macrosOptional ? ', optional' : ''}`}
            value={draft.protein}
            onChange={set('protein')}
            step={1}
            decimal
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Stepper label={`Carbs${p} (g)`} value={draft.carbs} onChange={set('carbs')} step={1} decimal />
        </View>
        <View style={{ flex: 1 }}>
          <Stepper label={`Fat${p} (g)`} value={draft.fat} onChange={set('fat')} step={1} decimal />
        </View>
      </View>
      {mismatch && (
        <Text variant="caption" style={{ color: colors.warning }}>
          Those macros add up to about {Math.round(implied)} kcal, not {Math.round(kcal)}. Check the label (alcohol and
          fibre can explain a small gap).
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '700', letterSpacing: 1.1 },
  input: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    color: colors.chalk,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: space.md },
});
