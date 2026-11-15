export type Sex = 'male' | 'female' | 'unspecified';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'strength' | 'muscle' | 'general' | 'fat_loss';

export interface Profile {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  level: Level;
  goal: Goal;
  daysPerWeek: number; // 2–6
}
