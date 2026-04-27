const pool = require("../config/db");

class Subscription {
  // Create a subscription
  static async create(
    customerId,
    stripeCustomerId,
    stripeSubscriptionId,
    promoCodeId = null,
  ) {
    const [result] = await pool.query(
      `INSERT INTO subscriptions (customer_id, stripe_customer_id, stripe_subscription_id, promo_code_id, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [customerId, stripeCustomerId, stripeSubscriptionId, promoCodeId],
    );
    return result.insertId;
  }

  // Find subscription by customer ID
  static async findByCustomerId(customerId) {
    const [rows] = await pool.query(
      "SELECT * FROM subscriptions WHERE customer_id = ?",
      [customerId],
    );
    return rows[0];
  }

  // Find subscription by Stripe customer ID
  static async findByStripeCustomerId(stripeCustomerId) {
    const [rows] = await pool.query(
      "SELECT * FROM subscriptions WHERE stripe_customer_id = ?",
      [stripeCustomerId],
    );
    return rows[0];
  }

  // Find subscription by Stripe subscription ID
  static async findByStripeSubscriptionId(stripeSubscriptionId) {
    const [rows] = await pool.query(
      "SELECT * FROM subscriptions WHERE stripe_subscription_id = ?",
      [stripeSubscriptionId],
    );
    return rows[0];
  }

  // Update subscription
  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    values.push(id);

    const query = `UPDATE subscriptions SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`;
    await pool.query(query, values);
  }

  // Update subscription by customer ID
  static async updateByCustomerId(customerId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    values.push(customerId);

    const query = `UPDATE subscriptions SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE customer_id = ?`;
    await pool.query(query, values);
  }

  // Get subscription status
  static async getStatus(customerId) {
    const subscription = await this.findByCustomerId(customerId);
    return subscription ? subscription.status : null;
  }

  // Check if subscription is active
  static async isActive(customerId) {
    const subscription = await this.findByCustomerId(customerId);
    return subscription && subscription.status === "active";
  }
}

module.exports = Subscription;
