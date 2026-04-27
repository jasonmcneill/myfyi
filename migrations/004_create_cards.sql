-- Migration: 004_create_cards
-- Description: Create cards table for customer business cards

CREATE TABLE IF NOT EXISTS cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL UNIQUE,
  unique_code VARCHAR(6) UNIQUE NOT NULL,
  photo_url VARCHAR(512),
  photo_key VARCHAR(255),
  bio TEXT,
  contact_email VARCHAR(255),
  buyout_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_unique_code (unique_code),
  INDEX idx_customer (customer_id)
);
