# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # 启动开发服务器（localhost:5173，base: /print-management/）
npm run build     # 生产构建，输出至 dist/
npm run lint      # ESLint 检查
npm run preview   # 预览构建产物
npm run deploy    # gh-pages 部署至 dist/

# 测试（vitest，配置在 vite.config.js 的 test 字段）
npx vitest run              # 全量测试（一次性）
npx vitest run src/__tests__/utils/price.test.js  # 单文件测试
npx vitest                  # watch 模式
npx vitest run --coverage   # 生成覆盖率报告
```

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

| 变量 | 说明 |
|------|------|
| `VITE_TEABLE_BASE_URL` | Teable 实例地址（如 `https://yach-teable.zhiyinlou.com`） |
| `VITE_TEABLE_TOKEN` | Teable API Bearer Token |
| `VITE_DEEPSEEK_API_KEY` | DeepSeek VL2 API Key（合同 OCR 解析用，可选） |

## 架构概览

**技术栈**：React 19 + React Router v6 + Tailwind CSS + Vite，无服务端，所有数据持久化在 Teable（开源 Airtable 替代品）。

### 数据层

- **`src/api/teable.js`**：所有 Teable HTTP 请求的基础封装。`teableRequest()` 自动附加 Bearer Token；`fetchAllRecords()` 支持自动分页（1000条/页）。`configure()` 函数用于测试时注入 mock 配置（绕过 `import.meta.env`）。
- **`src/api/tables.js`**：集中管理所有 Teable 表 ID 常量（`TABLES.*`）。新建表后在此文件更新。
- **`src/api/deepseek.js`**：调用 DeepSeek VL2 模型，将合同图片 OCR 解析为结构化 JSON（合同头信息 + 价格明细数组）。
- **`src/store/CacheContext.jsx`**：全局表数据缓存（`useRef` 存储，避免重渲染），通过 `getTableData(tableId, forceRefresh)` 访问，`invalidate(tableId)` 使缓存失效。

### 认证与权限

- **`src/store/AuthContext.jsx`**：登录态持久化到 `localStorage`（key: `print_platform_session`）。登录时从 Teable 用户表拉取并用 bcryptjs 验证密码哈希，同时解析用户角色的权限配置 JSON。
- **`src/utils/auth.js`**：`parsePermissions(jsonString)` 将角色的权限 JSON 字符串解析为固定结构的权限对象，缺失字段默认 `false`。
- **`src/components/PrivateRoute.jsx`**：路由守卫，支持可选的 `permKey` 参数检查特定权限（如 `'bom'`、`'admin'`）。

### 路由结构

`App.jsx` 使用嵌套路由，`basename="/print-management"`：
- 公开：`/login`、`/register`
- 私有（需登录）：`/`（首页）、`/bom`、`/contracts`、`/orders`、`/orders/create`、`/distribution`
- 管理员（需 `admin` 权限）：`/admin/users`、`/admin/roles`

### 业务工具函数（`src/utils/`）

- **`price.js`**：`matchPrice()` 从基础价格表按10个字段精确匹配价格区间；`isContractActive()` 判断合同今日是否有效（兼容 ISO 时间戳和日期字符串）；`isBomDuplicate()` 用6字段组合键检查 BOM 重复。
- **`id.js`**：基于时间戳+递增计数器生成唯一编号（`DD` 前缀=订单，`FP` 前缀=分发）。
- **`export.js`**：用 SheetJS 导出分发清单为 `.xlsx`，以及导入/下载分发模板。

### 测试约定

测试文件位于 `src/__tests__/`，目录结构与 `src/` 镜像。测试框架为 Vitest + jsdom + Testing Library。`src/__tests__/setup.js` 仅引入 `@testing-library/jest-dom`。

测试 Teable API 时使用 `configure()` 注入 mock baseUrl/token，用 `vi.stubGlobal('fetch', ...)` mock 网络请求。
