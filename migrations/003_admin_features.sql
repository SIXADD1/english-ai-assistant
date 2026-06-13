-- 管理员功能数据库迁移
-- 创建时间: 2026-05-31
-- 版本: 003

-- 更新用户表，添加角色字段
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) DEFAULT 'user';

-- 创建管理员账号（密码已哈希，原始密码：admin123）
-- 使用 bcrypt.hash('admin123', 10) 生成
INSERT INTO users (id, username, email, password_hash, level, role) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', 'admin@example.com', '$2b$10$NGPkVCuJsnhcZVayUpcG3.8yYn7fFFk1/eJEN8Wda1TAGBZm0X9ki', 'both', 'admin');

-- 创建管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_time ON admin_logs(created_at);

-- 更新素材表，添加创建者字段
ALTER TABLE materials 
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 更新题目表，添加创建者字段
ALTER TABLE questions 
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 更新用户表，添加状态字段（用于审核控制）
ALTER TABLE users 
ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- 更新初始数据中的创建者字段
UPDATE materials SET created_by = (SELECT id FROM users WHERE username = 'admin');
UPDATE questions SET created_by = (SELECT id FROM users WHERE username = 'admin');
