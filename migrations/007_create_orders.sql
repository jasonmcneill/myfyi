-- Migration: 007_create_orders
-- Description: Create orders table for card fulfillment pipeline

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  card_codes JSON NOT NULL,
  card_color ENUM('green', 'grey') NOT NULL,
  quantity INT NOT NULL,
  status ENUM('pending', 'shipped', 'printed') DEFAULT 'pending',
  notes TEXT,
  csv_needed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
