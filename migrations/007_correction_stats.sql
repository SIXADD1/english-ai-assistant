-- 批改次数统计表（只增不减，用户删记录不影响统计）
CREATE TABLE IF NOT EXISTS correction_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 将现有的 corrections 记录同步到统计表（避免重跑）
INSERT INTO correction_stats (user_id, created_at)
SELECT d.user_id, c.created_at
FROM corrections c
JOIN drafts d ON c.draft_id = d.id;
