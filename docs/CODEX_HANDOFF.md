# CODEX HANDOFF

## 当前架构

- 前端是 React/Vite，主要入口在 `src/main.jsx`，API 客户端在 `src/api/client.js`。
- 后端是 Node.js 原生 HTTP 服务，入口在 `server/index.js`。
- 简历上传接口是 `POST /api/resumes/upload`，由 `server/resumeParser.js` 处理 multipart、文件保存和简历解析。
- 文档读取已拆到 `server/documentParser.js`：默认保留现有 `pdfplumber` PDF 文本抽取；Docling 作为独立可选 parser，通过环境变量启用。
- 简历记录仍保存到现有 `resumes` 表，`rawText` 和 `parsedProfile` 沿用现有字段。
- 自动填表映射继续通过 `repo.syncStandardFormMappings()` 和 `src/data/standardFormMappings.js` 生成。

## 已经完成什么

- 已接入轻量 LLM Provider 层，当前只实现 `DoubaoProvider`。
- `DoubaoProvider` 通过火山方舟 OpenAI-compatible `chat/completions` 调用模型。
- 已用 Zod `ResumeSchema` 校验模型返回的结构化简历 JSON。
- 已把 Doubao 结构化结果接入 `server/resumeParser.js` 的文本解析流程。
- 已新增 adapter，把结构化结果转换成现有前端消费的 `parsedProfile` 形状。
- 已新增模型 JSON 字段别名规范化，兼容 `basic_info`、`education_experience`、`work_experience`、`project_experience`、`skill_list` 等常见返回形状。
- 已让 onboarding 优先使用后端返回的 `parsedProfile.email` 和 `parsedProfile.phone`。
- 已新增 `server/documentParser.js`，把 Document Parsing 和 Resume Parsing 分开。
- 已给默认 PDF 文本抽取增加 Windows fallback：未显式配置 `PYTHON_PATH` 时，会依次尝试 `python3`、`python`、`py -3`。
- 已新增可选 Docling 接入准备：`DOCLING_SERVER_URL` 走 docling-serve HTTP，`DOCUMENT_PARSER=docling-python` 走本地 Python Docling 脚本。
- 已允许上传入口选择 DOCX；未配置 Docling 时 DOCX 返回清晰 warning，不阻止用户手动填写。
- 已新增不含简历正文的解析计数日志，便于判断文本抽取和结构化写入是否成功。
- 已把 onboarding 回填改为字段级合并：已有非空字段和用户 touched 字段不覆盖，AI 解析结果只填空字段。
- 2026-09-10 本地真实 PDF 上传日志已显示链路跑通：`textLength=2797`、`educationCount=2`、`workCount=3`、`projectCount=4`、`skillsCount=38`。
- 已优化 onboarding 登录卡片样式，使用系统蓝绿/深墨蓝/酒红色系；移除登录卡片里的会话状态和“当前仅支持”说明。
- 服务条款勾选文案已改为中文，并包含账号隔离保存提示。
- 已完成零预算智能推荐前置准备：不接付费搜索 API，不改现有爬取库，只扩充后端公司官网池并增加标签筛选。
- `server/jobCrawler.js` 的官网池已增加三大运营商、主要银行、央国企、大厂、火山引擎/字节、美团、百度、携程、快手、小红书、B 站、网易、米哈游，以及欧莱雅、雅诗兰黛、宝洁、联合利华、资生堂、LVMH、香奈儿等外企/女性友好公司入口。
- 公司池已在运行时规范为 `companyTags`、`roleTags`、`cityTags`，并保留原有 `type` 兼容展示和入库。
- 用户点击“智能推荐”时，后端会按公司偏好、岗位偏好、城市偏好给公司打分排序，再抓取排序后的官网入口；前端不再预先用本地公司池生成推荐公司。
- `POST /api/jobs/import-recommendations` 现在返回 `recommendedCompanies`，前端只在点击智能推荐后展示这次后端按标签选中的公司。
- 已新增零预算岗位搜索入口池：牛客网、实习僧、应届生求职网、BOSS 直聘、拉勾招聘、前程无忧。点击智能推荐时，后端会按用户岗位/城市/招聘类型生成平台搜索入口并导入岗位列表。
- 岗位搜索入口不会伪造具体岗位发布时间或截止时间；页面提示以平台实时岗位为准。
- 推荐页空状态文案已移除“公司官网池在后端保存”。
- 已新增后端岗位种子池：覆盖三大运营商、国家电网、中国石化、主要银行、大厂/互联网、外企/女性友好公司。岗位种子按 `companyTags`、`roleTags`、`cityTags`、`goal` 打标签，点击智能推荐时按用户偏好推荐具体公司岗位入口。
- 对已从公开校招日程页看到的招聘批次，岗位池会写入 `publishedAt`/`deadline`；未公开时间的官网岗位入口不编造时间。
- `normalizeImportedJob` 和 PostgreSQL `addImportedJob` 已支持写入 `publishedAt`、`deadline` 到现有 `jobs.published_at`、`jobs.deadline` 字段。
- 没有修改上传页面、登录、数据库 schema 或无关 UI。
- 没有把 Docling 作为默认依赖上线；没有新增 LangChain、RAG、Agent 框架。

## 修改过哪些核心文件

