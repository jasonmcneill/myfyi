const express = require("express");
const crypto = require("crypto");
const Card = require("../models/Card");
const pool = require("../config/db");

const router = express.Router();

// Hash IP for privacy (not storing full IP)
function hashIP(ip) {
  return crypto
    .createHash("sha256")
    .update(ip || "unknown")
    .digest("hex");
}

// Get card by code (myfyi.link/:code redirect)
router.get("/:code", async (req, res, next) => {
  try {
    const { code } = req.params;

    // Find card by code
    const card = await Card.findByCode(code);
    if (!card) {
      res.status(404);
      return res.render("404", { message: "Card not found" });
    }

    // Log view event (async, don't wait)
    const ip = req.ip || req.connection.remoteAddress;
    const ipHash = hashIP(ip);
    const userAgent = req.headers["user-agent"] || "";

    pool
      .query(
        "INSERT INTO analytics (card_id, event_type, ip_hash, user_agent) VALUES (?, ?, ?, ?)",
        [card.id, "view", ipHash, userAgent],
      )
      .catch((err) => console.error("Analytics error:", err));

    // Set cache headers with ETag
    const etag = crypto
      .createHash("md5")
      .update(JSON.stringify(card))
      .digest("hex");
    res.set("Cache-Control", "public, max-age=300");
    res.set("ETag", `"${etag}"`);

    // If card has buyout URL, redirect (Phase 2)
    if (card.buyout_url) {
      return res.redirect(301, card.buyout_url);
    }

    // Render EJS template with card data
    res.render("card", {
      card: {
        code: card.unique_code,
        firstName: card.first_name,
        lastName: card.last_name,
        bio: card.bio || "",
        photoUrl: card.photo_url || "",
        contactEmail: card.contact_email || "",
        handle: card.handle,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get card preview (JSON, for dashboard)
router.get("/:code/preview", async (req, res, next) => {
  try {
    const { code } = req.params;

    const card = await Card.findByCode(code);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    res.json({
      card: {
        code: card.unique_code,
        firstName: card.first_name,
        lastName: card.last_name,
        bio: card.bio || "",
        photoUrl: card.photo_url || "",
        contactEmail: card.contact_email || "",
        handle: card.handle,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
