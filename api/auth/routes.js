const express = require("express");
const router = express.Router();
const argon2 = require("argon2");
const { z } = require("zod");
const { db } = require("../../db");
const { admins } = require("../../db/schema");
const { eq } = require("drizzle-orm");
const { validateBody } = require("../../middleware/validation");

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

/**
 * POST /api/auth/login
 * Authenticates CMS administrator and starts secure session
 */
router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const { password } = req.body;

    const admin = (await db.select().from(admins).where(eq(admins.email, email)))[0];

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password."
        }
      });
    }

    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "This administrator account has been deactivated."
        }
      });
    }

    const isValid = await argon2.verify(admin.password_hash, password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password."
        }
      });
    }

    // Update last login timestamp
    await db
      .update(admins)
      .set({ last_login_at: new Date() })
      .where(eq(admins.id, admin.id));

    // Store admin identity securely in server-side session
    req.session.adminId = admin.id;
    req.session.adminRole = admin.role;
    req.session.adminEmail = admin.email;
    req.session.adminName = admin.name;

    // Strict security: Never expose password_hash
    res.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Destroys administrator session and clears session cookie
 */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: { code: "LOGOUT_FAILED", message: "Could not destroy session." }
      });
    }
    res.clearCookie("news_sid");
    res.json({
      success: true,
      message: "Successfully logged out."
    });
  });
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated administrator profile
 */
router.get("/me", async (req, res, next) => {
  try {
    if (!req.session || !req.session.adminId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated."
        }
      });
    }

    const admin = (
      await db.select().from(admins).where(eq(admins.id, req.session.adminId))
    )[0];

    if (!admin || !admin.is_active) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User session expired or invalid."
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLoginAt: admin.last_login_at
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
