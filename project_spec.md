# InterviewCoach — 项目规范文档

> AI 驱动的项目面试教练。输入代码仓库 + 简历 + JD，获得基于真实代码的深度项目面试模拟。

---

## 1. 产品定位

### 1.1 一句话描述

一个能读取用户实际代码仓库、结合简历和 JD 进行深度项目面试模拟的 Web 应用。

### 1.2 核心差异化

市面上的 AI 面试工具只能基于简历文本泛泛提问。InterviewCoach 能对着代码追问到实现细节层面——架构决策、错误处理、边界条件、技术选型的 tradeoff。

### 1.3 目标用户

有项目经验的开发者，准备技术面试中的项目深挖环节。用户画像：能独立完成项目、有 GitHub 仓库或本地代码、正在求职或准备跳槽。

### 1.4 双重身份

本项目同时是开发者的面试作品，需展示：

* **AI 工程能力** ：prompt 设计、RAG 策略、代码分析流水线
* **全栈产品能力** ：前后端开发、用户体验、部署运维

> 开发者的另一个面试作品是 GymOps（AI 健身私教），两者独立仓库。本文档自包含，不依赖 GymOps 的任何信息。

### 1.5 不做的事

* 不做算法刷题/白板编程模拟
* 不做动作教学类的行为面试模拟（只做项目面试）
* 不做简历自动优化（MVP 阶段）
* 不做实时语音交互
* 不做 GitHub OAuth / 私有仓库自动读取

---

## 2. 用户流程

```
首次访问
  → 自动生成匿名 UUID
  → 设置页填入 LLM API Key（必须）
  → 首页上传三件套：代码仓库（URL 或 zip）+ 简历 PDF + JD 文本
  → 系统自动执行分析（非交互，耗时约 30-60 秒）
  → 分析完成，进入面试页
  → 四阶段面试对话（多轮 chat）
  → 面试结束，会话保存到历史
  → 可回看任意历史会话
```

---

## 3. 三件套输入

### 3.1 代码仓库

**方式一：公开 GitHub 仓库 URL**

用户粘贴仓库地址（如 `https://github.com/user/repo`），后端通过 GitHub REST API 读取：

* 免认证：60 次/小时/IP
* 配置 server token（`config.yaml`）：5000 次/小时
* 不需要用户授权任何 GitHub 权限

**方式二：上传 zip 包**

适用场景：私有仓库、公司代码（用户自行判断合规性）、非 GitHub 托管的项目。

* 大小限制：50MB
* 解压后过滤：忽略 `node_modules/`、`.git/`、`__pycache__/`、二进制文件、图片等
* 只保留代码文件（`.py`、`.js`、`.ts`、`.go`、`.java`、`.rs` 等）和配置文件

### 3.2 简历

PDF 上传，后端用 PyMuPDF 提取文本。提取后解析项目列表、技术栈、工作经历等结构化信息。

### 3.3 岗位 JD

纯文本输入框，粘贴职位描述。解析出岗位要求的技术栈、职责范围、经验要求等。

---

## 4. 核心引擎

### 4.1 分析阶段（非交互）

用户提交三件套后自动执行，产出面试所需的全部上下文。

**Step 1：简历解析**

从简历文本中提取结构化信息：

* 项目列表（名称、描述、时间、角色）
* 技术栈
* 工作经历
* 关键成果/数据

**Step 2：代码仓库分层摘要**

不可能把整个仓库塞进 context，采用分层策略：

1. **概览层** ：目录结构 + README + 入口配置文件（package.json / pyproject.toml / go.mod / Cargo.toml 等）→ 生成项目技术概览（语言、框架、依赖、项目结构）
2. **模块层** ：根据简历描述的功能点，识别核心模块目录，读取模块级别的代码文件 → 生成各模块的功能摘要
3. **细节层** ：对最关键的文件（入口、核心业务逻辑、数据模型）全文读取 → 提取架构决策、设计模式、关键实现

每层 1-2 次 LLM 调用，整个仓库分析约 3-5 次调用。

