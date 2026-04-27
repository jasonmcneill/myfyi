# My FYI - Phase 1 Setup & Launch Guide

## Quick Start (5 minutes)

### Prerequisites

- Docker & Docker Compose installed
- (Optional for local dev) Node 18+, MySQL 8

### Step 1: Environment Setup

```bash
cd /Users/jasonmcneill/Documents/Projects/MyFYI
cp .env.example .env
```

Edit `.env` and update:

- `STRIPE_SECRET_KEY`: Get from https://dashboard.stripe.com/apikeys
- `STRIPE_PUBLISHABLE_KEY`: Get from same page
- `STRIPE_WEBHOOK_SECRET`: Create webhook endpoint in Stripe dashboard (test mode), point to http://localhost:3000/api/auth/webhook/stripe
- `EMAIL_USER` & `EMAIL_PASSWORD`: Gmail or SendGrid credentials (or skip for dev)
- `JWT_SECRET`: Change from dev default to something random

### Step 2: Start Docker

```bash
docker-compose up --build
```

Wait for output:

```
myfyi_app     | MyFYI server running on port 3000
myfyi_app     | Environment: development
```

### Step 3: Initialize Database (New Terminal)

```bash
docker-compose exec app npm run migrate
docker-compose exec app npm run seed
```

Expected output:

```
Running migration: 001_create_promo_codes.sql
✓ All migrations completed successfully
Seeding promo codes...
✓ Promo code seeding complete
```

### Step 4: Test the App

- **Landing**: http://localhost:3000
- **Sign Up**: http://localhost:3000/signup.html
- **Log In**: http://localhost:3000/login.html
- **Test API**: http://localhost:3000/api/test

## Stripe Testing

### Test Card Numbers (Use in signup)

- **Success**: 4242 4242 4242 4242
- **Requires Auth**: 4000 0027 6000 3184
- **Decline**: 4000 0000 0000 0002

Any future date as expiry, any 3-digit CVC

### Creating a Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "+ Add Endpoint"
3. URL: `http://localhost:3000/api/auth/webhook/stripe`
4. Events to send: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed
5. Copy Webhook Signing Secret into `STRIPE_WEBHOOK_SECRET` in `.env`
6. Restart Docker: `docker-compose restart app`

## Full User Flow

### 1. Signup

```
1. Visit http://localhost:3000
2. Click "Get Started" → signup.html
3. Fill form:
   - Email: test@example.com
   - Password: Test123456 (8+ chars)
   - First Name: John
   - Last Name: Doe
   - Handle: johndoe (alphanumeric, dash, underscore)
   - Promo Code: LAUNCH50 (optional, 50% off)
4. Enter test card: 4242 4242 4242 4242
5. Click "Complete Sign Up"
6. ✓ Redirects to dashboard
```

### 2. Dashboard

```
1. Overview tab shows:
   - Your 6-char card code (e.g., A1B2C3)
   - Share URL: myfyi.link/A1B2C3
   - Subscription status
   - Total card views
2. Card Editor tab:
   - Add photo URL, bio, contact email
   - Live preview updates in real-time
   - Click "Save Changes"
3. Analytics tab:
   - 30-day view chart
   - Total views & clicks
   - Click-through rate
```

### 3. View Your Card

```
1. From dashboard, copy code (e.g., A1B2C3)
2. Visit: http://localhost:3000/api/cards/A1B2C3
3. ✓ Beautiful card renders with your info
4. Repeat visits increment view counter
5. In 5 min, check analytics tab to see view count
```

### 4. Admin Panel (Future)

```
For now, admin API exists at:
- GET /api/admin/customers (requires token)
- GET /api/admin/orders
- GET /api/admin/orders/export/csv
- GET /api/admin/stats
```

## API Reference

### Authentication

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123456",
    "firstName":"John",
    "lastName":"Doe",
    "handle":"johndoe"
  }'

# Response:
{
  "token": "eyJhbGc...",
  "customer": {...},
  "clientSecret": "pi_..."
}

# Save token to localStorage, use in requests:
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Customer Operations

