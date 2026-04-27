const Stripe = require("stripe");
require("dotenv").config({ path: __dirname + "/../../.env" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
