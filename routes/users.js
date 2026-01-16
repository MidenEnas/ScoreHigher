const express = require('express');
const router = express.Router();
const { requireAdmin, getAllUsers, searchUsersByEmail, updateUserRole, getUserByEmail } = require('../auth');

// Manage users page
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const search = req.query.search || '';
    let users;

    if (search) {
      users = await searchUsersByEmail(search);
    } else {
      users = await getAllUsers();
    }

    res.render('admin/users', { users, search, message: req.query.message });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

// Update user role
router.post('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!['user', 'judge', 'admin'].includes(role)) {
      return res.status(400).send('Invalid role');
    }

    await updateUserRole(userId, role);

    const message = `User role updated to ${role}`;
    res.redirect(`/admin/users?message=${encodeURIComponent(message)}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

// Search users
router.get('/users/search', requireAdmin, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.redirect('/admin/users');
    }

    const users = await searchUsersByEmail(email);
    res.render('admin/users', { users, search: email, message: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

module.exports = router;