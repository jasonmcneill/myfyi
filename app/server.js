const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set("view engine", "ejs");
app.set("views", "./app/views");

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.tailwindcss.com",
          "https://js.stripe.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        frameSrc: ["https://js.stripe.com"],
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Signup page with Stripe key (must come before static middleware)
const fs = require("fs");
app.get("/signup.html", (req, res) => {
  console.log("Serving signup.html");
  console.log("STRIPE_PUBLISHABLE_KEY:", process.env.STRIPE_PUBLISHABLE_KEY);
  res.set("Cache-Control", "public, max-age=1800");
  let html = fs.readFileSync(__dirname + "/public/signup.html", "utf8");
  console.log("Original HTML contains '</head>':", html.includes("</head>"));
  html = html.replace(
    "</head>",
    `<script>window.STRIPE_PUBLISHABLE_KEY = '${process.env.STRIPE_PUBLISHABLE_KEY}';</script>\n</head>`,
  );
  console.log(
    "Modified HTML contains script:",
    html.includes("window.STRIPE_PUBLISHABLE_KEY"),
  );
  res.send(html);
});

// Static files with caching headers
app.use(
  express.static("app/public", {
    maxAge: "1h",
    etag: false,
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      }
    },
  }),
);

// HTML pages with caching and Stripe key injection

// Landing page
app.get("/", (req, res) => {
  res.set("Cache-Control", "public, max-age=3600");
  res.sendFile(__dirname + "/public/index.html");
});

// Signup page with Stripe key
app.get("/signup.html", (req, res) => {
  console.log("Serving signup.html");
  console.log("STRIPE_PUBLISHABLE_KEY:", process.env.STRIPE_PUBLISHABLE_KEY);
  res.set("Cache-Control", "public, max-age=1800");
  let html = fs.readFileSync(__dirname + "/public/signup.html", "utf8");
  console.log("Original HTML contains '</head>':", html.includes("</head>"));
  html = html.replace(
    "</head>",
    `<script>window.STRIPE_PUBLISHABLE_KEY = '${process.env.STRIPE_PUBLISHABLE_KEY}';</script>\n</head>`,
  );
  console.log(
    "Modified HTML contains script:",
    html.includes("window.STRIPE_PUBLISHABLE_KEY"),
  );
  res.send(html);
});

// Login page
app.get("/login.html", (req, res) => {
  res.set("Cache-Control", "public, max-age=1800");
  res.sendFile(__dirname + "/public/login.html");
});

// Dashboard (private, no cache)
app.get("/dashboard.html", (req, res) => {
  res.set("Cache-Control", "private, max-age=300");
  res.sendFile(__dirname + "/public/dashboard.html");
});

// Health check endpoint (for Docker healthcheck)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Favicon (prevent 404 errors)
app.get("/favicon.ico", (req, res) => {
  res.status(204).end(); // No content
});

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/admin", require("./routes/admin"));

// Card redirect service (myfyi.link)
app.use("/api/cards", require("./routes/cards"));

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`MyFYI server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
