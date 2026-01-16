const express = require('express');
const router = express.Router();
const { dbAll, dbRun, dbGet } = require('../db');
const { requireAdmin } = require('../auth');

// Admin dashboard
router.get('/', requireAdmin, async (req, res) => {
  try {
    const competitions = await dbAll('SELECT * FROM competitions');
    res.render('admin/index', { competitions });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database error');
  }
});

// Create competition form
router.get('/create-competition', requireAdmin, (req, res) => {
  res.render('admin/create-competition');
});

// Handle create competition
router.post('/create-competition', requireAdmin, async (req, res) => {
  const { name, date, location, boulder, lead, numBoulder, numLead, flash, second, third, zone, bonus, leadZone, leadTop, selfJudged } = req.body;
  
  if (!name || !date) {
    return res.status(400).send('Name and date are required');
  }
  
  try {
    const boulderRoutes = boulder ? parseInt(numBoulder) || 1 : 0;
    const leadRoutes = lead ? parseInt(numLead) || 1 : 0;
    
    const result = await dbRun(`INSERT INTO competitions (name, date, location, boulder_enabled, lead_enabled, num_boulder_routes, num_lead_routes, flash_points, second_points, third_points, zone_points, topped_bonus, lead_zone_points, lead_top_points, self_judged) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [name, date, location || '', boulder ? 1 : 0, lead ? 1 : 0, boulderRoutes, leadRoutes, flash || 75, second || 50, third || 25, zone || 15, bonus || 1.5, leadZone || 15, leadTop || 75, selfJudged ? 1 : 0]);
    const compId = result.lastID;
    
    // Create routes
    let count = 0;
    const total = boulderRoutes + leadRoutes;
    if (total === 0) return res.redirect('/admin');
    
    const insertRoute = async (type, num) => {
      await dbRun('INSERT INTO routes (competition_id, type, number) VALUES (?, ?, ?)', [compId, type, num]);
      count++;
      if (count === total) res.redirect('/admin');
    };
    
    if (boulder && boulderRoutes > 0) {
      for (let i = 1; i <= boulderRoutes; i++) {
        insertRoute('boulder', i);
      }
    }
    if (lead && leadRoutes > 0) {
      for (let i = 1; i <= leadRoutes; i++) {
        insertRoute('lead', i);
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error creating competition');
  }
});

// Manage specific competition
router.get('/competition/:id', requireAdmin, async (req, res) => {
  try {
    const compId = req.params.id;
    const competition = await dbGet('SELECT * FROM competitions WHERE id = ?', [compId]);
    if (!competition) return res.status(404).send('Competition not found');
    
    const routes = await dbAll('SELECT * FROM routes WHERE competition_id = ? ORDER BY type, number', [compId]);
    const competitors = await dbAll('SELECT * FROM competitors WHERE competition_id = ? ORDER BY name', [compId]);
    
    // Get scoresheets for self-judged competitions
    let scoresheets = [];
    if (competition.self_judged) {
      const scores = await dbAll(`
        SELECT 
          s.*,
          c.name as competitor_name,
          c.phone,
          r.type as route_type,
          r.number as route_number
        FROM scores s
        JOIN competitors c ON s.competitor_id = c.id
        JOIN routes r ON s.route_id = r.id
        WHERE r.competition_id = ?
        ORDER BY c.name, r.type, r.number
      `, [compId]);
      
      // Group scores by competitor
      const scoresByCompetitor = {};
      scores.forEach(score => {
        if (!scoresByCompetitor[score.competitor_id]) {
          scoresByCompetitor[score.competitor_id] = {
            competitor_id: score.competitor_id,
            competitor_name: score.competitor_name,
            phone: score.phone,
            scores: [],
            total_points: 0
          };
        }
        
        let points = 0;
        if (score.route_type === 'boulder') {
          if (score.topped) {
            if (score.attempts === 1) points = competition.flash_points;
            else if (score.attempts === 2) points = competition.second_points;
            else points = competition.third_points;
            points *= competition.topped_bonus;
          } else if (score.zones) {
            points = competition.zone_points;
          }
        } else if (score.route_type === 'lead') {
          if (score.topped) {
            points = competition.lead_top_points;
          } else if (score.zones) {
            points = competition.lead_zone_points;
          }
        }
        
        scoresByCompetitor[score.competitor_id].scores.push({
          route_type: score.route_type,
          route_number: score.route_number,
          topped: score.topped,
          zones: score.zones,
          attempts: score.attempts,
          points: points
        });
        
        scoresByCompetitor[score.competitor_id].total_points += points;
      });
      
      scoresheets = Object.values(scoresByCompetitor);
    }
    
    res.render('admin/manage-competition', { competition, routes, competitors, scoresheets });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database error');
  }
});

// Handle edit competition
router.post('/competition/:id/edit', requireAdmin, async (req, res) => {
  const compId = req.params.id;
  const { name, date, location, boulder, lead, numBoulder, numLead, flash, second, third, zone, bonus, leadZone, leadTop, selfJudged } = req.body;
  
  console.log('Edit competition request:', { compId, name, date, boulder, lead, numBoulder, numLead });
  
  if (!name || !date) {
    return res.status(400).send('Name and date are required');
  }
  
  try {
    const boulderRoutes = boulder ? parseInt(numBoulder) || 1 : 0;
    const leadRoutes = lead ? parseInt(numLead) || 1 : 0;
    
    await dbRun(`UPDATE competitions SET name = ?, date = ?, location = ?, boulder_enabled = ?, lead_enabled = ?, num_boulder_routes = ?, num_lead_routes = ?, flash_points = ?, second_points = ?, third_points = ?, zone_points = ?, topped_bonus = ?, lead_zone_points = ?, lead_top_points = ?, self_judged = ? WHERE id = ?`, 
      [name, date, location || '', boulder ? 1 : 0, lead ? 1 : 0, boulderRoutes, leadRoutes, flash || 75, second || 50, third || 25, zone || 15, bonus || 1.5, leadZone || 15, leadTop || 75, selfJudged ? 1 : 0, compId]);
    
    console.log('Competition updated successfully');
    res.redirect(`/admin/competition/${compId}`);
  } catch (err) {
    console.error('Error updating competition:', err);
    return res.status(500).send('Error updating competition');
  }
});

// Handle delete competition
router.post('/competition/:id/delete', requireAdmin, async (req, res) => {
  const compId = req.params.id;
  
  try {
    // Delete associated data first
    await dbRun('DELETE FROM scores WHERE route_id IN (SELECT id FROM routes WHERE competition_id = ?)', [compId]);
    await dbRun('DELETE FROM routes WHERE competition_id = ?', [compId]);
    await dbRun('DELETE FROM competitors WHERE competition_id = ?', [compId]);
    await dbRun('DELETE FROM competitions WHERE id = ?', [compId]);
    
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error deleting competition');
  }
});

// Handle add competitor
router.post('/competition/:id/add-competitor', requireAdmin, async (req, res) => {
  const compId = req.params.id;
  const { name, bib, phone } = req.body;
  
  if (!name) {
    return res.status(400).send('Name is required');
  }
  
  try {
    await dbRun('INSERT INTO competitors (name, bib, phone, competition_id) VALUES (?, ?, ?, ?)', [name, bib || null, phone || null, compId]);
    res.redirect(`/admin/competition/${compId}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error adding competitor');
  }
});

// Handle edit competitor
router.post('/competition/:compId/edit-competitor/:competitorId', requireAdmin, async (req, res) => {
  const { compId, competitorId } = req.params;
  const { name, bib, phone } = req.body;
  
  if (!name) {
    return res.status(400).send('Name is required');
  }
  
  try {
    await dbRun('UPDATE competitors SET name = ?, bib = ?, phone = ? WHERE id = ? AND competition_id = ?', [name, bib || null, phone || null, competitorId, compId]);
    res.redirect(`/admin/competition/${compId}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error updating competitor');
  }
});

// Handle delete competitor
router.post('/competition/:compId/delete-competitor/:competitorId', requireAdmin, async (req, res) => {
  const { compId, competitorId } = req.params;
  
  try {
    // Delete associated scores first
    await dbRun('DELETE FROM scores WHERE competitor_id = ?', [competitorId]);
    await dbRun('DELETE FROM competitors WHERE id = ? AND competition_id = ?', [competitorId, compId]);
    res.redirect(`/admin/competition/${compId}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error deleting competitor');
  }
});

module.exports = router;