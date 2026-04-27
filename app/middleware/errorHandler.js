// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Validation errors
  if (err.array && typeof err.array === "function") {
    return res.status(400).json({
      error: "Validation failed",
      details: err.array(),
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(403).json({ error: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(403).json({ error: "Token expired" });
  }

  // Database errors
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "Resource already exists" });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
};

module.exports = errorHandler;
