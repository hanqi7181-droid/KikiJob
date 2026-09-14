# CODEX HANDOFF

## 当前架构

- 前端是 React/Vite，主要入口在 `src/main.jsx`，API 客户端在 `src/api/client.js`。
- 后端是 Node.js 原生 HTTP 服务，入口在 `server/index.js`。
- 简历上传接口是 `POST /api/resumes/upload`，由 `server/resumeParser.js` 处理 multipart、文件保存和简历解析。
- 文档读取已拆到 `server/documentParser.js`：普通 PDF 先用 Node 依赖 `pdf-parse` 抽取文本，再保留现有 `pdfplumber` 作为 fallback；Docling 作为独立可选 parser，通过环境变量启用。
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
- 已优化 Chrome 插件的 MokaHR V2 重复经历添加：扩大“添加/新增/增加/+”按钮识别，支持“新增一条实习经历”等文案；点击添加时改为滚动到按钮并模拟 pointer/mouse/click 事件；等待动态新增区块时间从 3 秒放宽到 6 秒。
- `/api/health` 已增加 `doubaoConfigured` 布尔值，不暴露密钥，只用于确认当前后端进程是否读到了 `ARK_API_KEY` 和 `DOUBAO_MODEL`。
- 邮箱验证码登录已恢复轻量状态提示：验证码发送、验证失败、缺少验证码等信息会显示在登录按钮下方，但不恢复“会话状态”说明卡片。
- 简历上传响应已增加 `parseDiagnostics`，包含 `parser`、`documentParser`、`documentFormat`、`parseWarning`、`doubaoConfigured`、`textLength` 和字段数量，方便判断正式版到底卡在 PDF 文本抽取、豆包配置、Zod 校验还是字段回填。
- 如果 Doubao 返回合法但字段为空的 JSON，后端现在会保留 Doubao 结果链路，同时用本地规则补充可识别的邮箱、手机号、学校、经历等字段，并标记 `parseWarning: AI_RETURNED_EMPTY_FIELDS`。
- 上传页会把解析诊断转换成轻量中文提示；AI 解析失败或字段较少不会阻止用户继续手动填写。
- 已新增 Node 侧普通 PDF 文本抽取：`server/documentParser.js` 会先用 `pdf-parse` 读取 PDF 文本层，解决 Railway 纯 Node 部署里没有 Python/pdfplumber 导致普通 PDF 也提取失败的问题。扫描版 PDF 仍暂不做 OCR。
- 推荐页的岗位结果已分成两栏：`推荐岗位` 展示具体岗位/官网入口，`搜索推荐` 展示牛客、实习僧、应届生等平台搜索入口；搜索入口按钮文案为 `跳转搜索`，不再写 `官方投递`。
- 推荐页已新增 `我的收藏` 区；推荐出来的岗位默认只是 `待确认`，不会自动进入收藏或投递记录。用户点击卡片右上角爱心后才变为 `收藏/待投`，取消爱心只改状态，不删除岗位。
- 推荐卡片右上角收藏按钮已改成红色爱心反馈：hover 变红并轻微动效，收藏后保持红色。
- Chrome 插件/自动填表匹配已收紧：扫描字段时不再把 placeholder 当作真实 label；`请输入/请选择/请填写` 等提示词只作为弱证据或直接未匹配；通用匹配器和 KikiJob 预览都会用大区块上下文阻止教育经历、工作经历、项目经历串填。
- Chrome 插件通用扫描已新增 section item 组合上下文：字段会带上 `sectionType`、`itemIndex`、`sectionSelector`、`itemSelector`，KikiJob 匹配时同一段教育/实习/项目经历只匹配同 index 的简历资料，避免多段经历串填。
- Chrome 插件 popup 已改为 KikiJob 马卡龙色系，隐藏调试/学习入口；扫描、复制 JSON、填充、确认映射都会给明确成功/失败提示。插件本地 API 地址同步为 `http://localhost:8788/api`。辅助投递扫描表已新增单字段“确认”按钮，中置信字段确认后显示“已确认”。
- 辅助投递已新增“一键确认可填字段”：KikiJob 扫描映射页可一次确认已有值且已匹配的字段；确认状态会写入扩展填充包的 `confirmed/userConfirmed/requiresUserCheck=false`，不会在下一步和插件里反复显示“需确认”。插件 popup 保持扫描、复制 JSON、填当前页三个主按钮，不单独放一键确认。
- 标准字段下拉已按资料段落显示，例如“实习经历 1 / 职责描述”；简历资料仍按 `education`、`experiences`、`projects` 数组保存，每段经历通过 `sectionType + itemIndex` 绑定，不把多段经历拆散混填。
- 辅助投递第 5 步已修复：扩展填充包现在直接由扫描预览生成，不再依赖 `autofillConfirmed` 才生成脚本，避免进入第 5 步时填充包为空或按钮失效。登录引导也不再用当前资料邮箱预填登录账号，避免登录态异常时显示本地邮箱。
- 辅助投递第 5 步恢复逻辑已加固：扫描预览会随 assist session 写入本地恢复状态；如果旧 session 记在第 5 步但扫描预览缺失，会自动退回第 4 步并提示重新扫描，避免页面看起来“打不开”。
- 已新增新用户主流程说明文档：`docs/KIKIJOB_USER_FLOW.md`，可用于录屏讲解和冒烟测试。
- 已新增独立后端公司池 `server/companyPool.js`，把 27 届校招表第一批可读内容结构化为公司数据：公司类型、行业、业务线、岗位方向、城市、双非/本科/女性友好标签、适合人群和入职体验摘要。
- 当前公司池共 135 家，无重复；其中 133 家已有明确招聘/校招/官网承载入口，2 家因截图未含 URL 且暂未核到稳定入口，仍标为 `official-search`，在前端显示为“查找官网入口”，不伪装成已核验官网投递。
- 已完成第一批官网入口核验替换：麒麟信安、汉得信息、紫光同芯、星宸科技、芯原股份、达发科技、中信戴卡、英维克、零跑汽车、中国航发黎明、中广核集团、四方股份、伟创电气、徐工、中建八局、中远海运、中铁广州局城建公司、中铁五局、中铁二局、乐动机器人、TP-Link联洲、乐有家、飞博共创、宝宝巴士、戴尔科技、泛林集团等。
- 已继续完成 27 届校招官网入口核验替换：姚记科技、星空科技、渠梁电子、玖锦科技、永联科技、优旦科技、华润燃气泰州区域公司、源清动力、坤维科技、云迹科技、星际天算、上海民用航空控制与导航系统有限公司、航天科工二院、福船一帆、长陆智造、佳农水果集团、大道投资、皓兴科技、远东通信、齐齐熊、晓禾教育、成都社区招聘、永卓控股等。
- `server/jobCrawler.js` 已改为消费公司池，并把表格标签纳入推荐打分；强公司类型偏好会作为种子岗位硬过滤，避免用户选“央国企”时混入外企或普通民企。
- 推荐导入仍复用现有 `jobs` 表，不改数据库 schema；友好标签写入现有 `tags`，入职体验摘要写入现有 `jd_text/description` 并由前端解析展示。
- 推荐公司卡和岗位详情已展示友好标签与入职体验摘要；未核验官网入口被归入搜索推荐侧，按钮文案为“查找官网入口”。
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
- `server/companyPool.js`
- `server/jobCrawler.test.js`
- `server/scripts/extract_docling_text.py`
- `server/documentParser.test.js`
- `package.json`
- `package-lock.json`
- `src/main.jsx`
- `chrome-extension/src/content/adapters/mokaV2.js`
- `chrome-extension/tests/mokaV2.test.js`
- `src/onboarding/OnboardingWizard.jsx`
- `src/onboarding/steps.jsx`
- `src/styles.css`
- `server/index.js`
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
- 继续核验剩余 2 个 `official-search` 项：惟丰科技、催甲科技；当前公开搜索结果未能确认稳定官网投递入口。
- 继续从用户长图里人工复核剩余难读行；当前已录入 135 家，截图底部和部分模糊行仍需要二次核对，避免误录公司名或岗位方向。
- 已新增后端测试覆盖标签推荐、岗位种子池和岗位入口池：`server/jobCrawler.test.js` mock 官网 HTML，验证大厂/互联网/AI/杭州偏好会返回带标签的推荐公司和岗位，并验证央国企/通信/广州可命中三大运营商方向种子岗位，牛客等零预算岗位搜索入口会在点击智能推荐后生成。
- 插件重复经历测试已覆盖 3 条实习经历自动新增和“新增一条实习经历”按钮文案。
- 插件字段匹配测试已覆盖 placeholder-only 不自动匹配，以及工作经历区块里的字段不会串到教育经历映射。
- 辅助投递测试已覆盖：人工确认后的中置信字段不会再被标记为 `requiresUserCheck`，扩展填充包会携带 `confirmed/userConfirmed`。
- Onboarding 测试已覆盖：登录账号不会从个人资料邮箱自动预填。
- Doubao 本地自测命令 `npm run resume:parse:doubao` 已成功返回结构化 JSON；当前本地 `http://localhost:8788/api/health` 显示 `doubaoConfigured: True`。
- 已新增测试覆盖：当 Doubao 被调用但返回空结构化字段时，后端会用本地规则补充可识别字段并返回解析诊断。
- 已新增测试覆盖：普通 PDF 会先通过 Node `pdf-parse` 抽取文本，避免部署环境缺 Python 时直接失败。

