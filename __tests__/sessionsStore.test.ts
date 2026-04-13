/**
 * Tests for sessionsStore — exercises real SQL via the in-memory SQLite mock.
 */

// Reset module registry before each test (Zustand holds module-level state)
beforeEach(() => {
  jest.resetModules();
});

// Always returns fresh Zustand state
function sessionsState() {
  const { useSessionsStore } = require('../src/stores/sessionsStore');
  return useSessionsStore.getState();
}

function tricksState() {
  const { useTricksStore } = require('../src/stores/tricksStore');
  return useTricksStore.getState();
}

function setup() {
  const { runMigrations } = require('../src/db/migrations');
  const { seedTricks } = require('../src/db/seed');
  runMigrations();
  seedTricks();
  tricksState().load();
  sessionsState().load();
}

describe('createSession', () => {
  it('adds session to state', () => {
    setup();
    const store = sessionsState();
    const id = store.createSession('2025-01-01', 'Test session');
    expect(sessionsState().sessions).toHaveLength(1);
    expect(sessionsState().sessions[0]).toMatchObject({ id, date: '2025-01-01', title: 'Test session' });
  });

  it('persists across load', () => {
    setup();
    const id = sessionsState().createSession('2025-01-01');
    sessionsState().load();
    expect(sessionsState().sessions.find((s: { id: string }) => s.id === id)).toBeDefined();
  });
});

describe('addSessionTrick', () => {
  it('adds trick to session', () => {
    setup();
    const sessionId = sessionsState().createSession('2025-01-01');
    const trickId = tricksState().tricks[0].id;

    sessionsState().addSessionTrick(sessionId, trickId, 'left', 'static', 5);

    const tricks = sessionsState().getSessionTricks(sessionId);
    expect(tricks).toHaveLength(1);
    expect(tricks[0]).toMatchObject({ trickId, side: 'left', poleMode: 'static', reps: 5, completedReps: 0 });
  });
});

describe('updateCompletedReps', () => {
  it('updates rep count', () => {
    setup();
    const sessionId = sessionsState().createSession('2025-01-01');
    const trickId = tricksState().tricks[0].id;

    sessionsState().addSessionTrick(sessionId, trickId, 'left', 'static', 5);
    const stId = sessionsState().getSessionTricks(sessionId)[0].id;

    sessionsState().updateCompletedReps(stId, 3);
    expect(sessionsState().getSessionTricks(sessionId)[0].completedReps).toBe(3);
  });
});

describe('updateSessionTrick', () => {
  it('changes side, poleMode, and reps', () => {
    setup();
    const sessionId = sessionsState().createSession('2025-01-01');
    const trickId = tricksState().tricks[0].id;

    sessionsState().addSessionTrick(sessionId, trickId, 'left', 'static', 3);
    const stId = sessionsState().getSessionTricks(sessionId)[0].id;

    sessionsState().updateSessionTrick(stId, 'right', 'spin', 8);
    const updated = sessionsState().getSessionTricks(sessionId)[0];
    expect(updated).toMatchObject({ side: 'right', poleMode: 'spin', reps: 8 });
  });
});

describe('deleteSession', () => {
  it('removes session and its tricks', () => {
    setup();
    const sessionId = sessionsState().createSession('2025-01-01');
    const trickId = tricksState().tricks[0].id;

    sessionsState().addSessionTrick(sessionId, trickId, 'left', 'static', 3);
    sessionsState().deleteSession(sessionId);

    expect(sessionsState().sessions).toHaveLength(0);
    expect(sessionsState().getSessionTricks(sessionId)).toHaveLength(0);
  });
});

describe('removeSessionTrick', () => {
  it('removes only the targeted trick', () => {
    setup();
    const sessionId = sessionsState().createSession('2025-01-01');
    const tricks = tricksState().tricks;

    sessionsState().addSessionTrick(sessionId, tricks[0].id, 'left', 'static', 3);
    sessionsState().addSessionTrick(sessionId, tricks[1].id, 'right', 'spin', 5);

    const stId = sessionsState().getSessionTricks(sessionId)[0].id;
    sessionsState().removeSessionTrick(stId);

    expect(sessionsState().getSessionTricks(sessionId)).toHaveLength(1);
    expect(sessionsState().getSessionTricks(sessionId)[0].trickId).toBe(tricks[1].id);
  });
});
