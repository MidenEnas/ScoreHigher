const express = require('express');
const router = express.Router();
const db = require('../db');

// Admin dashboard
router.get('/', (req, res) => {
  db.query('SELECT * FROM competitions', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    res.render('admin/index', { competitions: results });
  });
});

// Create competition form
router.get('/create-competition', (req, res) => {
  res.render('admin/create-competition');
});

// Handle create competition
router.post('/create-competition', (req, res) => {
  const { name, date, location, boulder, lead, numBoulder, numLead, flash, second, third, zone, bonus, leadZone, leadTop, selfJudged } = req.body;
  
  if (!name || !date) {
    return res.status(400).send('Name and date are required');
  }
  
  db.query(`INSERT INTO competitions (name, date, location, boulder_enabled, lead_enabled, num_boulder_routes, num_lead_routes, flash_points, second_points, third_points, zone_points, topped_bonus, lead_zone_points, lead_top_points, self_judged) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [name, date, location || '', boulder ? 1 : 0, lead ? 1 : 0, numBoulder || 0, numLead || 0, flash || 75, second || 50, third || 25, zone || 15, bonus || 1.5, leadZone || 15, leadTop || 75, selfJudged ? 1 : 0], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error creating competition');
    }
    const compId = result.insertId;
    
    // Create routes
    let count = 0;
    const total = (boulder ? parseInt(numBoulder) : 0) + (lead ? parseInt(numLead) : 0);
    if (total === 0) return res.redirect('/admin');
    
    const insertRoute = (type, num) => {
      db.query('INSERT INTO routes (competition_id, type, number) VALUES (?, ?, ?)', [compId, type, num], (err) => {
        if (err) console.error('Error inserting route:', err);
        count++;
        if (count === total) res.redirect('/admin');
      });
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
  });
});

// Manage specific competition
router.get('/competition/:id', (req, res) => {
  const compId = req.params.id;
  db.query('SELECT * FROM competitions WHERE id = ?', [compId], (err, competitionResults) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    if (competitionResults.length === 0) return res.status(404).send('Competition not found');
    
    const competition = competitionResults[0];
    
    db.query('SELECT * FROM routes WHERE competition_id = ? ORDER BY type, number', [compId], (err, routeResults) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Database error');
      }
      
      db.query('SELECT * FROM competitors WHERE competition_id = ? ORDER BY name', [compId], (err, competitorResults) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Database error');
        }
        
        res.render('admin/manage-competition', { competition, routes: routeResults, competitors: competitorResults });
      });
    });
  });
});

// Handle add competitor
router.post('/competition/:id/add-competitor', (req, res) => {
  const compId = req.params.id;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).send('Name is required');
  }
  
  db.query('INSERT INTO competitors (name, competition_id) VALUES (?, ?)', [name, compId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error adding competitor');
    }
    res.redirect(`/admin/competition/${compId}`);
  });
});

module.exports = router;