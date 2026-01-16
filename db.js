const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./scorehigher.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
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
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER,
    type TEXT NOT NULL,
    number INTEGER NOT NULL,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS competitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    competition_id INTEGER,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competitor_id INTEGER,
    route_id INTEGER,
    attempts INTEGER DEFAULT 0,
    topped INTEGER DEFAULT 0,
    zones INTEGER DEFAULT 0,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
  )`);
});

module.exports = db;