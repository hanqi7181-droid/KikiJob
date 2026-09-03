# JobPilot Frontend Restructure Map

## Protection Lines

- Do not modify `chrome-extension/` while rebuilding the Web product shell.
- Do not change API routes, response shapes, or the SQLite schema during UI-only steps.
- Keep `latestResume.parsedProfile` and `form_mappings` as the shared profile and autofill data source.
- Keep the Chrome extension message contract intact: scan fields, fill steps, fill one field, focus field, dynamic watch, Moka schema export.
- Keep the human-in-the-loop rule: JobPilot may identify and prefill fields, but the user submits on the official website.

## New Primary Routes

| Route | Label | Purpose |
| --- | --- | --- |
| `#/recommend` | 推荐 | 推荐公司、推荐岗位、筛选排序、JD 详情、匹配原因和简历建议入口。 |
| `#/assist` | 辅助投递 | 登录官网、确认申请页、创建 Autofill Session、导入扩展扫描、生成填充包和结果回写。 |
| `#/applications` | 投递记录 | 列表/看板 CRM、搜索筛选、状态编辑、备注、下一步行动、JD 快照和 Autofill 摘要。 |
| `#/profile` | 我的资料 | 基本资料、经历、简历版本、求职偏好、自动填写规则、网站字段记忆和隐私数据。 |

## Legacy Route Redirects

| Legacy tab/hash | New route | Handling |
| --- | --- | --- |
| `#/search` | `#/recommend` | Hidden from navigation, redirected at runtime. |
| `#/companies` | `#/recommend` | Hidden from navigation, redirected at runtime. |
| `#/jobs` | `#/applications` | Hidden from navigation, redirected at runtime. |
| `#/followups` | `#/applications` | Hidden from navigation, redirected at runtime. |
| `#/resume` | `#/profile` | Hidden from navigation, redirected at runtime. |
| `#/packet` | `#/profile` | Hidden from navigation, redirected at runtime. |
| `#/mapping` | `#/assist` | Hidden from navigation, redirected at runtime. |
| `#/autofill` | `#/assist` | Hidden from navigation, redirected at runtime. |
| `#/materials` | `#/applications` | Hidden from navigation, redirected at runtime. |

## Removed Legacy UI

The old user-facing Web components were removed after the new four-route flow was verified:

| Removed legacy area | Replacement |
| --- | --- |
| `SearchPage`, Boss/LinkedIn search portal cards, search result import assistant | `RecommendPage` for job discovery, `AssistPage` for official application flow |
| `CompaniesPage`, company portal strip | compact recommended companies inside `#/recommend` |
| `JobsPage`, old job pool cards | `ApplicationsPage` list and kanban CRM in `#/applications` |
| `FollowupsPage` | next-action fields and filters inside `#/applications` |
| `ResumePage`, `ProfileForm`, `PacketPage` | unified `MyProfilePage` sections in `#/profile` |
| `FormMappingPage` | autofill rules and website field memory sections in `#/profile`; scan/review stays in `#/assist` |
| `MaterialsPage` | JD detail drawer match tab and resume suggestion actions in `#/recommend` |

Historical hashes continue to redirect at runtime, and the address bar is replaced with the new canonical route.

## Migration Risks

- `apiState` still drives save/error logic internally, but backend connection success text is not shown to users.
- `jobs` and `applications` still rely on backward-compatible backend view models. Add migrations separately before changing backend tables.
- `form_mappings` contains standard mappings plus learned mappings. Do not split this data source during UI migration.