**Step 3：三角匹配 + 题目池生成**

将简历描述、代码实际情况、JD 要求三方交叉比对：

* **匹配点** ：简历写了什么 + 代码确实实现了 → 深挖提问方向
* **夸大点** ：简历写了但代码中看不到 → 验证性提问
* **Gap 点** ：JD 要求但项目中缺失 → 延伸和压力提问
* **亮点** ：代码中有但简历没写 → 引导候选人展示

产出一个按四阶段分类的面试题目池（约 15-25 题），每题附带代码上下文引用。

### 4.2 面试阶段（多轮交互）

基于分析阶段的产出进行多轮对话式面试。

**四阶段流程：**

| Phase | 名称     | 目标                         | 典型题数 | 代码上下文            |
| ----- | -------- | ---------------------------- | -------- | --------------------- |
| 1     | 项目概述 | 验证候选人对项目的整体理解   | 2-3 题   | README + 目录结构     |
| 2     | 技术深挖 | 追问具体实现细节             | 4-6 题   | 核心模块源码          |
| 3     | 设计决策 | 考察架构思维和 tradeoff 分析 | 3-4 题   | git 依赖图 + 选型对比 |
| 4     | 压力追问 | 挑战薄弱环节和延伸能力       | 2-3 题   | JD 要求 vs 项目 gap   |

**追问机制：**

每轮用户回答后，AI 面试官评估回答质量（充分/含糊/偏题/遗漏），决定：

* 回答充分 → 进入下一题
* 含糊或遗漏 → 基于具体代码片段追问细节
* 偏题 → 引导回到问题核心
* 连续 2 次追问后仍不充分 → 给出简要提示，进入下一题

**面试中的代码引用：**

AI 面试官可以在提问中引用具体代码片段，例如：

> "我看到你在 `auth/middleware.py` 里用了 JWT + Redis 的方案做 token 管理，为什么没有选择 session-based 认证？在什么场景下你会考虑换方案？"

---

## 5. 知识库（面试方法论 RAG）

### 5.1 内容范围

面试官方法论文档，约 10-20 篇 Markdown 文件：

**提问技巧类：**

* STAR 追问法（Situation → Task → Action → Result 的追问路径）
* 分层提问策略（先广后深、先概念后实现）
* 开放式 vs 封闭式问题的选择时机
* 追问深度的判断标准

**面试场景类：**

* 不同岗位（后端/前端/AI 工程/全栈）的考察侧重
* 项目面试中的高频追问方向（技术选型理由、困难与解决、如果重来怎么做）
* 压力面试技巧（沉默、质疑、反转假设）

**评估标准类：**

* 回答质量评估维度（技术深度、沟通清晰度、思维过程、自我认知）
* 常见候选人回答模式识别（背书式、空泛式、防御式）

### 5.2 技术实现

使用普通 RAG：

* 文档用 LangChain TextSplitter 分块
* OpenAI 兼容 Embedding API 向量化（读取 config.yaml 配置）
* pgvector 存储和检索
* 面试引擎在生成问题和追问时，检索相关方法论片段注入 system prompt

### 5.3 使用方式

不是用户直接查询知识库，而是 **隐式驱动 AI 面试官的行为** ：

* 生成题目池时：检索「提问技巧」类文档，约束出题策略
* 面试追问时：检索「追问」和「评估」类文档，指导追问决策
* 面试评估时：检索「评估标准」类文档，提供评判框架

---

## 6. 技术栈

### 6.1 后端

