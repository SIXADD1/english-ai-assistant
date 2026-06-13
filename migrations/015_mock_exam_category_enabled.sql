-- 015: 为 mock_exams 添加 category 和 enabled 字段

ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'mock';
ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
