const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verifies JWT and attaches { user_id, organization_id, role } to req.user
// This is the core of multi-tenant isolation: every downstream query
// MUST filter by req.user.organization_id, never trust client input for it.
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, organization_id, role, first_name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Only lets Admin-role users through. Must run after authMiddleware.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Only lets SuperAdmin-role users through — cross-org visibility.
// This is the one deliberate exception to the org_id scoping rule.
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.requireSuperAdmin = requireSuperAdmin;