```bash
# Get dashboard
curl http://localhost:3000/api/customers/dashboard \
  -H "Authorization: Bearer <token>"

# Update card
curl -X PUT http://localhost:3000/api/customers/card \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Product Designer and Coffee Enthusiast",
    "contactEmail": "john@example.com",
    "photoUrl": "https://example.com/photo.jpg"
  }'

# Get analytics
curl http://localhost:3000/api/customers/analytics \
  -H "Authorization: Bearer <token>"
```

### Card Rendering

```bash
# View card by code (public, no auth needed)
curl http://localhost:3000/api/cards/A1B2C3

# Get card preview JSON
curl http://localhost:3000/api/cards/A1B2C3/preview
```

## Promo Codes in Database

Seed script automatically creates:

- `LAUNCH50`: 50% off, max 100 uses, expires 2026-06-30
- `EARLY100`: 100% off, max 50 uses, expires 2026-05-31
- `FRIEND25`: 25% off, unlimited, expires 2026-12-31
- `BETATEST75`: 75% off, max 25 uses, expires 2026-05-15

Use any of these in signup form.

## Database Access

### Via Docker

```bash
# Connect to MySQL
docker-compose exec db mysql -u myfyi -p -D myfyi
# Password: root

# Query customers
SELECT id, email, first_name, last_name, handle FROM customers;

# Query subscriptions
SELECT * FROM subscriptions;

# Query analytics
SELECT card_id, event_type, created_at FROM analytics ORDER BY created_at DESC LIMIT 10;
```

### Via Local MySQL Client

```bash
mysql -h 127.0.0.1 -u myfyi -p myfyi
```

## File Structure Quick Reference

```
/app
  /config          ← DB, Stripe, Email configuration
  /routes          ← API endpoints (auth, customers, cards, admin)
  /models          ← Database models (Customer, Card, Subscription)
  /middleware      ← Auth & error handling
  /public          ← Frontend HTML, CSS, JS
  /views           ← EJS templates (card.ejs)
  /jobs            ← Background jobs (stripe-webhook.js)
  server.js        ← Express entry point

/migrations        ← SQL migration files
/seeds             ← Database seeding scripts
/scripts           ← Utility scripts (migrate.js)

docker-compose.yml ← Docker services (app + MySQL)
Dockerfile         ← App container definition
package.json       ← Dependencies & scripts
.env              ← Environment variables (create from .env.example)
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change PORT in .env
PORT=3001
```

### Database Connection Refused

```bash
# Make sure MySQL container is running
docker-compose ps

# Check logs
docker-compose logs db

# Restart services
docker-compose down
docker-compose up --build
```

### Stripe Payment Fails

1. Verify `STRIPE_SECRET_KEY` in `.env`
2. Make sure you're using test-mode keys (start with `sk_test_` and `pk_test_`)
3. Check Stripe Dashboard → Logs for errors
4. Webhook secret must match exactly

### Migrations Fail

```bash
# Check if migrations already ran
docker-compose exec db mysql -u myfyi -p myfyi -e "SHOW TABLES;"

# If tables exist but want to reset
docker volume rm myfyi_mysql_data
docker-compose up --build
docker-compose exec app npm run migrate
docker-compose exec app npm run seed
```

## Next Steps (Phase 2)

- [ ] OAuth login (Google, LinkedIn)
- [ ] Module system UI (social links, contact forms, etc.)
- [ ] Animation effects (fade, bounce, flip)
- [ ] Buyout URL feature
- [ ] Advanced analytics (location, device, referrer)
- [ ] Custom admin panel UI
- [ ] Email notifications (signup confirmations, payment receipts)
- [ ] Testing framework (Jest, Supertest)

## Support

For issues:

1. Check logs: `docker-compose logs app`
2. Check database: `docker-compose exec db mysql ...`
3. Verify .env has all required keys
4. Review README.md for full documentation

## Deployment

When ready to move to production:

1. Update environment variables for Stripe live keys
2. Change Docker image to production Node image
3. Use strong JWT_SECRET
4. Configure email service (Gmail, SendGrid, etc.)
5. Set up HTTPS/TLS (via Nginx reverse proxy on DigitalOcean)
6. Point myfyi.cards and myfyi.link domains to your server
7. Update FRONTEND_URL and CARD_REDIRECT_URL in .env
