/**
 * Tests for the library filter logic (extracted so it can be tested without React).
 * Mirrors the filter in app/(tabs)/library.tsx.
 */
import type { Trick, UserTrick, TrickStatus } from '../src/types';
import type { StatusFilter } from '../src/components/FilterBar';

type FilterParams = {
  search: string;
  selectedPoleTypes: string[];
  selectedDifficulties: number[];
  selectedTags: string[];
  selectedStatuses: StatusFilter[];
};

function applyFilter(tricks: Trick[], userTricks: UserTrick[], params: FilterParams): Trick[] {
  const { search, selectedPoleTypes, selectedDifficulties, selectedTags, selectedStatuses } = params;
  return tricks.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedPoleTypes.length > 0 && !selectedPoleTypes.includes(t.poleType)) return false;
    if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(t.difficulty)) return false;
    if (selectedTags.length > 0 && !selectedTags.every((tag) => t.tags.includes(tag))) return false;
    if (selectedStatuses.length > 0) {
      const ut = userTricks.find((u) => u.trickId === t.id);
      const statuses: TrickStatus[] = t.hasSides
        ? [ut?.status_left ?? null, ut?.status_right ?? null]
        : [ut?.status ?? null];
      const matchesStatus = selectedStatuses.some((sf) => {
        if (sf === 'never_tried') return statuses.every((s) => s === null);
        return statuses.some((s) => s === sf);
      });
      if (!matchesStatus) return false;
    }
    return true;
  });
}

const baseTrick = (overrides: Partial<Trick> = {}): Trick => ({
  id: 'trick-1',
  name: 'Ayesha',
  poleType: 'both',
  difficulty: 4,
  diagramUrl: null,
  referenceVideoUrl: null,
  tags: ['strength', 'inversions'],
  hasSides: true,
  isCustom: false,
  prerequisiteIds: [],
  ...overrides,
});

const baseUserTrick = (overrides: Partial<UserTrick> = {}): UserTrick => ({
  id: 'ut-1',
  trickId: 'trick-1',
  status_left: null,
  status_right: null,
  status: null,
  notes_left: null,
  notes_right: null,
  lastPracticed_left: null,
  lastPracticed_right: null,
  ...overrides,
});

const noFilters: FilterParams = {
  search: '',
  selectedPoleTypes: [],
  selectedDifficulties: [],
  selectedTags: [],
  selectedStatuses: [],
};

describe('search', () => {
  it('matches by name substring (case-insensitive)', () => {
    const tricks = [baseTrick({ name: 'Ayesha' }), baseTrick({ id: 'trick-2', name: 'Chopper' })];
    expect(applyFilter(tricks, [], { ...noFilters, search: 'aye' })).toHaveLength(1);
    expect(applyFilter(tricks, [], { ...noFilters, search: 'AYE' })).toHaveLength(1);
    expect(applyFilter(tricks, [], { ...noFilters, search: 'x' })).toHaveLength(0);
  });
});

describe('poleType filter', () => {
  it('filters by single pole type', () => {
    const tricks = [
      baseTrick({ id: '1', poleType: 'both' }),
      baseTrick({ id: '2', poleType: 'static_only' }),
      baseTrick({ id: '3', poleType: 'spin_only' }),
    ];
    expect(applyFilter(tricks, [], { ...noFilters, selectedPoleTypes: ['static_only'] })).toHaveLength(1);
  });

  it('filters by multiple pole types (OR)', () => {
    const tricks = [
      baseTrick({ id: '1', poleType: 'both' }),
      baseTrick({ id: '2', poleType: 'static_only' }),
      baseTrick({ id: '3', poleType: 'spin_only' }),
    ];
    const result = applyFilter(tricks, [], { ...noFilters, selectedPoleTypes: ['static_only', 'spin_only'] });
    expect(result).toHaveLength(2);
  });
});

describe('status filter', () => {
  it('never_tried — no userTrick', () => {
    const tricks = [baseTrick()];
    expect(applyFilter(tricks, [], { ...noFilters, selectedStatuses: ['never_tried'] })).toHaveLength(1);
  });

  it('never_tried — userTrick exists but all null', () => {
    const tricks = [baseTrick()];
    const uts = [baseUserTrick({ status_left: null, status_right: null })];
    expect(applyFilter(tricks, uts, { ...noFilters, selectedStatuses: ['never_tried'] })).toHaveLength(1);
  });

  it('never_tried excludes tricks with any status set', () => {
    const tricks = [baseTrick()];
    const uts = [baseUserTrick({ status_left: 'learning' })];
    expect(applyFilter(tricks, uts, { ...noFilters, selectedStatuses: ['never_tried'] })).toHaveLength(0);
  });

  it('learning matches trick with learning on either side', () => {
    const tricks = [baseTrick()];
    const uts = [baseUserTrick({ status_left: 'learning', status_right: null })];
    expect(applyFilter(tricks, uts, { ...noFilters, selectedStatuses: ['learning'] })).toHaveLength(1);
  });

  it('got_it matches no-side trick', () => {
    const tricks = [baseTrick({ hasSides: false })];
    const uts = [baseUserTrick({ status: 'got_it' })];
    expect(applyFilter(tricks, uts, { ...noFilters, selectedStatuses: ['got_it'] })).toHaveLength(1);
  });

  it('multiple statuses are OR', () => {
    const t1 = baseTrick({ id: '1' });
    const t2 = baseTrick({ id: '2' });
    const uts = [
      baseUserTrick({ id: 'u1', trickId: '1', status_left: 'learning' }),
      baseUserTrick({ id: 'u2', trickId: '2', status_left: 'got_it' }),
    ];
    const result = applyFilter([t1, t2], uts, { ...noFilters, selectedStatuses: ['learning', 'got_it'] });
    expect(result).toHaveLength(2);
  });
});

describe('tag filter', () => {
  it('requires all selected tags (AND)', () => {
    const tricks = [
      baseTrick({ id: '1', tags: ['strength', 'inversions'] }),
      baseTrick({ id: '2', tags: ['strength'] }),
    ];
    expect(applyFilter(tricks, [], { ...noFilters, selectedTags: ['strength', 'inversions'] })).toHaveLength(1);
    expect(applyFilter(tricks, [], { ...noFilters, selectedTags: ['strength'] })).toHaveLength(2);
  });
});
