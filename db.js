const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'scorehigher'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1); // Exit if DB fails
  } else {
    console.log('Connected to database');
    // Create tables
    createTables();
  }
});

function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS competitions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      boulder_enabled BOOLEAN DEFAULT FALSE,
      lead_enabled BOOLEAN DEFAULT FALSE,
      num_boulder_routes INT DEFAULT 0,
      num_lead_routes INT DEFAULT 0,
      flash_points INT DEFAULT 75,
      second_points INT DEFAULT 50,
      third_points INT DEFAULT 25,
      zone_points INT DEFAULT 15,
      topped_bonus DECIMAL(3,1) DEFAULT 1.5,
      lead_zone_points INT DEFAULT 15,
      lead_top_points INT DEFAULT 75,
      self_judged BOOLEAN DEFAULT FALSE
    )`,
    `CREATE TABLE IF NOT EXISTS routes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      competition_id INT,
      type ENUM('boulder', 'lead') NOT NULL,
      number INT NOT NULL,
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS competitors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      competition_id INT,
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      competitor_id INT,
      route_id INT,
      attempts INT DEFAULT 0,
      topped BOOLEAN DEFAULT FALSE,
      zones INT DEFAULT 0,
      FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    )`
  ];

  queries.forEach(query => {
    db.query(query, (err) => {
      if (err) console.error('Error creating table:', err.message);
    });
  });
}

module.exports = db;