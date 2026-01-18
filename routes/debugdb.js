const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../db');

router.get('/', async (req, res) => {
  try {
    const competitions = await dbAll('SELECT * FROM competitions ORDER BY date DESC');
    res.render('debugdb', { competitions, competition: null, routes: [], competitors: [], scores: [], leaderboard: [] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

router.get('/competition/:id', async (req, res) => {
  try {
    const compId = req.params.id;
    const competition = await dbGet('SELECT * FROM competitions WHERE id = ?', [compId]);
    if (!competition) return res.status(404).send('Competition not found');

    const routes = await dbAll('SELECT * FROM routes WHERE competition_id = ? ORDER BY type, number', [compId]);
    const competitors = await dbAll('SELECT * FROM competitors WHERE competition_id = ? ORDER BY name', [compId]);
    const scores = await dbAll(`
      SELECT s.*, c.name as competitor_name, r.type as route_type, r.number as route_number
      FROM scores s
      LEFT JOIN competitors c ON s.competitor_id = c.id
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE r.competition_id = ?
      ORDER BY c.name, r.type, r.number
    `, [compId]);

    // Compute leaderboard robustly
    const leaderboard = {};
    scores.forEach(score => {
      if (!score) return;
      const cid = score.competitor_id;
      if (!leaderboard[cid]) {
        leaderboard[cid] = { id: cid, name: score.competitor_name || 'Unknown', totalPoints: 0, boulderPoints: 0, leadPoints: 0 };
      }

      let points = 0;
      if (score.route_type === 'boulder') {
        if (score.topped) {
          if (score.attempts === 1) points = competition.flash_points || 75;
          else if (score.attempts === 2) points = competition.second_points || 50;
          else points = competition.third_points || 25;
          points += (score.route_number || 0) * (competition.topped_bonus || 1.5);
        } else if (score.zones) {
          // approximate zone-only scoring: use zone_points with route number as multiplier
          points = (score.route_number || 0) * (competition.zone_points || 15) * ((competition.topped_bonus || 1.5) / (competition.topped_bonus || 1.5));
        }
        leaderboard[cid].boulderPoints += points;
      } else if (score.route_type === 'lead') {
        if (score.topped) points = competition.lead_top_points || 75;
        else if (score.zones) points = competition.lead_zone_points || 15;
        leaderboard[cid].leadPoints += points;
      }

      leaderboard[cid].totalPoints += points;
    });

    const leaderboardArray = Object.values(leaderboard).sort((a, b) => b.totalPoints - a.totalPoints);

    res.render('debugdb', { competitions: [competition], competition, routes, competitors, scores, leaderboard: leaderboardArray });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

module.exports = router;
