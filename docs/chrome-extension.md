# Auto CV Chrome/Edge 扩展

这个扩展用于控制“用户已经打开的当前招聘申请标签页”。它不会自动提交表单。

## 安装

1. 打开 Edge 或 Chrome 的扩展管理页。
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. 打开“开发人员模式”。
3. 点击“加载已解压的扩展”。
4. 选择项目目录下的 `chrome-extension/` 文件夹。
5. 工具栏会出现 `Auto CV Autofill` 扩展。

## 使用流程

1. 在 Auto CV 前端打开“官网填表”页。
2. 粘贴 Careers 申请页 URL，例如 MokaHR 链接。
3. 点击“识别表单”。
4. 检查字段匹配和值，点击“确认字段并生成预填步骤”。
5. 点击“复制扩展填充包”。
6. 在正常浏览器里打开该 Careers 申请页，并完成登录/验证码等人工步骤。
7. 点击浏览器工具栏里的 `Auto CV Autofill` 扩展。
8. 把填充包 JSON 粘贴到扩展文本框。
9. 可以先点“扫描当前页”查看当前页字段。
10. 点击“填当前页”。
11. 逐项检查页面，确认无误后再手动提交。

## 常见问题

### Could not establish connection. Receiving end does not exist.

这个错误表示扩展 popup 没有连接到当前页面的 content script。当前版本已支持点击时自动注入脚本；如果仍然出现：

1. 确认当前标签页是 Careers 申请页，不是 `chrome://extensions/`、新标签页或 Auto CV 自己的页面。
2. 在扩展管理页点击 `Auto CV Autofill` 的“重新加载”按钮。
3. 刷新 MokaHR / Careers 申请页。
4. 再打开扩展，先点“扫描当前页”。

如果页面刚打开还在加载，也等表单字段完全出现后再点扫描。

## 安全边界

- 扩展只填当前活动标签页。
- 扩展不点击 Submit / Apply / Send。
- 文件上传字段会标记为 manual，需要用户手动选择文件。
- 如果页面结构复杂，部分字段可能返回 not_found，需要手动补充。

## 为什么需要扩展

普通网页不能直接控制另一个域名的招聘申请页，这是浏览器安全限制。后端新开浏览器也可能被 MokaHR 等站点网络策略拦截。扩展运行在用户当前标签页里，可以复用用户已经打开、已登录、可访问的页面，因此更适合真实投递场景。
