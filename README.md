# My FYI - Electronic Business Card Platform

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development without Docker)
- MySQL 8 (if running without Docker)

### Quick Start with Docker

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Edit `.env` with your Stripe and email configuration

3. Build and start containers:

```bash
docker-compose up --build
```

4. Run migrations (in a separate terminal):

```bash
docker-compose exec app npm run migrate
docker-compose exec app npm run seed
```

5. Access the application:

- Frontend: http://localhost:3000
- API: http://localhost:3000/api

### Local Development (without Docker)

1. Install dependencies:

```bash
npm install
```

2. Set up MySQL database:

```bash
mysql -u root -p
CREATE DATABASE myfyi;
```

3. Configure `.env` file

4. Run migrations:

```bash
node scripts/migrate.js
npm run seed
```

5. Start development server:

```bash
npm run dev
```

## Project Structure

```
/app
  /config        - Database, Stripe, Email configuration
  /routes        - API routes (auth, customers, admin, cards)
  /controllers   - Business logic
  /middleware    - Auth, error handling
  /models        - Database models
  /views         - EJS templates
  /public        - Static files (CSS, JS, HTML)
  /jobs          - Background jobs
/migrations      - SQL migrations
/seeds           - Database seeders
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Customers

- `GET /api/customers/dashboard` - Get customer dashboard
- `PUT /api/customers/card` - Update card
- `GET /api/customers/card/preview` - Get card preview
- `GET /api/customers/analytics` - Get analytics

### Cards (Redirect Service)

- `GET /api/cards/:code` - Get card by code

### Admin

- `POST /api/admin/login` - Admin login
- `GET /api/admin/customers` - Get all customers
- `GET /api/admin/orders` - Get orders
- `GET /api/admin/orders/export/csv` - Export orders as CSV
- `PUT /api/admin/orders/:orderId` - Update order
- `GET /api/admin/stats` - Get dashboard stats

## Phase 1 Implementation Status

- [x] Project structure
- [x] Docker configuration
- [x] Database schema & migrations
- [x] Express app setup
- [x] Authentication (JWT, password hashing)
- [x] Database models (Customer, Card, Subscription)
- [x] Configuration files (DB, Stripe, Email)
- [x] Core routes (auth, customers, cards, admin)
- [x] EJS card template
- [x] Service Worker template
- [ ] Stripe payment integration (webhook handlers)
- [ ] Email templates and sending
- [ ] Landing page (static files)
- [ ] Dashboard UI (frontend)
- [ ] Card editor UI (frontend)
- [ ] Analytics tracking
- [ ] Admin panel UI
- [ ] Testing & deployment

## Environment Variables

See `.env.example` for required variables:

- Database credentials
- JWT secret
- Stripe API keys
- Email configuration
- Admin email address

## Notes

- All passwords are hashed using bcryptjs
- JWT tokens expire after 7 days
- Analytics IP addresses are hashed for privacy
- Card codes are 6-character alphanumeric strings
- Service Worker uses versioned filenames for cache busting
