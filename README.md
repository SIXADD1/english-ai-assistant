# 英语 AI 助手

在线写作批改与专项训练平台，支持四六级作文 AI 智能批改。

---

## 三层架构：前端 / 后端 / AI

这个项目包含三个独立的服务，各自有自己的依赖包：

```
./                              ← 前端项目（React + Vite）
├── package.json                ← 前端依赖清单："我需要 React、Ant Design..."
├── node_modules/               ← 前端依赖包（React、Vite、Antd...）
├── src/                        ← 前端源码
└── ...

api/                          ← 后端项目（Node.js + Express）
├── package.json                ← 后端依赖清单："我需要 Express、pg（PostgreSQL）..."
├── node_modules/               ← 后端依赖包（Express、pg、JWT...）
└── src/app.js                  ← 后端代码

ai-service/                   ← AI 服务（Python + FastAPI）
├── requirements.txt            ← Python 依赖清单
└── main.py                     ← AI 服务入口
```

| | 前端 | 后端 | AI 服务 |
|------|------|------|------|
| 在哪 | 根目录 | `api/` | `ai-service/` |
| 语言 | TypeScript + JSX | JavaScript | Python |
| 依赖 | `npm install`（根目录） | `cd api && npm install` | `pip install -r requirements.txt` |
| 启动 | `npm run dev` | `npm run server` | `python main.py` |
| 端口 | 3000 | 3001 | 8000 |
| 部署 | 编译成 `dist/` 给 Nginx | 源码直接跑 | 源码直接跑 |

> 前端和后端各有一个 `node_modules/`，因为它们是完全独立的两个项目，用不同的包。安装依赖要分别在各自目录执行。

---

## 项目结构（每个文件都是干嘛的）

### 四个核心目录 —— 部署用的就是这四个

```
dist/
├── index.html              # 网站入口，浏览器打开的就是它
├── vite.svg                # 网页小图标
└── assets/
    ├── index-xxx.css       # 所有样式压缩版（Tailwind + 自定义 CSS）
    └── index-xxx.js        # 所有代码压缩版（React + 依赖全打包）
```

```
api/
├── src/
│   └── app.js              # 后端唯一代码文件，所有接口全在这一个文件里
├── package.json            # 依赖清单（npm install 靠它知道装什么）
├── package-lock.json       # 锁死版本号，保证每次装的依赖版本一致
└── .env                    # 环境变量（数据库密码、JWT密钥、API Key等）
```

```
ai-service/
├── main.py                 # 启动文件：python3 main.py（端口 8000）
├── correction_service.py   # 核心：调 DeepSeek API 批改作文（max_tokens 由管理后台统一配置）
└── requirements.txt        # Python 依赖清单（pip install 靠它装包）
```

```
migrations/
├── 001_init_schema.sql             # 建表（users、questions、drafts 等）
├── 002_init_data.sql               # 初始素材 + 题目数据
├── 003_admin_features.sql          # 管理员功能（admin 账号、权限）
├── 004_system_config.sql           # 系统配置表（AI Key、模型参数）
├── 005_training_exercises.sql      # 专项训练表结构
├── 006_training_exercises_data.sql # 专项训练题目
├── 007_correction_stats.sql        # 批改统计
├── 008_training_stats.sql          # 训练统计
├── 009_training_resets.sql         # 训练重置
├── 010_materials_questions_active.sql  # 素材/题目激活状态
├── 011_feedback.sql                # 用户反馈表（rating、category、content 等）
├── 012_feedback_user_id.sql        # 反馈表添加 user_id 字段，关联用户
├── 013_notifications.sql           # 通知表 + 通知接收者表
├── 014_mock_exam_data.sql          # 模考数据（试卷/题目/评分表）
└── 015_mock_exam_category_enabled.sql # 模考表增加分类和启用字段
```
> 按数字顺序执行。

---

### src/ —— React 前端源码（只开发用）

