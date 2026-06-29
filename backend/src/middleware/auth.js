const { verifyToken } = require("../utils/jwt");

// Verifies the JWT bearer token and attaches { id, role, name, email } to req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Missing or invalid Authorization header" } });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, name: payload.name, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token is invalid or expired" } });
  }
}

// Restricts access to one or more roles, e.g. requireRole("admin"), requireRole("admin", "volunteer")
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" } });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
