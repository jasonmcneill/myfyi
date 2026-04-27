const nodemailer = require("nodemailer");
require("dotenv").config();

// Configure transporter (using Gmail or SendGrid)
let transporter;

if (process.env.SENDGRID_API_KEY) {
  transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,
    auth: {
      user: "apikey",
      pass: process.env.SENDGRID_API_KEY,
    },
  });
} else {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

// Email templates
const templates = {
  confirmationEmail: (email, name, verificationLink) => ({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Welcome to My FYI - Confirm Your Email",
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Thank you for signing up for My FYI. Your digital business card is ready to customize.</p>
      <p><a href="${verificationLink}">Verify your email</a></p>
    `,
  }),

  paymentReceiptEmail: (email, name, amount, nextBillingDate) => ({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "My FYI Subscription - Payment Receipt",
    html: `
      <h1>Payment Received</h1>
      <p>Thank you, ${name}! Your subscription payment of $${(amount / 100).toFixed(2)} has been processed.</p>
      <p>Next billing date: ${new Date(nextBillingDate).toLocaleDateString()}</p>
    `,
  }),

  adminOrderNotificationEmail: (
    adminEmail,
    customerName,
    cardCodes,
    cardColor,
    quantity,
  ) => ({
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: "New Order - My FYI Fulfillment",
    html: `
      <h1>New Order</h1>
      <p><strong>Customer:</strong> ${customerName}</p>
      <p><strong>Card Color:</strong> ${cardColor}</p>
      <p><strong>Quantity:</strong> ${quantity}</p>
      <p><strong>Card Codes:</strong> ${cardCodes.join(", ")}</p>
      <p>Log in to your admin panel to view the full order details.</p>
    `,
  }),
};

module.exports = {
  transporter,
  templates,
};
