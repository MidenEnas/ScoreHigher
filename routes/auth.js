const express = require('express');
const router = express.Router();
const { createUser, authenticateUser, getUserById } = require('../auth');

// Register page
router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('auth/register', { error: null });
});

// Register submission
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.render('auth/register', { error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.render('auth/register', { error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.render('auth/register', { error: 'Password must be at least 6 characters long' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('auth/register', { error: 'Please enter a valid email address' });
    }

    // Create user
    const userId = await createUser(firstName, lastName, email, password);

    // Log them in
    req.session.userId = userId;
    req.session.role = 'user';

    res.redirect('/');
  } catch (err) {
    console.error(err);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.render('auth/register', { error: 'Email already exists' });
    }
    res.render('auth/register', { error: 'Registration failed. Please try again.' });
  }
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('auth/login', { error: null });
});

// Login submission
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('auth/login', { error: 'Email and password are required' });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.render('auth/login', { error: 'Invalid email or password' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { error: 'Login failed. Please try again.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;