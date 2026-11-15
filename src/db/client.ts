import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// File name predates the Liftmark rename; kept so existing workouts aren't lost.
export const DATABASE_NAME = 'repster.db';

const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });
export type Db = typeof db;