## 已知问题

- 普通文本层 PDF 已不再依赖 Python；如果 `pdf-parse` 无法读取且部署环境没有 Python/pdfplumber，才会返回 PDF 文本提取失败提示。
- 2026-09-09 本地页面上传曾出现 `PDF text extraction failed`，原因是后端默认使用 `python3`，Windows 环境可能没有该命令；已加入 fallback，但仍建议明确配置 `PYTHON_PATH`。
- 本地 Python 3.11 可用，但当前环境未安装 `docling`。因此 Docling 默认不启用。
- 当前仓库没有 Dockerfile、requirements 或 docling-serve 部署配置；把 Docling 默认上线会明显增加部署复杂度。
- 当前 Doubao 解析只在 `ARK_API_KEY` 和 `DOUBAO_MODEL` 都配置时启用；未配置时仍走原有本地规则解析。
- 正式版若“调用了豆包但页面全是未识别”，优先检查上传接口返回的 `resume.parseDiagnostics`：`textLength=0` 多半是文档抽取失败；`parser=local-fallback` 多半是豆包调用或 Zod 校验失败；`parseWarning=AI_RETURNED_EMPTY_FIELDS` 表示豆包返回字段过少但本地规则已尝试兜底。
- `npm run resume:parse:doubao` 只验证 Provider 和 Zod，不等于完整上传接口端到端验证。
- 真实 PDF 的后端链路已跑通，但前端页面需要刷新到最新 Vite 热更新状态后再复测展示。
- 公司官网池里的部分招聘站点由第三方招聘系统承载，页面结构和季节性校招地址可能变化；现有轻量爬取会跳过无法公开读取或需要登录/JS 渲染的岗位。
- 新增公司池里仍有 2 家目前是“官网入口检索”兜底，不等于已完成官网投递入口核验；这是为了先让推荐标签覆盖起来，同时不编造官方 URL。

## 下一步

- 启动后端和前端，在浏览器上传真实 PDF 简历，检查资料页或 onboarding 是否自动填入姓名、邮箱、手机号、教育经历、工作经历、项目经历和技能。
- 如果上传端到端通过，再准备提交；如果失败，优先看后端日志里的 PDF 文本抽取或 `resume_parse_failed`。
- 点击智能推荐，用不同偏好组合验证官网池筛选：`央国企`、`大厂`、`外企`、`银行`、`互联网`、`女性友好`；确认推荐公司只在点击后出现。
- 优先核验并替换高频推荐公司的官方校招/招聘入口：表格里的芯片半导体、智能制造、机器人、新能源、建筑央企、量化私募等。
- 录屏前在 Chrome 扩展管理页重新加载本地插件目录 `chrome-extension`，再打开一个 MokaHR 或相似投递表单测试 3 条实习经历自动新增。
