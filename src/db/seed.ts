import * as Crypto from 'expo-crypto';
import { getDb } from './index';
import type { PoleType } from '../types';

interface SeedTrick {
  name: string;
  poleType: PoleType;
  difficulty: number;
  hasSides: boolean;
  tags: string[];
  referenceVideoUrl?: string;
}

const SEED_TRICKS: SeedTrick[] = [
  // From the brief
  {
    name: 'Ayesha',
    poleType: 'both',
    difficulty: 5,
    hasSides: true,
    tags: ['twisted grip', 'cup grip', 'elbow grip', 'strength'],
  },
  {
    name: 'Elbow Ayesha',
    poleType: 'both',
    difficulty: 5,
    hasSides: true,
    tags: ['elbow grip', 'strength'],
  },
  {
    name: 'Jade Split',
    poleType: 'both',
    difficulty: 4,
    hasSides: true,
    tags: ['flexibility', 'splits', 'strength'],
  },
  {
    name: 'Allegra',
    poleType: 'both',
    difficulty: 5,
    hasSides: true,
    tags: ['flexibility', 'splits', 'strength'],
  },
  {
    name: 'Extended Allegra',
    poleType: 'both',
    difficulty: 5,
    hasSides: true,
    tags: ['flexibility', 'splits', 'strength'],
  },
  {
    name: 'Superman',
    poleType: 'both',
    difficulty: 3,
    hasSides: true,
    tags: ['strength', 'dynamic'],
  },
  {
    name: 'Titanic',
    poleType: 'both',
    difficulty: 4,
    hasSides: true,
    tags: ['strength', 'flexibility'],
  },
  {
    name: 'Broken Doll',
    poleType: 'both',
    difficulty: 4,
    hasSides: true,
    tags: ['flexibility'],
  },
  {
    name: 'Janeiro',
    poleType: 'both',
    difficulty: 3,
    hasSides: true,
    tags: ['strength'],
  },
  {
    name: 'Holly Drop',
    poleType: 'both',
    difficulty: 4,
    hasSides: true,
    tags: ['dynamic', 'strength'],
  },
  {
    name: 'Straight Leg Invert (from ground)',
    poleType: 'both',
    difficulty: 3,
    hasSides: true,
    tags: ['strength', 'inversions'],
  },
  {
    name: 'Straight Leg Aerial Invert (spinning forward)',
    poleType: 'spin_only',
    difficulty: 4,
    hasSides: true,
    tags: ['strength', 'inversions', 'dynamic'],
  },
  // Extended library
  {
    name: 'Brass Monkey',
    poleType: 'both',
    difficulty: 4,
    hasSides: true,
    tags: ['knee grip', 'strength', 'inversions'],
  },
  {
    name: 'Chopper',
    poleType: 'both',
    difficulty: 3,
    hasSides: true,
    tags: ['strength', 'inversions'],
  },
  {
    name: 'Chair Spin',
    poleType: 'static_only',
    difficulty: 1,
    hasSides: true,
    tags: ['dynamic'],
  },
  {
    name: 'Fireman Spin',
    poleType: 'static_only',
    difficulty: 1,
    hasSides: false,
    tags: ['dynamic'],
  },
  {
    name: 'Back Hook Spin',
    poleType: 'static_only',
    difficulty: 2,
    hasSides: true,
    tags: ['dynamic', 'knee grip'],
  },
  {
    name: 'Pole Climb',
    poleType: 'both',
    difficulty: 2,
    hasSides: false,
    tags: ['strength'],
  },
  {
    name: 'Pencil Spin',
    poleType: 'spin_only',
    difficulty: 1,
    hasSides: false,
    tags: ['dynamic'],
  },
  {
    name: 'Cross Knee Release',
    poleType: 'both',
    difficulty: 3,
    hasSides: true,
    tags: ['knee grip', 'flexibility', 'dynamic'],
  },
  {
    name: 'Cross Knee Layback',
    poleType: 'both',
    difficulty: 3,
    hasSides: true,
    tags: ['knee grip', 'flexibility'],
  },
  {
    name: 'Phoenix',
    poleType: 'static_only',
    difficulty: 4,
    hasSides: true,
    tags: ['knee grip', 'flexibility', 'splits'],
  },
  {
    name: 'Hello Boys',
    poleType: 'both',
    difficulty: 3,
    hasSides: true,
    tags: ['flexibility', 'strength'],
  },
  {
    name: 'Gemini',
    poleType: 'both',
    difficulty: 3,
    hasSides: true,
    tags: ['knee grip', 'strength'],
  },
  {
    name: 'Scorpio',
    poleType: 'both',
    difficulty: 3,
    hasSides: true,
    tags: ['knee grip', 'strength'],
  },
  {
    name: 'Straddle Invert',
    poleType: 'both',
    difficulty: 3,
    hasSides: false,
    tags: ['strength', 'inversions'],
  },
  {
    name: 'Flatline Scorpio',
    poleType: 'both',
    difficulty: 4,
    hasSides: true,
    tags: ['knee grip', 'strength', 'flexibility'],
  },
  {
    name: 'Hip Hold',
    poleType: 'both',
    difficulty: 4,
    hasSides: true,
    tags: ['strength'],
  },
  {
    name: 'Butterfly',
    poleType: 'both',
    difficulty: 4,
    hasSides: true,
    tags: ['knee grip', 'strength', 'flexibility'],
  },
  {
    name: 'Iguana',
    poleType: 'both',
    difficulty: 4,
    hasSides: true,
    tags: ['elbow grip', 'strength'],
  },
  {
    name: 'Apprentice',
    poleType: 'both',
    difficulty: 2,
    hasSides: true,
    tags: ['knee grip', 'strength'],
  },
  {
    name: 'Marion Amber',
    poleType: 'static_only',
    difficulty: 5,
    hasSides: true,
    tags: ['split grip', 'flexibility', 'splits', 'strength'],
  },
];

export function seedTricks(): void {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tricks WHERE isCustom = 0'
  );
  if (row && row.count > 0) return;

  const stmt = db.prepareSync(
    `INSERT INTO tricks (id, name, poleType, difficulty, diagramUrl, referenceVideoUrl, tags, hasSides, isCustom, prerequisiteIds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, '[]')`
  );

  try {
    for (const trick of SEED_TRICKS) {
      stmt.executeSync([
        Crypto.randomUUID(),
        trick.name,
        trick.poleType,
        trick.difficulty,
        null,
        trick.referenceVideoUrl ?? null,
        JSON.stringify(trick.tags),
        trick.hasSides ? 1 : 0,
      ]);
    }
  } finally {
    stmt.finalizeSync();
  }
}
