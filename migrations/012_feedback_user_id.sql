-- 为feedback表添加user_id字段
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
