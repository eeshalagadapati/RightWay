/**
 * Authentication and Authorization Middleware
 * Protects private CMS / admin endpoints.
 * Public visitors do not authenticate and cannot access /api/admin/*
 */

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required to access admin resources."
      }
    });
  }
  next();
}

module.exports = {
  requireAdmin
};
