# Auto CV 产品与技术规划

## 产品定位

Auto CV 是一个面向普通求职者的岗位推荐、材料生成与投递管理系统。系统先收集用户求职画像，再从 Boss 直聘、LinkedIn 和公司官网 Careers 页面获取岗位，结合用户简历与偏好给出匹配评分，并生成投递队列。

第一阶段建议保持“半自动投递”：系统推荐、生成材料、打开投递入口，用户确认后投递。这样更适合真实求职场景，也能降低账号风控、误投和平台条款风险。

## 用户需要填写的信息

- 简历上传：PDF、Word、Markdown、纯文本。
- 目标岗位方向：支持多个方向和自然语言描述。
- 身份：应届毕业生、在读学生、职场人士、转行求职者。
- 目标：实习、校招、社招、远程、兼职。
- 城市/国家偏好：支持多个城市、地区和远程。
- 薪资范围：按实习、校招、社招分别填写。
- 行业偏好：互联网大厂、金融科技、央国企、银行中后台、外企等。
- 公司规模偏好：大厂、中大型、初创、国企、外企等。
- 已有账号：Boss 直聘、LinkedIn、其他平台。
- 简历微调权限：是否允许系统针对岗位改写关键词和项目表述。

## MVP 流程

1. 用户填写求职画像并上传简历。
2. 系统解析用户输入，形成偏好标签。
3. 岗位池进入系统，当前版本先用模拟数据。
4. 系统根据城市、目标、行业、岗位关键词计算匹配分。
5. 用户查看推荐岗位，筛选来源。
6. 用户把岗位标记为待确认、已加入队列、已投递或不合适。
7. 系统记录投递状态，后续可扩展提醒和复盘。

## 后续真实数据来源

### Boss 直聘

- 第一阶段：搜索辅助与岗位链接导入。
- 第二阶段：登录态浏览器辅助读取岗位信息。
- 投递动作建议保留人工确认，避免批量自动投递导致账号异常。

### LinkedIn

- 第一阶段：关键词搜索链接、岗位详情页解析、人工确认投递。
- 第二阶段：结合用户登录态进行职位收藏、Easy Apply 表单预填。
- 对跨境岗位要增加签证、语言和工作地过滤。

### 公司官网

- 优先支持公开 Careers 页面。
- 可自动搜索“公司名 careers / jobs / campus recruitment”。
- 官网表单比招聘平台更适合做自动填表，但提交前仍建议人工确认。

## 推荐评分维度

- 岗位关键词匹配：技能、职位方向、行业方向。
- 城市/国家匹配：目标城市、远程选项、香港/海外特殊规则。
- 求职目标匹配：实习、校招、社招。
- 行业和公司类型匹配：大厂、央国企、金融科技、银行、外企。
- 薪资匹配：目标薪资上下限。
- 简历证据匹配：项目、技能、教育、证书、语言能力。
- 风险项扣分：地点不符、年限过高、学历不符、技术栈偏差过大。

## 数据库草案

### users

- id
- name
- email
- identity
- created_at

### resumes

- id
- user_id
- file_name
- raw_text
- parsed_profile_json
- created_at

### preferences

- id
- user_id
- target_roles
- goals
- locations
- salary_rules
- industries
- company_types
- allow_resume_tailoring

### jobs

- id
- source
- source_url
- title
- company
- location
- salary
- description
- tags
- company_type
- fetched_at

### matches

- id
- user_id
- job_id
- score
- reasons_json
- risks_json
- created_at

### applications

- id
- user_id
- job_id
- status
- resume_version_id
- cover_letter_id
- applied_at
- notes

## 迭代路线

### V0.1 当前 MVP

- Web 表单。
- 模拟岗位推荐。
- 来源筛选。
- 匹配分。
- 投递状态看板。

### V0.2 后端与数据库

- 增加 API 服务。
- 接 SQLite 或 PostgreSQL。
- 保存用户画像、岗位和投递状态。
- 支持导入岗位链接/JD。

### V0.3 简历解析

- 支持 PDF/Word 文本抽取。
- 提取教育、经历、技能、项目。
- 根据岗位生成匹配理由和缺口提示。

### V0.4 岗位采集

- Boss 和 LinkedIn 搜索辅助。
- 公司官网 Careers 页面搜索。
- 去重、过滤、定时刷新。

### V0.5 材料生成

- 接入 OpenAI 或其他模型。
- 生成简历微调建议、求职信、邮件正文。
- 保留人工审核。

### V0.6 自动填表

- 公司官网表单预填。
- 平台投递动作保留确认。
- 投递后自动记录状态。
