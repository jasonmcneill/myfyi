-- Migration: 003_create_subscriptions
-- Description: Create subscriptions table for Stripe billing

CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  promo_code_id INT,
  status ENUM('active', 'cancelled', 'past_due') DEFAULT 'active',
  current_period_start DATETIME,
  current_period_end DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL,
  INDEX idx_customer (customer_id),
  INDEX idx_stripe_customer (stripe_customer_id),
  INDEX idx_stripe_subscription (stripe_subscription_id),
  INDEX idx_status (status)
);