```
src/
├── main.tsx                # 入口，React 从这里启动
├── App.tsx                 # 路由配置，决定 / 访问哪个页面
├── components/
│   └── common/
│       ├── Header.tsx      # 网站顶部导航栏
│       ├── NotificationPopover.tsx  # 通知中心（消息图标 + 通知列表 + 详情弹窗）
│       └── Footer.tsx      # 网站底部
├── pages/
│   ├── Home/Home.tsx       # 首页
│   ├── Login/Login.tsx     # 登录页
│   ├── Register/Register.tsx   # 注册页
│   ├── Writing/
│   │   ├── Writing.tsx     # 写作题目列表
│   │   └── WritingPage.tsx # 写作编辑器 + 提交
│   ├── Correction/
│   │   └── CorrectionSimple.tsx # 批改结果页
│   ├── Training/
│   │   ├── Training.tsx        # 专项训练主页
│   │   ├── TopicAnalysis/TopicAnalysis.tsx   # 审题构思
│   │   ├── MaterialApply/MaterialApply.tsx   # 素材运用
│   │   ├── OpenClose/OpenClose.tsx           # 开放式结文
│   │   └── Format/Format.tsx                 # 文体格式
│   ├── Material/Material.tsx  # 写作素材库
│   ├── MockExam/
│   │   ├── MockExam.tsx     # 模考列表（试卷分类/级别筛选）
│   │   ├── ExamPage.tsx     # 模考答题页（计时、答题卡、交卷）
│   │   └── ExamResultPage.tsx # 模考结果页（评分、逐题解析）
│   ├── Personal/Personal.tsx  # 个人中心
│   ├── Feedback/Feedback.tsx  # 用户意见反馈
│   └── Admin/
│       ├── AdminLayout.tsx        # 后台布局框架
│       ├── Dashboard.tsx          # 后台首页统计
│       ├── ConfigManagement.tsx   # 系统配置（API Key 等）
│       ├── MaterialManagement.tsx # 素材管理
│       ├── QuestionManagement.tsx # 题目管理
│       ├── TrainingExerciseManagement.tsx  # 训练题管理
│       ├── NotificationManagement.tsx  # 通知管理（发送通知 + 欢迎通知编辑 + 批量删除）
│       ├── UserManagement.tsx     # 用户管理
│       ├── FeedbackManagement.tsx  # 用户反馈管理
│       ├── UserStats.tsx          # 用户统计
│       ├── CorrectionStats.tsx    # 批改统计
│       └── MockExamAdmin.tsx      # 模考管理（试卷增删改、Section拖拽排序、组卷）
├── services/
│   ├── api.ts              # axios 实例 + 请求拦截
│   ├── userService.ts      # 登录/注册 API
│   ├── questionService.ts  # 题目 API
│   ├── correctionService.ts # 批改 API
│   ├── trainingService.ts  # 训练 API
│   ├── materialService.ts  # 素材 API
│   ├── mockExamService.ts  # 模考 API
│   ├── adminService.ts     # 管理后台 API
│   └── notificationService.ts  # 通知 API
├── stores/
│   ├── userStore.ts        # 用户登录状态管理
│   ├── writingStore.ts     # 写作状态管理
│   ├── examStore.ts        # 模考答题状态管理（计时、答案、标记）
│   └── materialStore.ts    # 素材状态管理
├── types/
│   └── index.ts            # TypeScript 类型定义
└── assets/
    └── styles/
        └── index.css       # 全局自定义样式
```
> `npm run build` 后，这 50+ 个文件全部编译压缩成 `dist/assets/` 下的 **2 个文件**。

**`npm run build` 到底干了什么：**

```
输入                              输出
─────────────────────────────────────────
index.html ──────────┐
src/ (你的代码) ──────┤
public/ (图标) ───────┤──→ Vite 编译 → dist/
node_modules/ (依赖) ─┤                  ├── index.html
tailwind.config.js ───┤                  └── assets/
postcss.config.js ────┤                      ├── xxx.css
tsconfig.json ────────┘                      └── xxx.js
```

> 后端 `api/` 不需要编译，Node.js 直接执行 `app.js`。

---

### 根目录散文件

