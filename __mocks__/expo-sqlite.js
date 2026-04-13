// Uses real in-memory SQLite via better-sqlite3 so SQL actually executes in tests.
const BetterSQLite = require('better-sqlite3');

let _db = null;

function getOrCreateDb() {
  if (!_db) {
    _db = new BetterSQLite(':memory:');
  }
  return _db;
}

function makeDb(betterDb) {
  return {
    execSync(sql) {
      betterDb.exec(sql);
    },
    runSync(sql, params = []) {
      betterDb.prepare(sql).run(...params);
    },
    getAllSync(sql, params = []) {
      return betterDb.prepare(sql).all(...params);
    },
    getFirstSync(sql, params = []) {
      return betterDb.prepare(sql).get(...params) ?? null;
    },
    prepareSync(sql) {
      const stmt = betterDb.prepare(sql);
      return {
        executeSync(params = []) { stmt.run(...params); },
        finalizeSync() {},
      };
    },
  };
}

module.exports = {
  openDatabaseSync() {
    return makeDb(getOrCreateDb());
  },
  // Reset between tests
  __reset() {
    _db = null;
  },
};
