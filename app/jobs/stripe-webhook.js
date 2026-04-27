const stripe = require("../config/stripe");
const Subscription = require("../models/Subscription");
const { transporter, templates } = require("../config/email");
require("dotenv").config();

// Handle Stripe webhook events
const handleStripeWebhook = async (event) => {
  try {
    switch (event.type) {
      case "customer.subscription.created":
        console.log("Subscription created:", event.data.object.id);
        break;

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log("Subscription updated:", subscription.id);
        // Update subscription status in DB
        const dbSubscription = await Subscription.findByStripeSubscriptionId(
          subscription.id,
        );
        if (dbSubscription) {
          await Subscription.update(dbSubscription.id, {
            status: subscription.status === "active" ? "active" : "past_due",
            current_period_start: new Date(
              subscription.current_period_start * 1000,
            ),
            current_period_end: new Date(
              subscription.current_period_end * 1000,
            ),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log("Subscription cancelled:", subscription.id);
        const dbSubscription = await Subscription.findByStripeSubscriptionId(
          subscription.id,
        );
        if (dbSubscription) {
          await Subscription.update(dbSubscription.id, { status: "cancelled" });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        console.log("Invoice paid:", invoice.id);

        // Find subscription and customer
        const subscription = await Subscription.findByStripeSubscriptionId(
          invoice.subscription,
        );
        if (subscription) {
          // Send payment receipt email
          const pool = require("../config/db");
          const [customers] = await pool.query(
            "SELECT * FROM customers WHERE id = ?",
            [subscription.customer_id],
          );

          if (customers.length > 0) {
            const customer = customers[0];
            await transporter.sendMail(
              templates.paymentReceiptEmail(
                customer.email,
                customer.first_name,
                invoice.total,
                new Date(invoice.lines.data[0].period.end * 1000),
              ),
            );
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("Invoice payment failed:", invoice.id);
        // Mark subscription as past_due
        const subscription = await Subscription.findByStripeSubscriptionId(
          invoice.subscription,
        );
        if (subscription) {
          await Subscription.update(subscription.id, { status: "past_due" });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error("Webhook error:", error);
    throw error;
  }
};

module.exports = {
  handleStripeWebhook,
};
