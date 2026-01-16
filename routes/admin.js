const express = require('express');
const router = express.Router();
const db = require('../db');

// Admin dashboard
router.get('/', (req, res) => {
  res.render('admin/index');
});

// Create competition form
router.get('/create-competition', (req, res) => {
  res.render('admin/create-competition');
});

// Handle create competition
router.post('/create-competition', (req, res) => {
  const { name, date, boulder, lead, numBoulder, numLead, flash, second, third, zone, bonus, leadZone, leadTop, selfJudged } = req.body;
  
  db.query(`INSERT INTO competitions (name, date, boulder_enabled, lead_enabled, num_boulder_routes, num_lead_routes, flash_points, second_points, third_points, zone_points, topped_bonus, lead_zone_points, lead_top_points, self_judged) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [name, date, boulder ? 1 : 0, lead ? 1 : 0, numBoulder || 0, numLead || 0, flash || 75, second || 50, third || 25, zone || 15, bonus || 1.5, leadZone || 15, leadTop || 75, selfJudged ? 1 : 0], (err, result) => {
    if (err) {
      console.error(err);
      return res.send('Error creating competition');
    }
    const compId = result.insertId;
    
    // Create routes
    let count = 0;
    const total = (boulder ? numBoulder : 0) + (lead ? numLead : 0);
    if (boulder && numBoulder) {
      for (let i = 1; i <= numBoulder; i++) {
        db.query('INSERT INTO routes (competition_id, type, number) VALUES (?, ?, ?)', [compId, 'boulder', i], (err) => {
          if (err) console.error(err);
          count++;
          if (count === total) res.redirect('/admin');
        });
      }
    }
    if (lead && numLead) {
      for (let i = 1; i <= numLead; i++) {
        db.query('INSERT INTO routes (competition_id, type, number) VALUES (?, ?, ?)', [compId, 'lead', i], (err) => {
          if (err) console.error(err);
          count++;
          if (count === total) res.redirect('/admin');
        });
      }
    }
    if (total === 0) res.redirect('/admin');
  });
});

module.exports = router;