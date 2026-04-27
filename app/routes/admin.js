const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const Card = require("../models/Card");
const pool = require("../config/db");

const router = express.Router();

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Admin token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err || !decoded.adminId) {
      return res.status(403).json({ error: "Invalid admin token" });
    }
    req.admin = decoded;
    next();
  });
};

// Admin login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find admin user
      const [admins] = await pool.query(
        "SELECT * FROM admin_users WHERE email = ?",
        [email],
      );

      if (admins.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const admin = admins[0];
      const passwordValid = await bcrypt.compare(password, admin.password_hash);
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { adminId: admin.id, email: admin.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      res.json({
        message: "Admin login successful",
        token,
        admin: { id: admin.id, email: admin.email },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get all customers (admin)
router.get("/customers", authenticateAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const customers = await Customer.getAll(limit, offset);
    const totalCount = await Customer.count();

    // Get subscription info for each customer
    const customersWithStatus = await Promise.all(
      customers.map(async (customer) => {
        const subscription = await Subscription.findByCustomerId(customer.id);
        return {
          ...customer,
          subscriptionStatus: subscription?.status || "inactive",
        };
      }),
    );

    res.json({
      customers: customersWithStatus,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get orders for fulfillment
router.get("/orders", authenticateAdmin, async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, c.first_name, c.last_name, ca.unique_code 
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN cards ca ON c.id = ca.customer_id
       ORDER BY o.created_at DESC`,
    );

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// CSV export for fulfillment
router.get("/orders/export/csv", authenticateAdmin, async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      `SELECT c.first_name, c.last_name, c.email, o.card_codes, o.card_color, o.quantity, o.status, o.created_at
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.status = 'pending'
       ORDER BY o.created_at ASC`,
    );

    // Generate CSV
    let csv =
      "First Name,Last Name,Email,Card Codes,Card Color,Quantity,Status,Created Date\n";

    orders.forEach((order) => {
      const codes = JSON.parse(order.card_codes).join(";");
      const date = new Date(order.created_at).toLocaleDateString();
      csv += `"${order.first_name}","${order.last_name}","${order.email}","${codes}","${order.card_color}",${order.quantity},"${order.status}","${date}"\n`;
    });

    res.setHeader("Content-Disposition", 'attachment; filename="orders.csv"');
    res.setHeader("Content-Type", "text/csv");
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// Update order status
router.put("/orders/:orderId", authenticateAdmin, async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    await pool.query(
      `UPDATE orders SET ${Object.keys(updates)
        .map((k) => `${k} = ?`)
        .join(", ")} WHERE id = ?`,
      [...Object.values(updates), orderId],
    );

    res.json({ message: "Order updated successfully" });
  } catch (error) {
    next(error);
  }
});

// Get dashboard stats (admin)
router.get("/stats", authenticateAdmin, async (req, res, next) => {
  try {
    const [totalCustomers] = await pool.query(
      "SELECT COUNT(*) as count FROM customers",
    );
    const [activeSubscriptions] = await pool.query(
      "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'",
    );
    const [pendingOrders] = await pool.query(
      "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'",
    );
    const [totalViews] = await pool.query(
      "SELECT COUNT(*) as count FROM analytics WHERE event_type = ?",
      ["view"],
    );

    res.json({
      stats: {
        totalCustomers: totalCustomers[0].count,
        activeSubscriptions: activeSubscriptions[0].count,
        pendingOrders: pendingOrders[0].count,
        totalViews: totalViews[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
