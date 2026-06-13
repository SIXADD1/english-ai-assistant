CREATE TABLE feedback (
  id VARCHAR(36) PRIMARY KEY,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  contact VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
