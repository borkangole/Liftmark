import type { FoodGlyph } from '@/components/food/glyphs';
import type { FoodGroup } from './foods';

/** Built-in food → glyph. */
const BY_KEY: Record<string, FoodGlyph> = {
  egg: 'egg',
  'egg-whites': 'egg',
  'chicken-breast': 'drumstick',
  'chicken-thigh': 'drumstick',
  'chicken-adobo': 'drumstick',
  'fried-chicken': 'drumstick',
  'tuna-can': 'fish',
  tilapia: 'fish',
  bangus: 'fish',
  salmon: 'fish',
  shrimp: 'shrimp',
  'pork-loin': 'steak',
  'beef-sirloin': 'steak',
  'ground-beef': 'steak',
  'pork-adobo': 'steak',
  'lechon-kawali': 'steak',
  tofu: 'cube',
  'greek-yogurt': 'yogurt',
  'cottage-cheese': 'yogurt',
  whey: 'shaker',
  'milk-whole': 'carton',
  'milk-skim': 'carton',
  cheddar: 'cheese',
  'rice-white': 'rice',
  'rice-brown': 'rice',
  sinangag: 'rice',
  pandesal: 'bread',
  'bread-wheat': 'bread',
  'bread-white': 'bread',
  oats: 'grain',
  pasta: 'noodles',
  pancit: 'noodles',
  'noodles-instant': 'noodles',
  potato: 'potato',
  kamote: 'potato',
  tortilla: 'roll',
  lumpia: 'roll',
  turon: 'roll',
  banana: 'banana',
  apple: 'fruit',
  orange: 'fruit',
  mango: 'fruit',
  broccoli: 'leaf',
  kangkong: 'leaf',
  sitaw: 'leaf',
  salad: 'leaf',
  'peanut-butter': 'jar',
  almonds: 'nut',
  avocado: 'avocado',
  oil: 'drop',
  butter: 'drop',
  sinigang: 'soup',
  tinola: 'soup',
  tapsilog: 'plate',
  siopao: 'bun',
  'coffee-black': 'mug',
  'coffee-3in1': 'mug',
  soda: 'can',
  beer: 'can',
  'protein-bar': 'bar',
};

/** Words in a food's name → glyph, for the user's own foods. First match wins. */
const BY_WORD: [RegExp, FoodGlyph][] = [
  [/egg/, 'egg'],
  [/chicken|manok|drumstick|wing/, 'drumstick'],
  [/shrimp|prawn|hipon/, 'shrimp'],
  [/fish|tuna|salmon|tilapia|bangus|sardine|isda|tuyo|galunggong/, 'fish'],
  [/beef|pork|steak|meat|baboy|liempo|longganisa|tocino|tapa|ham|bacon|sausage|hotdog/, 'steak'],
  [/tofu|tokwa/, 'cube'],
  [/whey|shake|protein powder/, 'shaker'],
  [/protein bar|bar\b|granola bar/, 'bar'],
  [/yogurt|yoghurt|cottage/, 'yogurt'],
  [/milk|gatas/, 'carton'],
  [/cheese|keso/, 'cheese'],
  [/soup|sinigang|tinola|nilaga|bulalo|lugaw|arroz caldo|goto|sabaw/, 'soup'],
  [/noodle|pasta|pancit|ramen|spaghetti|mami|bihon|canton/, 'noodles'],
  [/rice|kanin|sinangag|silog/, 'rice'],
  [/bread|pandesal|toast|loaf|bagel|ensaymada/, 'bread'],
  [/oat|cereal|granola|wheat|grain/, 'grain'],
  [/potato|kamote|fries|cassava|kamoteng/, 'potato'],
  [/lumpia|wrap|roll|burrito|turon|shawarma/, 'roll'],
  [/siopao|bun|burger|dumpling|siomai/, 'bun'],
  [/banana|saging|saba/, 'banana'],
  [/avocado/, 'avocado'],
  [/apple|orange|mango|fruit|grape|melon|papaya|pineapple|berry/, 'fruit'],
  [/salad|veg|broccoli|kangkong|sitaw|pechay|malunggay|cabbage|spinach|leaf/, 'leaf'],
  [/peanut butter|jam|spread|nutella/, 'jar'],
  [/nut|almond|cashew|mani|seed/, 'nut'],
  [/oil|butter|mayo|margarine/, 'drop'],
  [/coffee|kape|tea|latte|cappuccino|chocolate drink|milo/, 'mug'],
  [/soda|coke|cola|beer|juice|drink|energy|sprite|royal/, 'can'],
];

const BY_GROUP: Record<FoodGroup, FoodGlyph> = {
  protein: 'steak',
  dairy: 'carton',
  carbs: 'rice',
  fruit_veg: 'leaf',
  fats: 'drop',
  dishes: 'plate',
  drinks: 'mug',
  snacks: 'bar',
};

/**
 * The glyph for a food: its own for built-in foods (or the one it's a version of), a guess from the
 * name for the user's own foods, then its group, then a plate. Quick adds get a bolt.
 */
export function glyphFor(food: {
  key?: string | null;
  foodKey?: string | null;
  baseKey?: string | null;
  name: string;
  group?: FoodGroup;
}): FoodGlyph {
  const key = food.baseKey ?? food.key ?? food.foodKey ?? null;
  if (key?.startsWith('b:')) {
    const g = BY_KEY[key.slice(2)];
    if (g) return g;
  }
  const name = food.name.toLowerCase();
  if (!key && (name === 'quick add' || name === 'a quick add')) return 'bolt';
  for (const [re, g] of BY_WORD) if (re.test(name)) return g;
  if (food.group && key?.startsWith('b:')) return BY_GROUP[food.group];
  return key ? 'plate' : 'bolt';
}
