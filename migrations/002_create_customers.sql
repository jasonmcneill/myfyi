-- Migration: 002_create_customers
-- Description: Create customers table for user accounts

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  oauth_google_id VARCHAR(255),
  oauth_linkedin_id VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  handle VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_handle (handle),
  INDEX idx_oauth_google (oauth_google_id),
  INDEX idx_oauth_linkedin (oauth_linkedin_id)
);
