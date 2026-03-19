# InterviewCoach

> AI 驱动的项目面试教练。输入代码仓库 + 简历 + JD，获得基于真实代码的深度项目面试模拟。

## 核心功能

- **代码仓库分析**：支持 GitHub 公开仓库 URL 或 zip 上传，自动分层摘要（概览→模块→细节）
- **简历 × 代码 × JD 三角匹配**：识别匹配点、夸大点、Gap 点、亮点，生成针对性题目池
- **四阶段面试模拟**：项目概述 → 技术深挖 → 设计决策 → 压力追问，含追问机制和代码引用
- **面试方法论 RAG**：基于 MIT/DDI/PMaps 等真实来源的方法论知识库，隐式驱动面试官行为
- **匿名使用**：无需注册，自动生成 UUID；LLM API Key 由用户自行配置，不经服务端存储
- **Light/Dark 双主题**：跟随系统偏好或手动切换，基于 CSS 变量设计系统
- **流式对话输出**：面试对话支持 SSE 流式响应，实时展示面试官回复
- **面试复盘报告**：面试结束后生成多维度评分 + 改进建议
- **简历优化建议**：基于代码分析结果为简历提供针对性修改建议

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | FastAPI · SQLAlchemy 2.0 (async) · Alembic · openai SDK · LangChain RAG · PyMuPDF · httpx · structlog · pytest |
| 前端 | Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · TanStack Query · react-hook-form + zod · next-themes |
| 数据库 | PostgreSQL 16 + pgvector |
| 部署 | Docker Compose · Nginx |
| 包管理 | uv (Python) · pnpm (前端) |

## 快速启动

### 前置条件

- Docker & Docker Compose
- Python 3.13+、[uv](https://docs.astral.sh/uv/)
- Node.js 20+、pnpm

### 1. 启动数据库

```bash
docker compose up -d
```

### 2. 启动后端

```bash
cd backend
cp ../config.example.yaml ../config.yaml   # 编辑填入 embedding API 配置
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

### 3. 导入面试方法论知识库

```bash
curl -X POST http://localhost:8000/api/admin/knowledge/ingest
```

### 4. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

打开 http://localhost:3000 即可使用。首次使用需在设置页配置 LLM API。

## 配置说明

复制 `config.example.yaml` 为 `config.yaml`（已在 `.gitignore` 中排除）：

```yaml
database:
  url: postgresql+asyncpg://interview_coach:password@localhost:5433/interview_coach

embedding:                    # 知识库向量化用，部署者配置
  base_url: https://api.siliconflow.cn/v1
  api_key: sk-xxx
  model: BAAI/bge-large-zh-v1.5

github:
  token: ""                   # 可选，提升 GitHub API 速率限制到 5000 次/小时

app:
  secret_key: change-me
  max_zip_size_mb: 50
  temp_dir: /tmp/interview_coach
  cors_origins:                 # 允许的前端域名列表
    - http://localhost:3000
```

## 项目结构

```
inter_coach/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI 路由
│   │   ├── models/           # SQLAlchemy 数据模型
│   │   ├── schemas/          # Pydantic 请求/响应 schema
│   │   ├── services/         # 业务逻辑（分析引擎、面试引擎、RAG 等）
│   │   ├── prompts/          # LLM prompt 模板
│   │   └── utils/            # 工具函数
│   ├── knowledge_docs/       # 面试方法论 Markdown 文档
│   └── alembic/              # 数据库迁移
├── frontend/
│   └── src/
│       ├── app/              # Next.js 页面
│       ├── components/       # React 组件
│       ├── hooks/            # 自定义 hooks (TanStack Query)
│       ├── lib/              # API 封装、认证、配置
│       └── types/            # TypeScript 类型定义
├── nginx/                    # Nginx 反向代理配置
├── docker-compose.yml
└── config.example.yaml
```

## API 端点

```
GET    /api/health                         # 健康检查
GET    /api/users/me                       # 获取当前用户
DELETE /api/users/me                       # 删除所有数据

POST   /api/projects                       # 创建项目（上传三件套）
GET    /api/projects                       # 项目列表
GET    /api/projects/:id                   # 项目详情
DELETE /api/projects/:id                   # 删除项目
GET    /api/projects/:id/analysis-status   # 轮询分析进度

POST   /api/projects/:id/interviews        # 开始面试
GET    /api/interviews                     # 面试历史
GET    /api/interviews/:id                 # 面试详情
POST   /api/interviews/:id/messages        # 发送回答
POST   /api/interviews/:id/messages/stream # 发送回答（SSE 流式）
POST   /api/interviews/:id/end             # 结束面试
GET    /api/projects/:id/resume-advice     # 简历优化建议

POST   /api/admin/knowledge/ingest         # 导入知识库
```

## Docker 部署

```bash
cp config.example.yaml config.yaml        # 编辑配置
docker compose --profile deploy up --build
```

全部服务（数据库 + 后端 + 前端 + Nginx）通过 80 端口对外提供服务。

## 测试

```bash
cd backend
uv run pytest -v                          # 运行全部 30 个测试
```

测试使用 SQLite 内存数据库 + mock LLM，覆盖：用户系统、项目生命周期、面试流程（创建→发消息→结束）、权限隔离。
