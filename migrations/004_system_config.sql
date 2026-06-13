-- 系统配置表
-- 创建时间: 2026-05-31
-- 版本: 004

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text)::uuid,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_system_configs_key ON system_configs(config_key);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_system_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_configs_updated_at 
BEFORE UPDATE ON system_configs 
FOR EACH ROW EXECUTE FUNCTION update_system_configs_updated_at();

-- 插入默认AI配置
INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES
('ai_api_key', '', 'password', 'AI服务API密钥'),
('ai_base_url', 'https://api.deepseek.com/v1', 'string', 'AI服务基础URL'),
('ai_model', 'deepseek-chat', 'string', 'AI模型名称'),
('ai_timeout', '60', 'number', 'AI请求超时时间(秒)'),
('ai_max_tokens', '4000', 'number', 'AI最大生成token数'),
('ai_temperature', '0.3', 'number', 'AI温度参数')
ON CONFLICT (config_key) DO NOTHING;
