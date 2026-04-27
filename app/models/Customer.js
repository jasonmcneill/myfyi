const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

class Customer {
  // Create a new customer
  static async create(email, passwordHash, firstName, lastName, handle) {
    const [result] = await pool.query(
      "INSERT INTO customers (email, password_hash, first_name, last_name, handle) VALUES (?, ?, ?, ?, ?)",
      [email, passwordHash, firstName, lastName, handle],
    );
    return result.insertId;
  }

  // Find customer by email
  static async findByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM customers WHERE email = ?", [
      email,
    ]);
    return rows[0];
  }

  // Find customer by ID
  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM customers WHERE id = ?", [
      id,
    ]);
    return rows[0];
  }

  // Find customer by handle
  static async findByHandle(handle) {
    const [rows] = await pool.query(
      "SELECT * FROM customers WHERE handle = ?",
      [handle],
    );
    return rows[0];
  }

  // Update customer
  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    values.push(id);

    const query = `UPDATE customers SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`;
    await pool.query(query, values);
  }

  // Get all customers (admin)
  static async getAll(limit = 50, offset = 0) {
    const [rows] = await pool.query(
      "SELECT id, email, first_name, last_name, handle, created_at FROM customers LIMIT ? OFFSET ?",
      [limit, offset],
    );
    return rows;
  }

  // Count total customers
  static async count() {
    const [rows] = await pool.query("SELECT COUNT(*) as count FROM customers");
    return rows[0].count;
  }
}

module.exports = Customer;
