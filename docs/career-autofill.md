# 官网申请页预填助手

当前版本实现“自动识别 + 匹配资料 + 人工确认”的 MVP，不执行自动提交。

## 当前能力

- 顶部导航新增“官网填表”页面。
- 用户可以粘贴 Careers 申请页 URL。
- 系统会根据 URL 识别常见申请系统模板，包括 Workday、Greenhouse、Lever、SmartRecruiters 和通用 Careers 表单。
- 系统会把官网字段与本地“表单映射”匹配，生成确认表。
- 用户可以手动修改匹配字段和值。
- 用户确认后生成“待执行预填步骤”，并支持复制。

## 安全边界

- 不自动点击 Submit / Apply / Send。
- 不绕过验证码、登录、风控或付费墙。
- 文件上传字段会标记为“需确认”。
- 低置信度或人工改过的字段会标记为“需确认”。

## 下一步接浏览器控制

当前已经新增本地浏览器预填接口，可以把 `buildAutofillScript()` 的输出交给浏览器 worker 执行：

1. 使用 `playwright-core` 调用本机 Chrome/Edge 打开用户提供的申请页。
2. 真实读取页面 DOM 中的 input、select、textarea、file 字段。
3. 把真实字段结构传给当前匹配逻辑。
4. 用户在系统内确认字段和值。
5. 浏览器只执行预填，不提交。
6. 停在最终提交按钮前，交给用户人工确认。

部署给普通用户时，建议使用自建 Playwright worker 或 Browserless；在本地开发测试时，可以先用 Codex Browser/Chrome 控制浏览器验证流程。

## 当前浏览器接口

- `POST /api/autofill/run`
- 请求体：`{ "url": "...", "steps": [...] }`
- 行为：启动本机 Chrome/Edge，打开申请页，按 label/name/placeholder 尝试填入 input、textarea、select。
- 文件上传字段会返回 `manual`，不会自动上传。
- 执行结束后浏览器保持打开，用户需要人工检查并决定是否提交。
