const pool = require("../app/config/db");
require("dotenv").config();

async function seedPromoCodes() {
  try {
    const connection = await pool.getConnection();

    console.log("Seeding promo codes...");

    const promoCodes = [
      {
        code: "LAUNCH50",
        discount: 50,
        maxUses: 100,
        expiryDate: "2026-06-30",
      },
      {
        code: "EARLY100",
        discount: 100,
        maxUses: 50,
        expiryDate: "2026-05-31",
      },
      {
        code: "FRIEND25",
        discount: 25,
        maxUses: null,
        expiryDate: "2026-12-31",
      },
      {
        code: "BETATEST75",
        discount: 75,
        maxUses: 25,
        expiryDate: "2026-05-15",
      },
    ];

    for (const promo of promoCodes) {
      try {
        await connection.query(
          "INSERT INTO promo_codes (code, discount_percent, max_uses, expiry_date) VALUES (?, ?, ?, ?)",
          [promo.code, promo.discount, promo.maxUses, promo.expiryDate],
        );
        console.log(`✓ Created promo code: ${promo.code}`);
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          console.log(`⚠ Promo code already exists: ${promo.code}`);
        } else {
          throw err;
        }
      }
    }

    await connection.release();
    console.log("\n✓ Promo code seeding complete");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error.message);
    process.exit(1);
  }
}

seedPromoCodes();
