-- Migration: 006_create_analytics
-- Description: Create analytics table for tracking card views and clicks

CREATE TABLE IF NOT EXISTS analytics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  card_id INT NOT NULL,
  event_type ENUM('view', 'click') DEFAULT 'view',
  clicked_module_id INT,
  user_agent TEXT,
  ip_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  INDEX idx_card (card_id),
  INDEX idx_created_at (created_at),
  INDEX idx_event_type (event_type)
);
