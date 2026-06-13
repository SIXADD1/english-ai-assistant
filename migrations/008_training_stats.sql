-- 专项训练次数统计表（只增不减，用户删记录不影响统计）
CREATE TABLE IF NOT EXISTS training_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 将现有的训练记录同步到统计表
INSERT INTO training_stats (user_id, created_at)
SELECT user_id, created_at
FROM training_records;
