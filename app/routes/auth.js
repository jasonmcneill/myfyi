const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const Customer = require("../models/Customer");
const Card = require("../models/Card");
const Subscription = require("../models/Subscription");
const { generateToken, authenticateToken } = require("../middleware/auth");
const stripe = require("../config/stripe");
const { transporter, templates } = require("../config/email");
const { handleStripeWebhook } = require("../jobs/stripe-webhook");
const router = express.Router();

// Signup endpoint
router.post(
  "/signup",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("firstName").trim().notEmpty(),
    body("lastName").trim().notEmpty(),
    body("handle")
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_-]+$/),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, handle, promoCode } =
        req.body;

      // Check if customer exists
      const existingCustomer = await Customer.findByEmail(email);
      if (existingCustomer) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // Check if handle is taken
      const existingHandle = await Customer.findByHandle(handle);
      if (existingHandle) {
        return res.status(409).json({ error: "Handle already taken" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create customer
      const customerId = await Customer.create(
        email,
        passwordHash,
        firstName,
        lastName,
        handle,
      );

      // Create card
      const card = await Card.create(customerId);

      // Validate promo code (if provided)
      let promoCodeId = null;
      let discount = 0;

      if (promoCode) {
        const [promoRows] = await require("../config/db").query(
          "SELECT * FROM promo_codes WHERE code = ? AND (expiry_date IS NULL OR expiry_date > NOW()) AND (max_uses IS NULL OR uses_count < max_uses)",
          [promoCode],
        );
        if (promoRows.length > 0) {
          promoCodeId = promoRows[0].id;
          discount = promoRows[0].discount_percent;
          // Update promo code usage
          await require("../config/db").query(
            "UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = ?",
            [promoCodeId],
          );
        }
      }

      // Create Stripe customer and subscription
      const stripeCustomer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
      });

      const subscriptionPrice = 795; // $7.95 in cents
      const discountedPrice = Math.round(
        subscriptionPrice * (1 - discount / 100),
      );

      // Create Stripe subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "My FYI Monthly Subscription",
              },
              unit_amount: discountedPrice,
              recurring: {
                interval: "month",
              },
            },
          },
        ],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

      // Save subscription to DB
      const subscriptionId = await Subscription.create(
        customerId,
        stripeCustomer.id,
        stripeSubscription.id,
        promoCodeId,
      );

      // Send confirmation email
      await transporter.sendMail(
        templates.confirmationEmail(
          email,
          firstName,
          `${process.env.FRONTEND_URL}/dashboard`,
        ),
      );

      // Generate JWT token
      const token = generateToken({ id: customerId, email });

      res.status(201).json({
        message: "Signup successful",
        token,
        customer: { id: customerId, email, firstName, lastName, handle },
        card: { code: card.uniqueCode },
        clientSecret:
          stripeSubscription.latest_invoice.payment_intent.client_secret,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Login endpoint
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

      // Find customer
      const customer = await Customer.findByEmail(email);
      if (!customer) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check password
      const passwordValid = await bcrypt.compare(
        password,
        customer.password_hash,
      );
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate token
      const token = generateToken({ id: customer.id, email: customer.email });

      res.json({
        message: "Login successful",
        token,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          handle: customer.handle,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get current user
router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.user.id);
    if (!customer) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      handle: customer.handle,
    });
  } catch (error) {
    next(error);
  }
});

// Stripe webhook handler
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const sig = req.headers["stripe-signature"];
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // Handle the event
      await handleStripeWebhook(event);
      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  },
);

// Create payment intent for subscription (used by frontend)
router.post("/payment-intent", authenticateToken, async (req, res, next) => {
  try {
    const subscription = await Subscription.findByCustomerId(req.user.id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    // Get the subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id,
    );

    // Get the latest invoice payment intent
    if (stripeSubscription.latest_invoice) {
      const invoice = await stripe.invoices.retrieve(
        stripeSubscription.latest_invoice,
      );

      if (invoice.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          invoice.payment_intent.id,
        );
        return res.json({
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status,
        });
      }
    }

    res.status(400).json({ error: "No payment intent available" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
