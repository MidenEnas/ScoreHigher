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

// Disable caching for static files during development
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Make user info available in all templates
app.use(async (req, res, next) => {
  res.locals.user = null;
  res.locals.isAdmin = false;
  res.locals.isJudge = false;

  if (req.session.userId) {
    try {
      const { getUserById } = require('./auth');
      const user = await getUserById(req.session.userId);
      if (user) {
        res.locals.user = user;
        res.locals.isAdmin = user.role === 'admin';
        res.locals.isJudge = user.role === 'judge';
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/admin', require('./routes/users'));
app.use('/debug', require('./routes/debugdb'));

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
    
    // Get all scores for leaderboard calculation
    const scores = await dbAll(`
      SELECT s.*, c.name as competitor_name, c.phone, r.type as route_type, r.number as route_number
      FROM scores s
      JOIN competitors c ON s.competitor_id = c.id
      JOIN routes r ON s.route_id = r.id
      WHERE r.competition_id = ?
      ORDER BY c.name, r.type, r.number
    `, [compId]);
    
    // Calculate leaderboard
    const leaderboard = {};
    scores.forEach(score => {
      if (!leaderboard[score.competitor_id]) {
        leaderboard[score.competitor_id] = {
          id: score.competitor_id,
          name: score.competitor_name,
          phone: score.phone,
          totalPoints: 0,
          boulderPoints: 0,
          leadPoints: 0
        };
      }
      
      let points = 0;
      
      if (score.route_type === 'boulder') {
        if (score.topped) {
          if (score.attempts === 1) points = 75; // flash base
          else if (score.attempts === 2) points = 50; // second attempt base
          else points = 25; // any attempt base
          
          // Add route number bonus
          points += score.route_number * 1.5;
        } else if (score.zones) {
          // Zone points - using route number bonus only (no base points for zone)
          points = score.route_number * 1.5;
        }
        
        leaderboard[score.competitor_id].boulderPoints += points;
      } else if (score.route_type === 'lead') {
        if (score.topped) {
          points = competition.lead_top_points;
        } else if (score.zones) {
          points = competition.lead_zone_points;
        }
        
        leaderboard[score.competitor_id].leadPoints += points;
      }
      
      leaderboard[score.competitor_id].totalPoints += points;
    });
    
    // Convert to array and sort by total points (descending)
    const leaderboardArray = Object.values(leaderboard).sort((a, b) => b.totalPoints - a.totalPoints);
    
    res.render('competition', { 
      competition, 
      routes, 
      leaderboard: leaderboardArray,
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
          const { score, top, zone1, zone2, zone3 } = scoreData;
          
          // Determine topped status and attempts based on score type
          let hasTop = false;
          let hasZone = false;
          let attempts = 0;
          
          // Handle boulder scoring (radio button - score field)
          if (score === 'flash') {
            hasTop = true;
            attempts = 1;
          } else if (score === 'topSecond') {
            hasTop = true;
            attempts = 2;
          } else if (score === 'topAny') {
            hasTop = true;
            attempts = 3;
          } else if (score === 'zone') {
            hasZone = true;
          }
          // Handle lead scoring (checkboxes - top, zone1, zone2, zone3 fields)
          else if (top === '1') {
            hasTop = true;
            attempts = 1;
          } else if (zone1 === '1' || zone2 === '1' || zone3 === '1') {
            hasZone = true;
          }
          
          // Only insert if there's actually a score to record
          if (hasTop || hasZone) {
            await dbRun('INSERT INTO scores (competitor_id, route_id, attempts, topped, zones) VALUES (?, ?, ?, ?, ?)', [
              competitorId,
              routeId,
              attempts,
              hasTop ? 1 : 0,
              hasZone ? 1 : 0
            ]);
          }
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