| 文件 | 干什么的 |
|------|---------|
| `index.html` | Vite 构建入口，编译时读取这个 → 生成 `dist/index.html` |
| `package.json` | 前端项目配置，写了 `npm run dev` / `npm run build` 等命令 |
| `package-lock.json` | 锁死依赖版本，保证每人装的一致 |
| `pack-deploy.ps1` | **一键打包脚本**，执行它就生成部署包 |
| `vite.config.ts` | Vite 配置（开发端口 3000、代理 /api 到后端） |
| `tsconfig.json` | TypeScript 编译规则 |
| `tsconfig.node.json` | Vite 工具的 TS 配置（跟你写的代码无关） |
| `tailwind.config.js` | Tailwind CSS 规则（自定义颜色、间距等） |
| `postcss.config.js` | CSS 自动加浏览器前缀 |
| `.env.example` | 环境变量参考模板（部署时复制这个改） |
| `.gitignore` | 告诉 Git 哪些文件不提交 |

---

## 打包流程（前端 vs 后端）

### 前端打包：编译

`npm run build` 干了什么？

```
输入（6 个来源）                    输出（3 个文件）
─────────────────────────────────────────────────────
index.html ──────────┐
src/ (你的代码) ──────┤           Vite
public/ (图标) ───────┤────────── 编译 ───→ dist/
node_modules/ (依赖) ─┤                      ├── index.html
tailwind.config.js ───┤                      └── assets/
postcss.config.js ────┤                          ├── xxx.css  ← 所有样式
tsconfig.json ────────┘                          └── xxx.js   ← 所有代码
```

**怎么知道打包哪些文件？**

1. Vite 打开 `index.html`
2. 发现 `<script src="/src/main.tsx">`
3. 从 `main.tsx` 出发，沿着代码里所有 `import` 语句，把引用到的每个文件都拉进来（你的代码、组件、React、Ant Design……）
4. 全部压缩、合并成 2 个文件（一个 JS、一个 CSS），连同 `index.html` 一共 3 个文件输出到 `dist/`

**谁控制这个过程？**

| 文件 | 管什么 |
|------|--------|
| `index.html` | 入口文件，告诉 Vite 从 `src/main.tsx` 开始 |
| `vite.config.ts` | 怎么编译（JSX → JS、路径别名、端口等），不写也能跑 |
| `tsconfig.json` | TypeScript 类型检查规则 |
| `tailwind.config.js` | 扫描你代码里用了哪些 Tailwind 类，只打包用到的 CSS |
| `package.json` | `"build": "tsc && vite build"` ← 触发命令 |

> Vite 默认输出到 `dist/`，就算没有 `vite.config.ts` 也能打包。

---

### 后端打包：直接压缩源码

后端**不需要编译**，因为 Node.js 直接认识 JavaScript。

```
api/src/app.js ───→ 宝塔 Node 项目直接 node 执行
```

| | 前端 | 后端 |
|------|------|------|
| 语言 | TypeScript + JSX | JavaScript |
| 浏览器 / Node 能直接跑？ | ❌ 不认识 TSX 和 import | ✅ Node 支持 import |
| 需要编译吗？ | 需要（Vite） | 不需要 |
| 编译产物 | `dist/`（3 个文件） | 无，源码直接跑 |
| 部署什么？ | `dist/` | `api/` 整个文件夹（不含 node_modules） |
| 服务器上做什么？ | Nginx 托管 | `npm install` → `node src/app.js` |

**为什么上传整个 `api/` 而不只传 `app.js`？**

服务器上执行 `npm install` 和 `node src/app.js` 时，还需要这些配套文件：

```
api/
├── src/app.js          # ← 代码本体，Node 执行的就是它
├── package.json        # ← npm install 必须读它，才知道该装什么包
├── package-lock.json   # ← 锁死版本号，保证服务器装的包跟你本地一模一样
└── .env                # ← 数据库密码、JWT 密钥全在这，没有它连不上数据库
```

> `app.js` 是发动机，另外三个是钥匙（`.env`）、说明书（`package.json`）、合格证（`package-lock.json`），缺一不可。

---

### `pack-deploy.ps1` 一键完成

```
pack-deploy.ps1 执行流程：
  ├── npm run build                       # 前端：src/ → dist/
  ├── 删除 api/node_modules/（不打包依赖）  # 后端：去重
  └── 压缩 dist/ + api/ + ai-service/ + migrations/
      └──→ deploy-package.zip             # 部署包就绪！
```

