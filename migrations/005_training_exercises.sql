-- 专项训练练习表
-- 创建时间: 2026-06-01
-- 版本: 005

SET client_encoding = 'UTF8';

CREATE TABLE IF NOT EXISTS training_exercises (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    requirements TEXT,
    level VARCHAR(10) NOT NULL,
    answer JSONB NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_training_exercises_type ON training_exercises(type);
CREATE INDEX idx_training_exercises_level ON training_exercises(level);
CREATE INDEX idx_training_exercises_type_level ON training_exercises(type, level);

ALTER TABLE training_records ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES training_exercises(id) ON DELETE SET NULL;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS ai_feedback TEXT;
