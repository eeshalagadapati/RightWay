const { ZodError } = require("zod");

/**
 * Higher-order middleware to validate req.body against a Zod schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", "),
            details: err.errors
          }
        });
      }
      next(err);
    }
  };
}

/**
 * Higher-order middleware to validate req.query against a Zod schema
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", "),
            details: err.errors
          }
        });
      }
      next(err);
    }
  };
}

module.exports = {
  validateBody,
  validateQuery
};
