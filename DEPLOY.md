# 四六级英语写作智能辅导 — 部署指南

> 本文档说明如何将项目部署到**宝塔面板**管理的云服务器。
> 项目包含三部分：前端（React）、后端（Node.js）、AI 服务（Python）。

---

## 快速开始

### 本地打包

```powershell
.\pack-deploy.ps1
```

生成 `deploy-package.zip`，包含以下内容：

| 文件夹 | 说明 |
|--------|------|
| `dist/` | 前端编译产物（HTML + JS + CSS） |
| `api/` | 后端代码（Express.js） |
| `ai-service/` | AI 批改服务（Python FastAPI） |
| `migrations/` | 数据库建表 + 初始数据 SQL 脚本 |
| `.env.example` | 环境变量模板 |

---

## 服务器部署步骤

### 1. 上传文件

宝塔 → 文件 → 进入 `/www/wwwroot/` → 新建文件夹 `你的域名` → 上传 `deploy-package.zip` → 解压。

解压后结构：
```
/www/wwwroot/你的域名/
├── dist/
├── api/
├── ai-service/
├── migrations/
└── .env.example
```

---

### 2. 配置环境变量

将 `.env.example` 复制为 `api/.env`，修改以下内容：

```env
# 生产环境
NODE_ENV=production

# 数据库密码（宝塔 → 数据库 → PostgreSQL → 查看密码）
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/cet_writing

# 跨域来源（填入你的域名和服务器IP）
ALLOWED_ORIGINS=http://你的服务器IP,http://你的域名,https://你的域名
```

---

### 3. 创建 PostgreSQL 数据库

**宝塔 → 软件商店 → 安装 PostgreSQL**（如果没装的话）：

- 宝塔 → 数据库 → PostgreSQL → 添加数据库
- 数据库名：`cet_writing`
- 用户名：`postgres`
- 密码：自己设置（和第 2 步一致）

---

### 4. 导入数据库

在服务器终端执行：

```bash
cd /www/wwwroot/你的域名/migrations && for f in *.sql; do PGPASSWORD='你的密码' psql -U postgres -d cet_writing -h localhost -f "$f"; done
```

导入完成后验证：
```bash
PGPASSWORD='你的密码' psql -U postgres -d cet_writing -h localhost -c "SELECT username FROM users"
```

应该输出 `admin`。

---

### 5. 安装后端依赖 & 启动 Node 项目

```bash
cd /www/wwwroot/你的域名/api && npm install
```

**创建上传目录**（后端启动时也会自动创建，但提前创建更稳妥）：
```bash
mkdir -p /www/wwwroot/你的域名/api/uploads
```

**宝塔 → 软件商店 → 安装 "Node.js版本管理器"** → 安装 Node 16.x。

**宝塔 → Node 项目 → 添加 Node 项目：**
- 项目目录：`/www/wwwroot/你的域名/api`
- 启动文件：`src/app.js`
- 项目端口：`3001`
- Node 版本：选择已安装的版本
- 绑定域名：不需要（由 Nginx 代理）

启动后验证：
```bash
curl http://localhost:3001/api/health
# 返回 {"status":"healthy","database":"connected"}
```

---

### 6. 启动 AI 服务

```bash
cd /www/wwwroot/你的域名/ai-service
pip3 install -r requirements.txt
nohup python3 main.py > ai.log 2>&1 &
```

验证：
```bash
curl http://localhost:8000/health
```

---

### 7. 配置 Nginx（前端站点）

**宝塔 → 网站 → 添加站点：**
- 域名：你的域名
- 根目录：`/www/wwwroot/你的域名/dist`

**站点设置 → 配置文件，添加反向代理：**
```nginx
# API 反向代理（添加到 server 块内）
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# React 路由支持（SPA 回退）
location / {
    try_files $uri $uri/ /index.html;
}
```

保存后重启 Nginx。

---

### 8. 配置 AI Key

1. 浏览器访问 `http://你的域名`
2. 用 `admin` / `admin123` 登录
3. 后台 → 系统配置 → 填写 DeepSeek API Key → 保存
4. **注意**：API 基础 URL 必须是 `https://api.deepseek.com/v1`（去掉多余反引号或空格）

---

## 部署文件清单

**你只需要上传 `deploy-package.zip`**，其中包含部署必需的 4 个目录：

| 目录 | 作用 |
|------|------|
| `dist/` | 前端编译产物（HTML + JS + CSS），直接托管给 Nginx |
| `api/` | 后端代码，宝塔 Node 项目运行 |
| `ai-service/` | Python AI 批改服务 |
| `migrations/` | 数据库建表 + 初始数据 SQL |

### 其他文件/文件夹为什么不需要部署

| 文件/文件夹 | 用途 | 为什么不需要 |
|------------|------|-------------|
| `src/` | React 前端源码 | 编译后变成 `dist/` |
| `public/` | 静态资源 | 编译时打包进 `dist/` |
| `node_modules/` | npm 依赖 | 服务器 `npm install` 重新生成 |
| `.trae/` | IDE 项目文档 | 仅供开发参考 |
| `package.json`、`package-lock.json` | 前端依赖声明 | 仅开发/构建时用 |
| `vite.config.ts`、`tsconfig.json` | 构建配置 | 仅开发时用 |
| `tailwind.config.js`、`postcss.config.js` | CSS 工具配置 | 编译时已处理 |
| `.gitignore`、`.dockerignore` | 版本控制排除 | 无关部署 |

---

## 常用命令

```bash
# 查看 AI 服务日志
tail -f /www/wwwroot/你的域名/ai-service/ai.log

# 重启 AI 服务
pkill -f "python3 main.py"
cd /www/wwwroot/你的域名/ai-service && nohup python3 main.py > ai.log 2>&1 &

# 查看数据库
PGPASSWORD='密码' psql -U postgres -d cet_writing -h localhost -c "SELECT * FROM users"

# 导入数据库（全新安装时）
cd /www/wwwroot/你的域名/migrations && for f in *.sql; do PGPASSWORD='密码' psql -U postgres -d cet_writing -h localhost -f "$f"; done

# 导出数据库（备份）
PGPASSWORD='密码' pg_dump -U postgres -d cet_writing -h localhost > backup.sql
```

---

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