---

## 快速启动（本地开发）

### 1. 安装依赖

```bash
npm install                    # 前端依赖
cd api && npm install && cd .. # 后端依赖
cd ai-service && pip install -r requirements.txt && cd ..  # AI 服务依赖
```

### 2. 初始化数据库

确保本地 PostgreSQL 运行中，执行：
```bash
# 按顺序执行所有迁移脚本（Windows PowerShell）
Get-ChildItem migrations\*.sql | Sort-Object Name | ForEach-Object {
  $env:PGPASSWORD='123456'; & psql -U postgres -d cet_writing -h localhost -f $_.FullName
}
```

> 开发阶段后端启动时会自动创建 `feedback` 表。上线时需手动执行所有迁移脚本。

### 3. 启动（三个终端）

```bash
npm run dev                     # 前端 → localhost:3000
npm run server                  # 后端 → localhost:3001
cd ai-service && python main.py # AI → localhost:8000
```

### 4. 打开浏览器

访问 `http://localhost:3000`，用 `admin` / `admin123` 登录。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Ant Design + Tailwind CSS + Zustand |
| 后端 | Node.js + Express + PostgreSQL + JWT |
| AI | Python + FastAPI + DeepSeek API |

## 最近更新

### 2026-06-12

**浮点精度修复（全链路）**
- 前端：所有分数显示位置添加 `fmt()` 辅助函数（`parseFloat(n.toFixed(2))`），防止 JS 浮点累加误差（如 `21.299999999999997分`）
- 后端提交评分：入库前对 `total_score`、`max_score`、Section 分数做 `Math.round(n * 100) / 100`
- 后端查询结果：出库时对三级分数（总分 / Section / 子题）再次修正
- 后端列表接口：计算试卷满分时做四舍五入
- 管理后台列表：新增"总分"列，显示每套试卷各题分值累加结果

**TS 编译清理**
- 移除未使用变量：`label`、`wordToLabel`、`addParagraph`、`removeParagraph`、`handleDragEnd`、`DragEndEvent`、`newParagraph`

**项目文件清理**
- 删除临时文件：`_calc_score.js`、`temp_pdf_text.txt`、`temp_pdf_text2.txt`

**上传冗余修复**
- 头像上传：换头像时自动删除旧文件
- 音频上传：换音频时前端传 `old_url`，后端自动删除旧文件

**数据库导出 & 兼容性修复**
- 更新 `schema.sql`（建表）和 `data.sql`（数据），从本地 PostgreSQL 18 导出
- `schema.sql` 中将 `uuid_generate_v4()` 替换为 `gen_random_uuid()`（兼容阿里云 PostgreSQL，无需安装 uuid-ossp 扩展）
- 部署包新增包含 `schema.sql` 和 `data.sql`

---

## 功能特性

### 用户端
| 功能 | 说明 |
|------|------|
| 首页 | 网站入口，未登录也可访问 |
| 用户注册/登录 | JWT 认证，支持普通用户和管理员角色；注册时实时校验用户名是否存在；登录/注册有频率限制，输错提示剩余次数 |
| 素材学习 | 查看写作素材，需登录 |
| 专项训练 | 审题构思、素材运用、开放式结文、文体格式四大模块，需登录 |
| 在线写作 | 在线提交作文，AI 智能批改，需登录 |
| 模考专区 | 四六级/考研模拟考试，支持听力（音频播放）/阅读（选词填空/段落匹配/仔细阅读）/翻译/写作全题型，计时答题、答题卡标记跳转，交卷后立即批改；听力可全文查看试卷，阅读文章可折叠查看 |
| 模考答题 | 选词填空：文章内嵌可点击空格，鼠标悬浮弹出词库选项（A/B/C 标签），选择后显示 `题号.单词`；段落匹配：每段可独立折叠/展开，左侧字母按钮 + 收起提示；选项题目以 A/B/C/D 展示，支持两点验证（直接选择 + 底部下拉框） |
| 模考批改结果 | 成绩概览（进度环 + 总分 + 正确题数）、四大模块得分卡片（听力/阅读/写作/翻译）、侧边答题卡（绿色=正确/红色=错误，点击跳转到题目详情）、试卷回顾（逐题展示用户答案 vs 正确答案）；写作/翻译展示 AI 评语 + 参考答案（默认展开）；选词填空文章用全文统一题号、答错显示正确答案箭头 |
| 作文批改结果 | 总分、评分细则、错误分析、优化建议、高分改写 |
| 个人中心 | 查看写作记录/批改记录/模考记录、统计数据（模考次数等），支持记录删除；模考成绩可点击查看详细批改结果页 |
| 意见反馈 | 提交反馈（评分、类型、内容、联系方式），需登录后提交；未登录自动跳转登录页 |
| 通知中心 | 消息图标置于头像左侧，未读红点提示；新用户注册自动发送欢迎通知；点开展示通知列表，支持全部已读、删除已读、查看通知详情 |

