-- 四六级英语写作智能辅导网站数据库迁移
-- 创建时间: 2026-05-31
-- 版本: 001

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    level VARCHAR(10) DEFAULT 'both',
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 素材表
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    translation TEXT,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(50),
    tags TEXT[],
    usage_scenario TEXT,
    tips TEXT,
    is_common BOOLEAN DEFAULT true,
    level VARCHAR(10),
    favorites_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 题目表
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    requirements TEXT,
    type VARCHAR(50) NOT NULL,
    level VARCHAR(10) NOT NULL,
    topic VARCHAR(50),
    difficulty VARCHAR(10),
    year INT,
    is_ai_generated BOOLEAN DEFAULT false,
    word_count_min INT,
    word_count_max INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 草稿表
CREATE TABLE IF NOT EXISTS drafts (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    word_count INT,
    status VARCHAR(20) DEFAULT 'draft',
    time_spent INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 批改结果表
CREATE TABLE IF NOT EXISTS corrections (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    score INT NOT NULL,
    score_breakdown JSONB,
    overall_comment TEXT,
    error_list JSONB,
    format_errors JSONB,
    content_comments JSONB,
    suggestions JSONB,
    revised_version TEXT,
    review_report JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. 素材收藏表
CREATE TABLE IF NOT EXISTS material_favorites (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, material_id)
);

-- 7. 训练记录表
CREATE TABLE IF NOT EXISTS training_records (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    answer TEXT,
    score INT,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. 打卡记录表
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date, type)
);

-- 9. 模考记录表
CREATE TABLE IF NOT EXISTS mock_exams (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    level VARCHAR(10) NOT NULL,
    duration INT NOT NULL,
    questions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. 模考参与记录表
CREATE TABLE IF NOT EXISTS mock_exam_participations (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mock_exam_id UUID NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    score INT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_materials_level ON materials(level);
CREATE INDEX idx_questions_level ON questions(level);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_topic ON questions(topic);
CREATE INDEX idx_drafts_user ON drafts(user_id);
CREATE INDEX idx_drafts_question ON drafts(question_id);
CREATE INDEX idx_corrections_draft ON corrections(draft_id);
CREATE INDEX idx_material_favorites_user ON material_favorites(user_id);
CREATE INDEX idx_training_records_user ON training_records(user_id);
CREATE INDEX idx_checkins_user_date ON checkins(user_id, date);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
