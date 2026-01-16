const bcrypt = require('bcrypt');
const { dbGet, dbRun, dbAll } = require('./db');

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session.userId && req.session.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied. Admin privileges required.');
}

function requireJudgeOrAdmin(req, res, next) {
  if (req.session.userId && (req.session.role === 'admin' || req.session.role === 'judge')) {
    return next();
  }
  res.status(403).send('Access denied. Judge or Admin privileges required.');
}

// User management functions
async function createUser(firstName, lastName, email, password, role = 'user') {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await dbRun(
    'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [firstName, lastName, email, hashedPassword, role]
  );
  return result.lastID;
}

async function authenticateUser(email, password) {
  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return null;

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) return null;

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role
  };
}

async function getUserById(id) {
  return await dbGet('SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id = ?', [id]);
}

async function getUserByEmail(email) {
  return await dbGet('SELECT id, first_name, last_name, email, role, created_at FROM users WHERE email = ?', [email]);
}

async function updateUserRole(userId, newRole) {
  await dbRun('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]);
}

async function getAllUsers() {
  return await dbAll('SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at DESC');
}

async function searchUsersByEmail(email) {
  return await dbAll('SELECT id, first_name, last_name, email, role, created_at FROM users WHERE email LIKE ? ORDER BY email', [`%${email}%`]);
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireJudgeOrAdmin,
  createUser,
  authenticateUser,
  getUserById,
  getUserByEmail,
  updateUserRole,
  getAllUsers,
  searchUsersByEmail
};