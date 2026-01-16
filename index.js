const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const path = require('path');
const { initDatabase } = require('./db');

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
    
    res.render('competition', { competition, routes, competitors });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
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