# CLAUDE.md

本文件为 Claude Code 提供项目上下文，帮助在本仓库中高效工作。

## 项目概述

InterviewCoach — AI 驱动的项目面试教练 Web 应用。用户提交代码仓库 + 简历 PDF + JD 文本，系统自动分析后进行基于真实代码的四阶段深度面试模拟。

详细产品规格见 `project_spec.md`。

## 技术栈与架构

- **后端**：FastAPI (全 async) + SQLAlchemy 2.0 + Alembic + openai SDK + LangChain RAG
- **前端**：Next.js 14+ (App Router) + TypeScript 严格模式 + TailwindCSS + shadcn/ui + TanStack Query
- **数据库**：PostgreSQL 16 + pgvector（端口 5433，docker-compose 映射）
- **包管理**：uv (Python) / pnpm (前端)

不使用 LangGraph、PydanticAI。LLM 调用直接用 openai SDK 的 `client.chat.completions.create()`。

## 常用命令

```bash
# 数据库
docker compose up -d                                    # 启动 PostgreSQL

# 后端（从 backend/ 目录运行）
uv sync                                                 # 安装依赖
uv run alembic upgrade head                             # 执行迁移
uv run alembic revision --autogenerate -m "描述"         # 生成迁移
uv run uvicorn app.main:app --reload                    # 启动开发服务器
uv run pytest -v                                        # 运行测试

# 前端（从 frontend/ 目录运行）
pnpm install                                            # 安装依赖
pnpm dev                                                # 启动开发服务器
pnpm build                                              # 构建
pnpm dlx shadcn@latest add <component>                  # 添加 shadcn 组件

# 知识库
curl -X POST http://localhost:8000/api/admin/knowledge/ingest
```

## 关键目录与文件

### 后端核心

- `backend/app/services/analysis_engine.py` — 分析引擎：代码分层摘要 + 三角匹配 + 题目池生成
- `backend/app/services/interview_engine.py` — 面试引擎：四阶段流程控制 + 追问决策 + RAG 注入
- `backend/app/services/llm_client.py` — openai SDK 封装，`chat()` 和 `chat_json()` 两个方法
- `backend/app/dependencies.py` — FastAPI 依赖注入：匿名用户自动创建 + LLM 配置 header 透传
- `backend/app/prompts/` — 所有 LLM prompt 模板
- `backend/knowledge_docs/` — 面试方法论 Markdown 文档（RAG 知识源）

### 前端核心

- `frontend/src/lib/api.ts` — 统一 HTTP 封装，自动附加 `X-Anonymous-Id` + `X-LLM-*` headers
- `frontend/src/hooks/` — TanStack Query hooks，所有数据请求的入口
- `frontend/src/components/interview/` — 面试页组件（chat-message, chat-input, phase-indicator）

## 编码规范

### Python
- 全 async/await IO
- 类型注解覆盖所有函数
- API 统一返回 `{"success": bool, "data": ..., "error": ...}`
- structlog JSON 格式日志
- 测试用 pytest + pytest-asyncio

### TypeScript
- 严格模式，不用 `any`
- TanStack Query 管理服务端状态
- react-hook-form + zod 表单校验
- `lib/api.ts` 统一封装 HTTP 请求

### 通用
- 用户可见文本中文，代码注释和变量名英文
- Conventional Commits 风格提交信息
- 敏感信息只从 `config.yaml` 读取（不入 git）

## 数据模型

四张核心表：`users` → `projects` → `interview_sessions` → `messages`，外键级联删除。

- `projects.analysis_result` (JSONB)：存储分析产出（概览、模块摘要、三角匹配、题目池、代码上下文）
- `messages.metadata_` (JSONB)：存储追问类型、评估分数等
- 代码原始文件不入库，分析完即销毁

## 用户认证机制

- 前端 localStorage 生成 UUID v4，通过 `X-Anonymous-Id` header 传递
- LLM 配置通过 `X-LLM-Base-URL` / `X-LLM-API-Key` / `X-LLM-Model` headers 透传
- 后端不持久化用户的 API Key
- 不需要 JWT、登录/注册

## 面试流程

1. **分析阶段**（非交互）：简历解析 → 代码分层摘要（概览→模块→细节）→ 三角匹配 → 题目池生成
2. **面试阶段**（多轮对话）：Phase 1 项目概述 → Phase 2 技术深挖 → Phase 3 设计决策 → Phase 4 压力追问
3. 追问机制：同一题最多追问 2 轮，之后给提示跳过
4. 知识库 RAG 在生成题目和追问时隐式注入方法论指导