| 组件       | 选型                    | 说明                                       |
| ---------- | ----------------------- | ------------------------------------------ |
| 包管理     | **uv**            | Python 依赖管理和虚拟环境                  |
| Web 框架   | FastAPI                 | 全 async                                   |
| ORM        | SQLAlchemy 2.0 (async)  | asyncpg 驱动                               |
| 数据校验   | Pydantic v2             | 请求/响应 schema                           |
| 数据库迁移 | Alembic                 | 版本化迁移                                 |
| LLM 调用   | openai SDK              | OpenAI 兼容接口，直接调用                  |
| RAG        | LangChain 组件          | TextSplitter + OpenAIEmbeddings + PGVector |
| PDF 解析   | PyMuPDF (fitz)          | 简历 PDF 文本提取                          |
| GitHub API | httpx                   | 公开仓库代码读取                           |
| 日志       | structlog               | JSON 格式                                  |
| 测试       | pytest + pytest-asyncio | —                                         |

 **不使用 LangGraph** ：面试教练的流程是线性的（分析 → 面试 → 结束），不需要复杂的状态机、条件路由、意图分发。直接用 FastAPI + 函数调用编排即可。

 **不使用 PydanticAI** ：不需要结构化 Agent 输出和工具注册机制。LLM 调用直接用 openai SDK 的 `client.chat.completions.create()`。

### 6.2 前端

| 组件     | 选型                     |
| -------- | ------------------------ |
| 框架     | Next.js 14+ (App Router) |
| 语言     | TypeScript（严格模式）   |
| 样式     | TailwindCSS              |
| UI 组件  | shadcn/ui                |
| 数据请求 | TanStack Query           |
| 表单     | react-hook-form + zod    |

### 6.3 基础设施

| 组件       | 选型                     |
| ---------- | ------------------------ |
| 数据库     | PostgreSQL 16 + pgvector |
| 部署       | Docker Compose           |
| 反向代理   | Nginx                    |
| 服务器     | 香港 VPS                 |
| 后端包管理 | uv                       |
| 前端包管理 | pnpm                     |

### 6.4 与开发者另一个项目（GymOps）的部署关系

> 本节为部署背景说明，不影响本项目的开发。Claude Code 开发时可忽略此节。

开发者同时维护另一个项目 GymOps（AI 健身私教，技术栈：LangGraph + PydanticAI + LangChain RAG + FastAPI + Next.js）。两个项目独立仓库、独立数据库，但共用同一台香港 VPS 部署：

* 同一个 PostgreSQL 实例，不同 database（`interview_coach` vs `gymops`）
* 共用 Nginx 反向代理（不同域名/路径路由到不同服务）
* 两者都采用匿名 UUID 认证 + LLM header 透传模式，但这是各自独立实现的，不存在代码共享

 **面试叙事** ：两个项目选择了不同的 AI 编排方案（GymOps 用 LangGraph 状态机处理复杂意图路由，InterviewCoach 用线性流程），体现了根据业务复杂度选择合适架构的判断力。

---

## 7. 用户系统

### 7.1 匿名账户

* 首次访问，前端在 localStorage 生成 UUID v4 作为 `anonymous_id`
* 所有 API 请求通过 `X-Anonymous-Id` header 传递
* 后端收到请求：ID 不存在则自动创建，存在则直接关联
* 不收集邮箱、手机号等实名信息
* 不需要 JWT、登录/注册端点

### 7.2 LLM 配置（必须）

用户在设置页填入三个字段，存 localStorage，通过 header 透传：

* `X-LLM-Base-URL`：API 地址
* `X-LLM-API-Key`：用户自己的 Key
* `X-LLM-Model`：模型名称

三个字段全部缺失时，接口返回 HTTP 400 提示用户配置 LLM。后端不持久化用户的 Key。

### 7.3 Embedding 配置

RAG 使用的 Embedding API 由部署者在 `config.yaml` 中配置，不依赖用户的 Key。原因：Embedding 只在知识库入库时使用，不在用户交互时实时调用。

---

## 8. 数据模型

### 8.1 核心表

