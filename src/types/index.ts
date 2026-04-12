export type PoleType = 'both' | 'static_only' | 'spin_only';
export type TrickStatus = 'learning' | 'got_it' | 'polishing' | null;
export type SessionSide = 'left' | 'right' | 'both' | 'none';

export const PREDEFINED_TAGS = [
  'twisted grip',
  'cup grip',
  'split grip',
  'elbow grip',
  'knee grip',
  'splits',
  'flexibility',
  'strength',
  'dynamic',
  'inversions',
] as const;

export type TrickTag = (typeof PREDEFINED_TAGS)[number];

export interface Trick {
  id: string;
  name: string;
  poleType: PoleType;
  difficulty: number; // 1–5
  diagramUrl: string | null;
  referenceVideoUrl: string | null;
  tags: string[];
  hasSides: boolean;
  isCustom: boolean;
  prerequisiteIds: string[];
}

export interface UserTrick {
  id: string;
  trickId: string;
  status_left: TrickStatus;
  status_right: TrickStatus;
  status: TrickStatus; // used when hasSides=false
  notes_left: string | null;
  notes_right: string | null;
  lastPracticed_left: string | null; // ISO date
  lastPracticed_right: string | null; // ISO date
}

export interface TrainingSession {
  id: string;
  date: string; // ISO date
  notes: string | null;
}

export interface SessionTrick {
  id: string;
  sessionId: string;
  trickId: string;
  side: SessionSide;
}

export interface Video {
  id: string;
  localUri: string;
  trickId: string | null;
  sessionId: string | null;
  notes: string | null;
  createdAt: string; // ISO datetime
}
