const pool = require("../config/db");
const crypto = require("crypto");

// Generate a random 6-character alphanumeric code
function generateUniqueCode() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

class Card {
  // Create a new card
  static async create(customerId) {
    let uniqueCode;
    let tries = 0;

    // Ensure unique code
    while (tries < 10) {
      uniqueCode = generateUniqueCode();
      const existing = await this.findByCode(uniqueCode);
      if (!existing) break;
      tries++;
    }

    if (tries >= 10) {
      throw new Error("Failed to generate unique card code");
    }

    const [result] = await pool.query(
      "INSERT INTO cards (customer_id, unique_code, contact_email) VALUES (?, ?, ?)",
      [customerId, uniqueCode, null],
    );

    return {
      id: result.insertId,
      customerId,
      uniqueCode,
    };
  }

  // Find card by unique code
  static async findByCode(code) {
    const [rows] = await pool.query(
      `SELECT c.*, cust.handle, cust.first_name, cust.last_name, cust.email
       FROM cards c
       JOIN customers cust ON c.customer_id = cust.id
       WHERE c.unique_code = ?`,
      [code],
    );
    return rows[0];
  }

  // Find card by customer ID
  static async findByCustomerId(customerId) {
    const [rows] = await pool.query(
      "SELECT * FROM cards WHERE customer_id = ?",
      [customerId],
    );
    return rows[0];
  }

  // Find card by ID
  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM cards WHERE id = ?", [id]);
    return rows[0];
  }

  // Update card
  static async update(customerId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    values.push(customerId);

    const query = `UPDATE cards SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE customer_id = ?`;
    await pool.query(query, values);
  }

  // Get card with customer details
  static async getCardWithDetails(customerId) {
    const [rows] = await pool.query(
      `SELECT c.*, cust.first_name, cust.last_name, cust.email, cust.handle
       FROM cards c
       JOIN customers cust ON c.customer_id = cust.id
       WHERE c.customer_id = ?`,
      [customerId],
    );
    return rows[0];
  }
}

module.exports = Card;