```
users:
  - id: UUID (PK, 即 anonymous_id)
  - created_at: datetime
  - updated_at: datetime

projects:
  - id: UUID (PK)
  - user_id: UUID (FK → users)
  - name: str                           # 项目名称
  - source_type: str                    # "github_url" | "zip_upload"
  - source_ref: str                     # GitHub URL 或 zip 文件路径
  - resume_text: text                   # 解析后的简历全文
  - jd_text: text                       # JD 原文
  - analysis_status: str                # "pending" | "analyzing" | "completed" | "failed"
  - analysis_result: jsonb              # 分析产出（项目摘要、题目池、代码上下文）
  - created_at: datetime
  - updated_at: datetime

interview_sessions:
  - id: UUID (PK)
  - project_id: UUID (FK → projects)
  - user_id: UUID (FK → users)
  - status: str                         # "in_progress" | "completed" | "abandoned"
  - current_phase: int                  # 1-4
  - config: jsonb                       # 面试配置（难度、侧重等，V2 扩展用）
  - created_at: datetime
  - updated_at: datetime

messages:
  - id: UUID (PK)
  - session_id: UUID (FK → interview_sessions)
  - role: str                           # "interviewer" | "candidate"
  - content: text
  - phase: int                          # 所属阶段 1-4
  - metadata: jsonb                     # 追问类型、评估分数等（V2 扩展用）
  - created_at: datetime
```

### 8.2 知识库表

由 LangChain PGVector 自动管理，存储面试方法论文档的向量 embeddings。

### 8.3 约定

* Alembic 管理迁移
* 所有表包含 `id` (UUID)、`created_at`、`updated_at`
* 外键 `ON DELETE CASCADE`
* 代码仓库内容（zip 文件、拉取的源码）不入库，分析完即销毁
* `analysis_result` JSON 字段存储分析产出，不单独建表

---

## 9. API 端点

```
# 用户
GET    /api/users/me                     # 获取当前用户信息
DELETE /api/users/me                     # 删除所有数据（级联）

# 项目
POST   /api/projects                     # 创建项目（上传三件套）
GET    /api/projects                     # 项目列表
GET    /api/projects/:id                 # 项目详情（含分析结果）
DELETE /api/projects/:id                 # 删除项目
GET    /api/projects/:id/analysis-status # 轮询分析进度

# 面试
POST   /api/projects/:id/interviews      # 开始新面试
GET    /api/interviews                   # 面试历史列表
GET    /api/interviews/:id               # 面试详情（含消息历史）
POST   /api/interviews/:id/messages      # 发送消息（candidate 回答）→ 返回 interviewer 追问
POST   /api/interviews/:id/end           # 结束面试

# 知识库（管理用，非用户接口）
POST   /api/admin/knowledge/ingest       # 导入方法论文档

# 系统
GET    /api/health
```

---

## 10. 前端页面

### 10.1 首页（材料上传）

* 三步引导：① 代码仓库（URL 输入框 + zip 上传区域）② 简历 PDF 上传 ③ JD 粘贴
* 提交后显示分析进度（轮询 analysis-status）
* 分析完成后跳转到面试页

### 10.2 面试页

* Chat 界面：消息气泡，interviewer 和 candidate 左右分布
* 顶部显示当前 Phase（1/4、2/4...）+ 进度条
* 消息中可渲染代码片段（syntax highlight）
* 底部输入框 + 发送按钮
* 「结束面试」按钮

### 10.3 历史页

* 按时间倒序列出所有面试会话
* 每条显示：项目名、日期、状态、进行到的阶段
* 点击进入只读回看模式

### 10.4 设置页

* LLM 配置：三个输入框（Base URL、API Key、Model）+ 常见供应商预设按钮
* 「删除我的所有数据」按钮（二次确认）
* 隐私政策链接
* 免责声明链接

---

## 11. 安全与合规

### 11.1 代码数据处理

* 代码仓库内容（zip 文件、从 GitHub 拉取的源码）**不持久化到数据库**
* 分析完成后只保留 `analysis_result`（摘要、题目池、关键代码片段引用），原始代码文件立即删除
* zip 上传的临时文件存放于 `/tmp`，分析完成或失败后清理

### 11.2 免责声明

