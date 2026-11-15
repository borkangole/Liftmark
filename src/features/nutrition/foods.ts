/**
 * Liftmark's built-in food list: common foods with typical values per serving.
 *
 * Plain foods use USDA FoodData Central values (cooked weights where it says "cooked").
 * Filipino dishes are marked `estimate`: home recipes vary a lot, so they are typical servings,
 * rounded, and the app says so. Packaged foods differ by brand, so those ask the user to check
 * the label. Everything here is per one serving as written in `serving`.
 */

export type FoodGroup = 'protein' | 'carbs' | 'fruit_veg' | 'dairy' | 'fats' | 'dishes' | 'drinks' | 'snacks';
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export const GROUP_LABEL: Record<FoodGroup, string> = {
  protein: 'Meat, fish & eggs',
  carbs: 'Rice, bread & grains',
  fruit_veg: 'Fruit & vegetables',
  dairy: 'Dairy & protein',
  fats: 'Nuts, oils & spreads',
  dishes: 'Filipino dishes',
  drinks: 'Drinks',
  snacks: 'Snacks',
};

export interface FoodValues {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Food extends FoodValues {
  /** Stable id: `b:<key>` for built-in foods, `c:<id>` for the user's own. */
  key: string;
  name: string;
  /** One serving, as people measure it: "100 g", "1 large egg", "1 cup cooked". */
  serving: string;
  /** Grams in one serving, when the serving is a weight. Lets portions read "150 g". */
  grams?: number;
  group: FoodGroup;
  /** Meals it usually belongs to (suggestions prefer these). Empty = any. */
  meals?: Meal[];
  /** Values are a typical estimate (home-cooked dishes). */
  estimate?: boolean;
  /** Brand values differ: check the label. */
  checkLabel?: boolean;
  /** Most servings someone would eat in one go, so suggestions stay realistic. */
  maxServings?: number;
  /** An everyday staple (rice, chicken, eggs…): suggestions prefer it until the user's own favourites take over. */
  staple?: boolean;
  /** The user's own version of this built-in food (`b:<key>`), with their values. */
  baseKey?: string;
}

type Row = [
  key: string,
  name: string,
  serving: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  extra?: Partial<Pick<Food, 'grams' | 'meals' | 'estimate' | 'checkLabel' | 'maxServings' | 'staple'>>,
];

const MAIN: Meal[] = ['lunch', 'dinner'];
const MORNING: Meal[] = ['breakfast', 'snack'];

const ROWS: Record<FoodGroup, Row[]> = {
  protein: [
    [
      'chicken-breast',
      'Chicken breast, cooked',
      '100 g',
      165,
      31,
      0,
      3.6,
      { staple: true, grams: 100, meals: MAIN, maxServings: 2.5 },
    ],
    [
      'chicken-thigh',
      'Chicken thigh, cooked, no skin',
      '100 g',
      209,
      26,
      0,
      10.9,
      { grams: 100, meals: MAIN, maxServings: 2.5 },
    ],
    [
      'egg',
      'Egg',
      '1 large egg',
      72,
      6.3,
      0.4,
      4.8,
      { staple: true, meals: ['breakfast', 'lunch', 'dinner', 'snack'], maxServings: 4 },
    ],
    ['egg-whites', 'Egg whites', '3 large whites', 51, 10.8, 0.7, 0.2, { meals: ['breakfast'], maxServings: 3 }],
    [
      'tuna-can',
      'Tuna in water, drained',
      '100 g',
      116,
      25.5,
      0,
      0.8,
      { staple: true, grams: 100, meals: ['lunch', 'dinner', 'snack'], maxServings: 2 },
    ],
    [
      'tilapia',
      'Tilapia, cooked',
      '100 g',
      128,
      26,
      0,
      2.7,
      { staple: true, grams: 100, meals: MAIN, maxServings: 2.5 },
    ],
    [
      'bangus',
      'Bangus (milkfish), grilled',
      '100 g',
      190,
      26,
      0,
      8.6,
      { staple: true, grams: 100, meals: MAIN, maxServings: 2 },
    ],
    ['salmon', 'Salmon, cooked', '100 g', 206, 22, 0, 12.4, { grams: 100, meals: MAIN, maxServings: 2 }],
    ['shrimp', 'Shrimp, cooked', '100 g', 99, 24, 0.2, 0.3, { grams: 100, meals: MAIN, maxServings: 2.5 }],
    ['pork-loin', 'Pork loin, lean, cooked', '100 g', 206, 29, 0, 9, { grams: 100, meals: MAIN, maxServings: 2 }],
    [
      'beef-sirloin',
      'Beef sirloin, lean, cooked',
      '100 g',
      180,
      30,
      0,
      6,
      { grams: 100, meals: MAIN, maxServings: 2.5 },
    ],
    [
      'ground-beef',
      'Ground beef 90% lean, cooked',
      '100 g',
      217,
      26,
      0,
      11.8,
      { grams: 100, meals: MAIN, maxServings: 2 },
    ],
    ['tofu', 'Tofu, firm', '100 g', 144, 17.3, 2.8, 8.7, { grams: 100, meals: MAIN, maxServings: 2.5 }],
  ],
  dairy: [
    [
      'greek-yogurt',
      'Greek yogurt, plain nonfat',
      '170 g cup',
      100,
      17.3,
      6.1,
      0.7,
      { staple: true, grams: 170, meals: MORNING, maxServings: 2 },
    ],
    [
      'whey',
      'Whey protein',
      '1 scoop (30 g)',
      120,
      24,
      3,
      1.5,
      { meals: ['breakfast', 'snack'], checkLabel: true, maxServings: 2 },
    ],
    [
      'cottage-cheese',
      'Cottage cheese, 1% fat',
      '1 cup (226 g)',
      163,
      28,
      6.1,
      2.3,
      { meals: MORNING, maxServings: 1.5 },
    ],
    ['milk-whole', 'Milk, whole', '1 cup (240 ml)', 149, 7.7, 11.7, 7.9, { meals: MORNING, maxServings: 2 }],
    ['milk-skim', 'Milk, skim', '1 cup (240 ml)', 83, 8.3, 12.2, 0.2, { meals: MORNING, maxServings: 2 }],
    ['cheddar', 'Cheddar cheese', '1 slice (28 g)', 113, 6.4, 0.9, 9.3, { grams: 28, maxServings: 3 }],
  ],
  carbs: [
    [
      'rice-white',
      'White rice, cooked',
      '1 cup (158 g)',
      205,
      4.3,
      44.5,
      0.4,
      { staple: true, grams: 158, meals: MAIN, maxServings: 2.5 },
    ],
    [
      'rice-brown',
      'Brown rice, cooked',
      '1 cup (195 g)',
      216,
      5,
      45,
      1.8,
      { staple: true, grams: 195, meals: MAIN, maxServings: 2 },
    ],
    [
      'sinangag',
      'Garlic rice (sinangag)',
      '1 cup',
      250,
      4.5,
      45,
      5,
      { meals: ['breakfast', 'lunch', 'dinner'], estimate: true, maxServings: 2 },
    ],
    [
      'pandesal',
      'Pandesal',
      '1 piece (30 g)',
      90,
      2.6,
      16,
      1.5,
      { staple: true, grams: 30, meals: MORNING, maxServings: 4 },
    ],
    ['bread-wheat', 'Whole-wheat bread', '1 slice', 81, 4, 13.8, 1.1, { meals: MORNING, maxServings: 4 }],
    ['bread-white', 'White bread', '1 slice', 67, 2.3, 12.7, 0.8, { meals: MORNING, maxServings: 4 }],
    [
      'oats',
      'Rolled oats, dry',
      '40 g (½ cup)',
      152,
      5.3,
      27,
      2.6,
      { staple: true, grams: 40, meals: ['breakfast'], maxServings: 2 },
    ],
    ['pasta', 'Pasta, cooked', '1 cup (140 g)', 221, 8.1, 43.2, 1.3, { grams: 140, meals: MAIN, maxServings: 2 }],
    [
      'potato',
      'Potato, baked with skin',
      '1 medium (173 g)',
      161,
      4.3,
      36.6,
      0.2,
      { grams: 173, meals: MAIN, maxServings: 2 },
    ],
    [
      'kamote',
      'Sweet potato (kamote), baked',
      '1 medium (114 g)',
      103,
      2.3,
      23.6,
      0.2,
      { staple: true, grams: 114, maxServings: 2 },
    ],
    ['tortilla', 'Flour tortilla wrap', '1 wrap (45 g)', 140, 3.7, 23.6, 3.5, { grams: 45, maxServings: 2 }],
    ['noodles-instant', 'Instant noodles', '1 pack (~70 g dry)', 330, 7, 45, 14, { checkLabel: true, maxServings: 1 }],
  ],
  fruit_veg: [
    ['banana', 'Banana', '1 medium', 105, 1.3, 27, 0.4, { staple: true, meals: MORNING, maxServings: 2 }],
    ['apple', 'Apple', '1 medium', 95, 0.5, 25, 0.3, { meals: ['snack'], maxServings: 2 }],
    [
      'mango',
      'Mango, ripe',
      '1 cup sliced (165 g)',
      99,
      1.4,
      24.7,
      0.6,
      { grams: 165, meals: MORNING, maxServings: 2 },
    ],
    ['orange', 'Orange', '1 medium', 62, 1.2, 15.4, 0.2, { meals: ['snack'], maxServings: 2 }],
    ['broccoli', 'Broccoli, cooked', '1 cup (156 g)', 55, 3.7, 11.2, 0.6, { grams: 156, meals: MAIN, maxServings: 2 }],
    [
      'kangkong',
      'Kangkong (water spinach), cooked',
      '1 cup (100 g)',
      20,
      2.1,
      3.1,
      0.2,
      { grams: 100, meals: MAIN, maxServings: 2 },
    ],
    [
      'sitaw',
      'Sitaw (string beans), cooked',
      '1 cup (125 g)',
      44,
      2.4,
      9.9,
      0.4,
      { grams: 125, meals: MAIN, maxServings: 2 },
    ],
    ['salad', 'Green salad, no dressing', '2 cups', 15, 1.2, 2.9, 0.2, { meals: MAIN, maxServings: 2 }],
  ],
  fats: [
    [
      'peanut-butter',
      'Peanut butter',
      '1 tbsp (16 g)',
      94,
      4,
      3.2,
      8,
      { staple: true, grams: 16, meals: MORNING, maxServings: 2 },
    ],
    [
      'almonds',
      'Almonds',
      '28 g (a handful)',
      164,
      6,
      6.1,
      14.2,
      { staple: true, grams: 28, meals: ['snack'], maxServings: 1.5 },
    ],
    ['avocado', 'Avocado', '½ fruit (100 g)', 160, 2, 8.5, 14.7, { staple: true, grams: 100, maxServings: 2 }],
    ['oil', 'Cooking or olive oil', '1 tbsp', 120, 0, 0, 13.6, { maxServings: 2 }],
    ['butter', 'Butter', '1 tbsp (14 g)', 102, 0.1, 0, 11.5, { grams: 14, maxServings: 2 }],
  ],
  dishes: [
    [
      'chicken-adobo',
      'Chicken adobo',
      '1 thigh with sauce',
      320,
      27,
      4,
      22,
      { meals: MAIN, estimate: true, maxServings: 2 },
    ],
    ['pork-adobo', 'Pork adobo', '1 cup (~150 g)', 450, 26, 4, 37, { meals: MAIN, estimate: true, maxServings: 1.5 }],
    ['sinigang', 'Sinigang na baboy', '1 bowl', 290, 22, 10, 18, { meals: MAIN, estimate: true, maxServings: 2 }],
    ['tinola', 'Tinolang manok', '1 bowl', 230, 24, 8, 11, { meals: MAIN, estimate: true, maxServings: 2 }],
    [
      'pancit',
      'Pancit bihon or canton',
      '1 cup',
      260,
      10,
      40,
      7,
      { meals: ['lunch', 'dinner', 'snack'], estimate: true, maxServings: 2 },
    ],
    ['lumpia', 'Lumpiang shanghai', '5 pieces', 300, 12, 20, 19, { estimate: true, maxServings: 2 }],
    [
      'tapsilog',
      'Tapsilog (tapa, garlic rice, egg)',
      '1 plate',
      740,
      40,
      70,
      33,
      { meals: ['breakfast', 'lunch'], estimate: true, maxServings: 1 },
    ],
    [
      'lechon-kawali',
      'Lechon kawali',
      '100 g',
      450,
      20,
      0,
      41,
      { grams: 100, meals: MAIN, estimate: true, maxServings: 1.5 },
    ],
    [
      'fried-chicken',
      'Fried chicken, breaded',
      '1 thigh',
      330,
      23,
      10,
      22,
      { meals: MAIN, estimate: true, maxServings: 2 },
    ],
    [
      'siopao',
      'Siopao asado',
      '1 piece',
      300,
      11,
      45,
      8,
      { meals: ['snack', 'breakfast'], estimate: true, maxServings: 2 },
    ],
    ['turon', 'Turon', '1 piece', 185, 1.5, 30, 6.5, { meals: ['snack'], estimate: true, maxServings: 2 }],
  ],
  drinks: [
    ['coffee-black', 'Coffee, black', '1 cup', 2, 0.3, 0, 0, { meals: MORNING, maxServings: 3 }],
    ['coffee-3in1', '3-in-1 coffee', '1 sachet', 90, 1, 14, 3.5, { meals: MORNING, checkLabel: true, maxServings: 2 }],
    ['soda', 'Soft drink, regular', '1 can (330 ml)', 139, 0, 35, 0, { maxServings: 2 }],
    ['beer', 'Beer, regular', '1 can (330 ml)', 145, 1.5, 12, 0, { checkLabel: true, maxServings: 3 }],
  ],
  snacks: [
    ['protein-bar', 'Protein bar', '1 bar', 200, 20, 22, 7, { meals: ['snack'], checkLabel: true, maxServings: 1 }],
  ],
};

/** Every built-in food, in display order. */
export const FOODS: Food[] = (Object.keys(ROWS) as FoodGroup[]).flatMap((group) =>
  ROWS[group].map(([key, name, serving, kcal, proteinG, carbsG, fatG, extra]) => ({
    key: `b:${key}`,
    name,
    serving,
    kcal,
    proteinG,
    carbsG,
    fatG,
    group,
    ...extra,
  })),
);

const BY_KEY = new Map(FOODS.map((f) => [f.key, f]));
export const builtInFood = (key: string): Food | undefined => BY_KEY.get(key);

/** Values for a number of servings. */
export function scale(v: FoodValues, servings: number): FoodValues {
  return {
    kcal: v.kcal * servings,
    proteinG: v.proteinG * servings,
    carbsG: v.carbsG * servings,
    fatG: v.fatG * servings,
  };
}

/** Smallest sensible portion step, in servings: weighed foods move 25 g at a time, bowls and cups by halves, counted things by one. */
export function servingStep(food: Pick<Food, 'serving' | 'grams'>): number {
  if (food.grams && /^\d+(\.\d+)?\s*g$/.test(food.serving.trim())) return 25 / food.grams;
  return food.grams || /cup|bowl/.test(food.serving) ? 0.5 : 1;
}

const trim = (n: number) => String(Number(n.toFixed(2)));

/** How much, in words: "150 g", "2 × 1 large egg", "1 cup (158 g)". */
export function portionLabel(food: { serving: string; grams?: number | null }, servings: number): string {
  if (servings === 1) return food.serving;
  const serving = food.serving.trim();
  const g = food.grams ? `${Math.round(food.grams * servings)} g` : null;
  if (g && /^\d+(\.\d+)?\s*g$/.test(serving)) return g;
  // Spoons, cups and bowls are how people measure those: "1.5 × cup". Other weighed foods read in grams.
  const plain = serving.replace(/\s*\(.*\)\s*$/, '').replace(/^1 /, '');
  if (/cup|bowl|tbsp|tsp|scoop|slice|piece|egg|can|pack|sachet|bar|thigh|plate/.test(plain) || !g)
    return `${trim(servings)} × ${plain}`;
  return g;
}

/** Energy implied by the macros (4/4/9). Used to warn when a typed food doesn't add up. */
export const kcalFromMacros = (v: Pick<FoodValues, 'proteinG' | 'carbsG' | 'fatG'>) =>
  v.proteinG * 4 + v.carbsG * 4 + v.fatG * 9;

/** Case- and accent-insensitive search over name and serving. Every word must match. */
export function searchFoods<T extends Pick<Food, 'name' | 'serving'>>(foods: T[], query: string): T[] {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return foods;
  return foods.filter((f) => {
    const hay = norm(`${f.name} ${f.serving}`);
    return words.every((w) => hay.includes(w));
  });
}
