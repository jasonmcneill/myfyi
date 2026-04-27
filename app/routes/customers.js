const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticateToken } = require("../middleware/auth");
const Customer = require("../models/Customer");
const Card = require("../models/Card");
const Subscription = require("../models/Subscription");

const router = express.Router();

// Get customer dashboard
router.get("/dashboard", authenticateToken, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.user.id);
    const card = await Card.findByCustomerId(req.user.id);
    const subscription = await Subscription.findByCustomerId(req.user.id);

    if (!customer || !card) {
      return res.status(404).json({ error: "Customer or card not found" });
    }

    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        handle: customer.handle,
      },
      card: {
        id: card.id,
        code: card.unique_code,
        bio: card.bio,
        photoUrl: card.photo_url,
        contactEmail: card.contact_email,
      },
      subscription: {
        status: subscription?.status || "inactive",
        currentPeriodEnd: subscription?.current_period_end,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update card
router.put(
  "/card",
  authenticateToken,
  [
    body("bio").optional().trim().isLength({ max: 500 }),
    body("contactEmail").optional().isEmail(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { bio, contactEmail, photoUrl } = req.body;

      const updates = {};
      if (bio !== undefined) updates.bio = bio;
      if (contactEmail !== undefined) updates.contact_email = contactEmail;
      if (photoUrl !== undefined) updates.photo_url = photoUrl;

      await Card.update(req.user.id, updates);

      const card = await Card.findByCustomerId(req.user.id);
      res.json({
        message: "Card updated successfully",
        card: {
          id: card.id,
          code: card.unique_code,
          bio: card.bio,
          photoUrl: card.photo_url,
          contactEmail: card.contact_email,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get card preview
router.get("/card/preview", authenticateToken, async (req, res, next) => {
  try {
    const card = await Card.getCardWithDetails(req.user.id);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    res.json({
      card: {
        code: card.unique_code,
        firstName: card.first_name,
        lastName: card.last_name,
        bio: card.bio,
        photoUrl: card.photo_url,
        contactEmail: card.contact_email,
        handle: card.handle,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get analytics for customer
router.get("/analytics", authenticateToken, async (req, res, next) => {
  try {
    const card = await Card.findByCustomerId(req.user.id);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    const pool = require("../config/db");
    const [viewData] = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM analytics 
       WHERE card_id = ? AND event_type = 'view' 
       GROUP BY DATE(created_at) 
       ORDER BY date DESC 
       LIMIT 30`,
      [card.id],
    );

    const [totalViews] = await pool.query(
      "SELECT COUNT(*) as count FROM analytics WHERE card_id = ? AND event_type = ?",
      [card.id, "view"],
    );

    const [totalClicks] = await pool.query(
      "SELECT COUNT(*) as count FROM analytics WHERE card_id = ? AND event_type = ?",
      [card.id, "click"],
    );

    res.json({
      analytics: {
        totalViews: totalViews[0]?.count || 0,
        totalClicks: totalClicks[0]?.count || 0,
        viewsByDate: viewData,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
