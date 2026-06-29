// Centralized error handler — keeps controllers free of try/catch boilerplate
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === "23505") {
    // Postgres unique_violation
    return res.status(409).json({ error: { code: "DUPLICATE", message: "A record with this value already exists" } });
  }

  const status = err.status || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "Something went wrong";
  return res.status(status).json({ error: { code, message } });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.originalUrl}` } });
}

module.exports = { errorHandler, notFoundHandler };
