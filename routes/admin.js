const express = require('express');
const router = express.Router();
const { dbAll, dbRun } = require('../db');

// Admin dashboard
router.get('/', async (req, res) => {
  try {
    const competitions = await dbAll('SELECT * FROM competitions');
    res.render('admin/index', { competitions });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database error');
  }
});

// Manage specific competition
router.get('/competition/:id', async (req, res) => {
  try {
    const compId = req.params.id;
    const competition = await dbGet('SELECT * FROM competitions WHERE id = ?', [compId]);
    if (!competition) return res.status(404).send('Competition not found');
    
    // const routes = await dbAll('SELECT * FROM routes WHERE competition_id = ? ORDER BY type, number', [compId]);
    // const competitors = await dbAll('SELECT * FROM competitors WHERE competition_id = ? ORDER BY name', [compId]);
    const routes = [];
    const competitors = [];
    
    res.render('admin/manage-competition', { competition, routes, competitors });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database error');
  }
});

// Create competition form
router.get('/create-competition', (req, res) => {
  res.render('admin/create-competition');
});

// Handle create competition
router.post('/create-competition', async (req, res) => {
  const { name, date, location, boulder, lead, numBoulder, numLead, flash, second, third, zone, bonus, leadZone, leadTop, selfJudged } = req.body;
  
  if (!name || !date) {
    return res.status(400).send('Name and date are required');
  }
  
  try {
    const result = await dbRun(`INSERT INTO competitions (name, date, boulder_enabled, lead_enabled, num_boulder_routes, num_lead_routes, flash_points, second_points, third_points, zone_points, topped_bonus, lead_zone_points, lead_top_points, self_judged) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [name, date, boulder ? 1 : 0, lead ? 1 : 0, numBoulder || 0, numLead || 0, flash || 75, second || 50, third || 25, zone || 15, bonus || 1.5, leadZone || 15, leadTop || 75, selfJudged ? 1 : 0]);
    const compId = result.lastID;
    
    // Update location if provided
    if (location) {
      try {
        await dbRun('UPDATE competitions SET location = ? WHERE id = ?', [location, compId]);
      } catch (err) {
        // Column might not exist yet, ignore
      }
    }
    
    // Create routes
    let count = 0;
    const total = (boulder ? parseInt(numBoulder) : 0) + (lead ? parseInt(numLead) : 0);
    if (total === 0) return res.redirect('/admin');
    
    const insertRoute = async (type, num) => {
      await dbRun('INSERT INTO routes (competition_id, type, number) VALUES (?, ?, ?)', [compId, type, num]);
      count++;
      if (count === total) res.redirect('/admin');
    };
    
    if (boulder && numBoulder) {
      for (let i = 1; i <= parseInt(numBoulder); i++) {
        insertRoute('boulder', i);
      }
    }
    if (lead && numLead) {
      for (let i = 1; i <= parseInt(numLead); i++) {
        insertRoute('lead', i);
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error creating competition');
  }
});

// Handle add competitor
router.post('/competition/:id/add-competitor', async (req, res) => {
  const compId = req.params.id;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).send('Name is required');
  }
  
  try {
    await dbRun('INSERT INTO competitors (name, competition_id) VALUES (?, ?)', [name, compId]);
    res.redirect(`/admin/competition/${compId}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error adding competitor');
  }
});

module.exports = router;