* 首次创建项目时弹窗展示，用户点击「我已了解」后继续
* 内容要点：
  * 用户不应上传包含公司商业秘密或受保密协议约束的代码
  * 代码内容将发送至用户配置的第三方 LLM API 处理
  * AI 面试官的评估仅供参考，不代表真实面试结果
  * AI 生成内容可能存在错误

### 11.3 隐私政策

* 收集的数据：匿名 UUID、简历文本、JD 文本、面试对话历史、项目分析摘要
* 不收集的数据：姓名、邮箱、手机号、位置信息、代码原始文件（分析后删除）
* 第三方服务：对话内容发送至用户自行配置的 LLM API，受对应服务商隐私政策约束
* 数据删除：用户可随时删除全部数据，级联清除

### 11.4 AI 生成内容标识

所有 AI 面试官的消息标注「AI 生成」标签。

---

## 12. 配置文件

```yaml
# config.yaml

database:
  url: postgresql+asyncpg://interview_coach:password@localhost:5432/interview_coach

# Embedding API（知识库向量化用，部署者配置）
embedding:
  base_url: https://api.siliconflow.cn/v1
  api_key: sk-xxx
  model: BAAI/bge-large-zh-v1.5

# GitHub API token（可选，提升 rate limit 到 5000 次/小时）
github:
  token: ""

# 应用
app:
  secret_key: change-me
  max_zip_size_mb: 50
  temp_dir: /tmp/interview_coach
```

`config.yaml` 加入 `.gitignore`，只提交 `config.example.yaml`。

---

## 13. 开发阶段

### Phase 1：基础骨架 + 代码分析

1. **项目骨架** ：docker-compose（db）、后端（FastAPI + config + database）、前端（Next.js + shadcn）、config.example.yaml
2. **用户系统** ：匿名 UUID、User 表、Alembic、LLM 配置透传
3. **代码接入** ：GitHub URL 读取（httpx + GitHub REST API）、zip 上传 + 解压 + 过滤
4. **分析引擎** ：简历解析、代码分层摘要、三角匹配、题目池生成
5. **前端首页** ：三件套上传表单、分析进度展示

### Phase 2：面试引擎 + 知识库

1. **面试方法论知识库** ：文档撰写（8-12 篇）、RAG 管线（分块 + 向量化 + pgvector）、ingest 脚本
2. **面试引擎** ：四阶段流程控制、追问决策逻辑、代码片段引用、方法论 RAG 注入
3. **面试 API** ：创建面试、发送消息（含 LLM 调用）、结束面试
4. **前端面试页** ：chat 界面、phase 进度、代码高亮、结束按钮

### Phase 3：历史记录 + 合规 + 部署

1. **会话历史** ：历史列表 API、只读回看模式
2. **合规** ：免责弹窗、隐私政策页、AI 生成标签、数据删除功能
3. **设置页** ：LLM 配置、数据删除、隐私政策链接
4. **部署** ：Dockerfile（前后端）、docker-compose 完善、Nginx 配置
5. **整合测试 + README**

### Phase 4（V2，视时间而定）

* 复盘评分报告（面试结束后生成维度评分 + 改进建议）
* 简历优化建议（基于代码分析 gap 建议简历修改）
* 多项目分析（一次面试覆盖简历上的多个项目）
* RAG 升级：Contextual Retrieval + Hybrid Search（BM25 + 向量）
* 对话流式输出（SSE）

---

## 14. 编码规范

### Python

* **uv** 管理依赖和虚拟环境（`uv init`、`uv add`、`uv run`）
* async/await 所有 IO
* 类型注解覆盖所有函数
* API 统一返回 `{"success": bool, "data": ..., "error": ...}`
* structlog JSON 格式日志
* pytest + pytest-asyncio 测试

### TypeScript

* 严格模式，不用 `any`
* TanStack Query 管理服务端状态
* react-hook-form + zod 表单校验
* `lib/api.ts` 统一封装，自动附加 `X-Anonymous-Id` + `X-LLM-*` headers

### 通用

* 用户可见文本中文，代码注释和变量名英文
* conventional commits
* 敏感信息只从 `config.yaml` 读取
