const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'climbing.db'));

// Promisify for consistency
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize database
async function initDatabase() {
  try {
    // Competitions table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS competitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date DATE NOT NULL,
        location TEXT,
        boulder_enabled INTEGER DEFAULT 0,
        lead_enabled INTEGER DEFAULT 0,
        num_boulder_routes INTEGER DEFAULT 0,
        num_lead_routes INTEGER DEFAULT 0,
        flash_points INTEGER DEFAULT 75,
        second_points INTEGER DEFAULT 50,
        third_points INTEGER DEFAULT 25,
        zone_points INTEGER DEFAULT 15,
        topped_bonus REAL DEFAULT 1.5,
        lead_zone_points INTEGER DEFAULT 15,
        lead_top_points INTEGER DEFAULT 75,
        self_judged INTEGER DEFAULT 0
      )
    `);

    // Routes table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER,
        type TEXT,
        number INTEGER
      )
    `);

    // Competitors table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS competitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        bib INTEGER,
        phone TEXT,
        competition_id INTEGER
      )
    `);

    // Scores table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competitor_id INTEGER,
        route_id INTEGER,
        attempts INTEGER DEFAULT 0,
        topped INTEGER DEFAULT 0,
        zones INTEGER DEFAULT 0
      )
    `);

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
    // Don't exit, just log
  }
}

// Export the db object and helper functions
module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDatabase
};