- `server/documentParser.js`
- `server/index.js`
- `server/jobImporter.js`
- `server/repositories/postgresRepository.js`
- `server/llmProvider.js`
- `server/structuredResumeParser.js`
- `server/resumeSchema.js`
- `server/resumeParser.js`
- `server/jobCrawler.js`
- `server/jobCrawler.test.js`
- `server/scripts/extract_docling_text.py`
- `server/documentParser.test.js`
- `src/main.jsx`
- `src/onboarding/OnboardingWizard.jsx`
- `src/onboarding/steps.jsx`
- `src/styles.css`
- `src/onboarding/onboardingState.js`
- `src/onboarding/onboardingState.test.js`
- `server/llmProvider.test.js`
- `server/structuredResumeParser.test.js`
- `server/scripts/test_doubao_resume_parser.js`
- `package.json`
- `.env.example`
- `docs/CODEX_HANDOFF.md`

## 重要环境变量

- `ARK_API_KEY`: 火山方舟 API Key，只放后端环境变量。
- `ARK_BASE_URL`: 默认 `https://ark.cn-beijing.volces.com/api/v3`。
- `DOUBAO_MODEL`: 火山方舟模型或接入点 ID。
- `MAX_RESUME_UPLOAD_BYTES`: 简历上传大小限制。
- `PYTHON_PATH`: 可选。本地 PDF 文本抽取 Python 路径；未配置时尝试 `python3`、`python`、`py -3`。
- `DOCUMENT_PARSER`: 可选。设为 `docling-python` 时尝试本地 Python Docling。
- `DOCLING_SERVER_URL`: 可选。配置后 Node 后端通过 HTTP 调用 docling-serve。
- `DOCLING_TIMEOUT_MS`: 可选。Docling HTTP 超时，默认 45000。
- `DOCUMENT_PARSE_TIMEOUT_MS`: 可选。本地 Python 文档解析超时，默认 45000。
- `DATABASE_PROVIDER`, `DATABASE_URL`: 数据库选择和连接配置。

## 当前待办

- 重新刷新页面后上传一份 PDF，验证前端展示是否按字段级合并显示：已有邮箱不覆盖，姓名/学校/专业/经历等空字段自动填入。
- 如果决定试运行 Docling，优先单独部署 docling-serve 并配置 `DOCLING_SERVER_URL`；确认稳定后再考虑 `DOCUMENT_PARSER=docling-python`。
- 根据真实简历样本微调 prompt 或 schema 字段，但仍保持“只提取原文，不总结、不润色、不推断”。
- 评估是否要把 PDF 文本抽取从当前 Python/pdfplumber 脚本换成 Node 方案；当前阶段未做。
- 智能推荐目前是零预算轻量版：点击智能推荐时先按标签推荐公司，再从公司官网池抓公开页面链接并做关键词过滤；没有接付费搜索 API。
- 如果官网岗位抓取较少，后端会补充岗位平台搜索入口，保证用户点击后能看到可继续打开的推荐入口。
- 后端还会先导入匹配的岗位种子池记录，再补充平台官网搜索入口和官网轻量抓取结果。
- 如需稳定拿到每个岗位的截止时间、发布时间和详情字段，后续需要为重点公司做独立 adapter 或接官方/第三方岗位 API；当前阶段不做深爬、不做登录态抓取。
- 已新增后端测试覆盖标签推荐、岗位种子池和岗位入口池：`server/jobCrawler.test.js` mock 官网 HTML，验证大厂/互联网/AI/杭州偏好会返回带标签的推荐公司和岗位，并验证央国企/通信/广州可命中三大运营商方向种子岗位，牛客等零预算岗位搜索入口会在点击智能推荐后生成。

## 已知问题

- PDF 文本抽取仍依赖现有 `server/scripts/extract_pdf_text.py` 和 `pdfplumber`，如果部署环境没有对应 Python 运行时会抽取失败。
- 2026-09-09 本地页面上传曾出现 `PDF text extraction failed`，原因是后端默认使用 `python3`，Windows 环境可能没有该命令；已加入 fallback，但仍建议明确配置 `PYTHON_PATH`。
- 本地 Python 3.11 可用，但当前环境未安装 `docling`。因此 Docling 默认不启用。
- 当前仓库没有 Dockerfile、requirements 或 docling-serve 部署配置；把 Docling 默认上线会明显增加部署复杂度。
- 当前 Doubao 解析只在 `ARK_API_KEY` 和 `DOUBAO_MODEL` 都配置时启用；未配置时仍走原有本地规则解析。
- `npm run resume:parse:doubao` 只验证 Provider 和 Zod，不等于完整上传接口端到端验证。
- 真实 PDF 的后端链路已跑通，但前端页面需要刷新到最新 Vite 热更新状态后再复测展示。
- 公司官网池里的部分招聘站点由第三方招聘系统承载，页面结构和季节性校招地址可能变化；现有轻量爬取会跳过无法公开读取或需要登录/JS 渲染的岗位。

## 下一步

- 启动后端和前端，在浏览器上传真实 PDF 简历，检查资料页或 onboarding 是否自动填入姓名、邮箱、手机号、教育经历、工作经历、项目经历和技能。
- 如果上传端到端通过，再准备提交；如果失败，优先看后端日志里的 PDF 文本抽取或 `resume_parse_failed`。
- 点击智能推荐，用不同偏好组合验证官网池筛选：`央国企`、`大厂`、`外企`、`银行`、`互联网`、`女性友好`；确认推荐公司只在点击后出现。
