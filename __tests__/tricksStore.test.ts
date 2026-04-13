beforeEach(() => {
  jest.resetModules();
});

function setup() {
  const { runMigrations } = require('../src/db/migrations');
  const { seedTricks } = require('../src/db/seed');
  runMigrations();
  seedTricks();
}

// Always returns fresh Zustand state (avoids stale snapshot after set() calls)
function state() {
  const { useTricksStore } = require('../src/stores/tricksStore');
  return useTricksStore.getState();
}

function loadedState() {
  state().load();
  return state();
}

describe('seed', () => {
  it('loads tricks after seed', () => {
    setup();
    const s = loadedState();
    expect(s.tricks.length).toBeGreaterThanOrEqual(25);
  });

  it('seedTricks is idempotent', () => {
    setup();
    const { seedTricks } = require('../src/db/seed');
    seedTricks(); // second call
    const s = loadedState();
    const count = s.tricks.filter((t: { isCustom: boolean }) => !t.isCustom).length;
    expect(count).toBe(s.tricks.length); // no duplicates
  });
});

describe('poleType corrections', () => {
  it('Back Hook Spin is static_only', () => {
    setup();
    const s = loadedState();
    const t = s.tricks.find((t: { name: string }) => t.name === 'Back Hook Spin');
    expect(t?.poleType).toBe('static_only');
  });

  it('Phoenix is static_only', () => {
    setup();
    const s = loadedState();
    const t = s.tricks.find((t: { name: string }) => t.name === 'Phoenix');
    expect(t?.poleType).toBe('static_only');
  });

  it('Pencil Spin is spin_only', () => {
    setup();
    const s = loadedState();
    const t = s.tricks.find((t: { name: string }) => t.name === 'Pencil Spin');
    expect(t?.poleType).toBe('spin_only');
  });
});

describe('upsertUserTrick', () => {
  it('creates a new user trick', () => {
    setup();
    const s = loadedState();
    const trickId = s.tricks[0].id;

    s.upsertUserTrick(trickId, { status_left: 'learning' });

    expect(state().getUserTrick(trickId)?.status_left).toBe('learning');
  });

  it('updates an existing user trick', () => {
    setup();
    const s = loadedState();
    const trickId = s.tricks[0].id;

    s.upsertUserTrick(trickId, { status_left: 'learning' });
    s.upsertUserTrick(trickId, { status_left: 'got_it' });

    expect(state().getUserTrick(trickId)?.status_left).toBe('got_it');
    // Should still be only one user trick row
    expect(state().userTricks.filter((u: { trickId: string }) => u.trickId === trickId)).toHaveLength(1);
  });
});

describe('updateTrickTags', () => {
  it('adds and persists a custom tag', () => {
    setup();
    const s = loadedState();
    const trick = s.tricks[0];

    s.updateTrickTags(trick.id, [...trick.tags, 'choreo prep']);
    state().load(); // reload from DB
    const updated = state().tricks.find((t: { id: string }) => t.id === trick.id);
    expect(updated?.tags).toContain('choreo prep');
  });
});

describe('addCustomTrick', () => {
  it('adds trick and marks it custom', () => {
    setup();
    const s = loadedState();

    s.addCustomTrick({
      name: 'My Combo',
      poleType: 'static_only',
      difficulty: 3,
      hasSides: true,
      diagramUrl: null,
      referenceVideoUrl: null,
      tags: ['strength'],
    });

    const t = state().tricks.find((t: { name: string }) => t.name === 'My Combo');
    expect(t?.isCustom).toBe(true);
    expect(t?.poleType).toBe('static_only');
  });

  it('deleteCustomTrick removes it from state', () => {
    setup();
    const s = loadedState();

    s.addCustomTrick({
      name: 'Temp Trick',
      poleType: 'both',
      difficulty: 2,
      hasSides: false,
      diagramUrl: null,
      referenceVideoUrl: null,
      tags: [],
    });

    const t = state().tricks.find((t: { name: string }) => t.name === 'Temp Trick')!;
    state().deleteCustomTrick(t.id);
    expect(state().tricks.find((t: { name: string }) => t.name === 'Temp Trick')).toBeUndefined();
  });
});