### 管理后台
| 功能 | 说明 |
|------|------|
| 仪表盘 | 平台数据统计概览 |
| 用户管理 | 查看/搜索/删除用户，支持多选批量删除；管理员账号不可选中/删除 |
| 素材管理 | 管理写作素材库，支持多选批量删除 |
| 题目管理 | 管理写作题目，支持多选批量删除 |
| 专项训练管理 | 管理专项训练题目，支持多选批量删除 |
| 系统配置 | AI API Key、模型参数配置 |
| 用户反馈管理 | 查看/删除用户反馈，支持多选批量删除、查看详情弹窗 |
| 通知管理 | 发送通知（系统通知/活动/更新三种类型），选择发送对象；编辑新用户欢迎通知（注册时自动发送，不可删除）；查看已发送/已读统计、通知详情，支持批量删除 |
| 用户统计 | 用户使用数据统计 |
| 批改统计 | 批改数据统计 |
| 模考管理 | 试卷增删改查、Section 拖拽排序/上下按钮调整顺序；听力/仔细阅读题型支持 A/B/C/D 选项编辑，正确答案从选项下拉框选择；选词填空：词库逐个添加、文章中点击"插入空格"按钮生成题型（`___` 标记）、词库预览、子题目与空格自动同步；段落匹配：段落列表逐个添加、自动标号 A/B/C、各段落输入框自适应高度、文章标题居中；翻译/写作：只需填写分值和参考答案（TextArea 自适应高度）；支持设置试卷分类、启用状态、级别 |

### 导航与权限
- 顶部导航栏：首页（始终可访问）、素材学习/专项训练/在线写作/模考专区（需登录）
- 底部导航：产品功能链接（需登录），帮助链接
- 未登录点击受保护页面 → 自动跳转登录页并提示"请先登录后再使用"
- 底部邮箱链接：自动唤起邮件客户端，填写收件人（2152533017@qq.com）和主题
- 底部备案号：湘ICP备2026022350号-1，链接至工信部备案查询

---

## 部署

```powershell
.\pack-deploy.ps1    # 本地打包，生成 deploy-package.zip
```

上传 `deploy-package.zip` 到服务器，按 [DEPLOY.md](./DEPLOY.md) 步骤操作。

### 部署包里的 4 个目录

| 目录 | 服务器上做什么 |
|------|--------------|
| `dist/` | Nginx 托管 ← 三个文件就是整个网站 |
| `api/`（不含 node_modules） | 宝塔 Node 项目运行 ← `app.js` 是全部后端 |
| `ai-service/` | `python3 main.py` 启动 AI 批改服务 |
| `migrations/` | 导入 PostgreSQL 建表 + 初始数据 |

### 为什么其他文件不进部署包

| 文件/文件夹 | 去哪了 |
|------------|--------|
| `src/` | 编译成 `dist/` 里的 2 个文件了 |
| `public/` | 合并进 `dist/` 了 |
| `node_modules/` | 服务器 `npm install` 自己下载 |
| `package.json` 等根目录散文件 | 构建/开发工具配置，跑完 `npm run build` 就没用了 |

> **`src/` 编译 → `dist/`；`npm install` → `node_modules/`；部署只要成品。**

---

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
