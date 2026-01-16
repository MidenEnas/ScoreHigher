const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const path = require('path');
const { initDatabase, dbAll, dbGet, dbRun } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Initialize database
initDatabase();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: __dirname
  }),
  secret: process.env.SESSION_SECRET || 'climbing-score-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Routes
app.use('/admin', require('./routes/admin'));

app.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM competitions WHERE 1=1';
    let params = [];
    
    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY date DESC';
    
    const competitions = await dbAll(query, params);
    res.render('index', { competitions, search: search || '' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

app.get('/competition/:id', async (req, res) => {
  try {
    const compId = req.params.id;
    const competition = await dbGet('SELECT * FROM competitions WHERE id = ?', [compId]);
    if (!competition) return res.status(404).send('Competition not found');
    
    const routes = await dbAll('SELECT * FROM routes WHERE competition_id = ? ORDER BY type, number', [compId]);
    const competitors = await dbAll('SELECT * FROM competitors WHERE competition_id = ? ORDER BY name', [compId]);
    
    res.render('competition', { 
      competition, 
      routes, 
      competitors, 
      success: req.query.success 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

app.get('/competition/:id/enter', async (req, res) => {
  try {
    const compId = req.params.id;
    const competition = await dbGet('SELECT * FROM competitions WHERE id = ?', [compId]);
    if (!competition) return res.status(404).send('Competition not found');
    
    if (!competition.self_judged) {
      return res.status(400).send('This competition does not allow self-entry');
    }
    
    const routes = await dbAll('SELECT * FROM routes WHERE competition_id = ? ORDER BY type, number', [compId]);
    
    res.render('enter-competition', { competition, routes });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

app.post('/competition/:id/enter', async (req, res) => {
  try {
    const compId = req.params.id;
    const { firstName, lastName, phone, scores } = req.body;
    
    if (!firstName || !lastName || !phone) {
      return res.status(400).send('Name and phone number are required');
    }
    
    // Create competitor
    const competitorResult = await dbRun('INSERT INTO competitors (name, phone, competition_id) VALUES (?, ?, ?)', 
      [`${firstName} ${lastName}`, phone, compId]);
    const competitorId = competitorResult.lastID;
    
    // Process scores
    if (scores && typeof scores === 'object') {
      for (const [routeId, scoreData] of Object.entries(scores)) {
        if (scoreData && typeof scoreData === 'object') {
          const { flash, topSecond, topAny, zone, top, zone1, zone2, zone3 } = scoreData;
          
          // Determine topped status (prioritize top over zone)
          const hasTop = flash || topSecond || topAny || top;
          const hasZone = hasTop ? false : (zone || zone1 || zone2 || zone3); // Only count zone if no top
          
          // Insert score record
          await dbRun('INSERT INTO scores (competitor_id, route_id, attempts, topped, zones) VALUES (?, ?, ?, ?, ?)', [
            competitorId,
            routeId,
            flash ? 1 : (topSecond ? 2 : (topAny ? 3 : 0)), // attempts based on selection
            hasTop ? 1 : 0, // topped
            hasZone ? 1 : 0 // zones only if no top
          ]);
        }
      }
    }
    
    res.redirect(`/competition/${compId}?success=1`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting scores');
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});