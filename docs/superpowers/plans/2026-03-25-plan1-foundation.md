# 印刷管理平台 Plan 1：基础设施

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建完整的项目骨架——5张新Teable表、Vite+React项目、Teable API层、bcrypt认证工具、登录/注册页、路由守卫、布局组件、6个基础UI组件，产出可登录的应用骨架。

**Architecture:** Vite + React 18 + React Router v6 + Tailwind CSS。所有数据通过封装好的 Teable API client 访问，用全局 AuthContext 管理登录态，CacheContext 管理表数据缓存。密码在客户端用 bcryptjs 哈希后存入 Teable。teable.js 通过 `configure()` 接收 baseUrl 和 token，便于测试时注入。

**Tech Stack:** React 18, Vite, React Router v6, Tailwind CSS v3, bcryptjs, Vitest, @testing-library/react, @testing-library/user-event

**Spec:** `docs/superpowers/specs/2026-03-25-printing-platform-design.md`

---

## 文件结构预览

```
/Users/zhoulijie/AI探索/印刷平台/
  app/                          ← Vite 项目根目录
    .env                        ← VITE_TEABLE_TOKEN, VITE_TEABLE_BASE_URL
    index.html
    vite.config.js
    tailwind.config.js
    postcss.config.js
    src/
      main.jsx
      App.jsx                   ← 路由配置
      api/
        tables.js               ← 所有表 ID 常量
        teable.js               ← Teable API client（支持 configure() 注入）
      store/
        AuthContext.jsx         ← 登录态 + 权限对象
        CacheContext.jsx        ← 各表数据全局缓存（useRef 避免重渲染）
      utils/
        auth.js                 ← bcrypt 哈希/比对工具
        id.js                   ← 编号生成工具
      components/
        Layout.jsx              ← 顶栏 + 侧边导航主布局
        PrivateRoute.jsx        ← 权限路由守卫
        ui/
          Button.jsx
          Input.jsx
          Table.jsx
          Badge.jsx
          Modal.jsx
          Select.jsx
      pages/
        Login.jsx
        Register.jsx
    src/__tests__/
      setup.js
      api/teable.test.js
      utils/auth.test.js
      utils/id.test.js
      store/AuthContext.test.jsx
      store/CacheContext.test.jsx
      components/ui/Button.test.jsx
```

---

## Task 0：在 Teable 创建 5 张新表

**说明：** Base ID 为 `bseMiLxmWtt0BQcngwy`，服务账号 token 为 `teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=`。

- [ ] **Step 1：创建合同表**

```bash
curl -s -X POST \
  "https://yach-teable.zhiyinlou.com/api/base/bseMiLxmWtt0BQcngwy/table" \
  -H "Authorization: Bearer teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "合同表",
    "fields": [
      {"name": "合同编号", "type": "singleLineText"},
      {"name": "合同名称", "type": "singleLineText"},
      {"name": "有效期开始", "type": "date", "options": {"formatting": {"date": "YYYY-MM-DD", "time": "None", "timeZone": "Asia/Shanghai"}}},
      {"name": "有效期结束", "type": "date", "options": {"formatting": {"date": "YYYY-MM-DD", "time": "None", "timeZone": "Asia/Shanghai"}}},
      {"name": "适用分校", "type": "singleLineText"},
      {"name": "备注", "type": "singleLineText"}
    ]
  }' | python3 -m json.tool
```

记录返回的 `id` 字段（格式 `tbl...`），后续填入 `src/api/tables.js`。

- [ ] **Step 2：创建用户表**

```bash
curl -s -X POST \
  "https://yach-teable.zhiyinlou.com/api/base/bseMiLxmWtt0BQcngwy/table" \
  -H "Authorization: Bearer teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "用户表",
    "fields": [
      {"name": "用户名", "type": "singleLineText"},
      {"name": "密码哈希", "type": "singleLineText"},
      {"name": "姓名", "type": "singleLineText"},
      {"name": "所属分校", "type": "singleLineText"},
      {"name": "所属校区", "type": "singleLineText"},
      {"name": "角色ID", "type": "singleLineText"},
      {"name": "负责校区", "type": "singleLineText"},
      {"name": "状态", "type": "singleLineText"}
    ]
  }' | python3 -m json.tool
```

- [ ] **Step 3：创建角色表**

```bash
curl -s -X POST \
  "https://yach-teable.zhiyinlou.com/api/base/bseMiLxmWtt0BQcngwy/table" \
  -H "Authorization: Bearer teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "角色表",
    "fields": [
      {"name": "角色ID", "type": "singleLineText"},
      {"name": "角色名称", "type": "singleLineText"},
      {"name": "权限配置", "type": "singleLineText"},
      {"name": "描述", "type": "singleLineText"}
    ]
  }' | python3 -m json.tool
```

- [ ] **Step 4：创建校区表**

```bash
curl -s -X POST \
  "https://yach-teable.zhiyinlou.com/api/base/bseMiLxmWtt0BQcngwy/table" \
  -H "Authorization: Bearer teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "校区表",
    "fields": [
      {"name": "校区名称", "type": "singleLineText"},
      {"name": "所属分校", "type": "singleLineText"},
      {"name": "地址", "type": "singleLineText"},
      {"name": "收件人", "type": "singleLineText"},
      {"name": "电话", "type": "singleLineText"}
    ]
  }' | python3 -m json.tool
```

- [ ] **Step 5：创建分发表**

```bash
curl -s -X POST \
  "https://yach-teable.zhiyinlou.com/api/base/bseMiLxmWtt0BQcngwy/table" \
  -H "Authorization: Bearer teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "分发表",
    "fields": [
      {"name": "分发单号", "type": "singleLineText"},
      {"name": "订单编号", "type": "singleLineText"},
      {"name": "所属分校", "type": "singleLineText"},
      {"name": "校区名称", "type": "singleLineText"},
      {"name": "分配数量", "type": "number", "options": {"formatting": {"type": "decimal", "precision": 0}}},
      {"name": "状态", "type": "singleLineText"},
      {"name": "创建时间", "type": "singleLineText"}
    ]
  }' | python3 -m json.tool
```

- [ ] **Step 6：在订单主表新增「驳回原因」字段**

```bash
curl -s -X POST \
  "https://yach-teable.zhiyinlou.com/api/table/tblxenIxdZZcL7Xsp8N/field" \
  -H "Authorization: Bearer teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=" \
  -H "Content-Type: application/json" \
  -d '{"name": "驳回原因", "type": "singleLineText"}' | python3 -m json.tool
```

- [ ] **Step 7：插入种子数据（需先完成 Task 1 的 npm install）**

进入 app 目录生成密码哈希（密码 `Admin@123`）：
```bash
cd "/Users/zhoulijie/AI探索/印刷平台/app"
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Admin@123', 10).then(h => console.log(h))"
```

插入系统管理员角色（将 `<角色表ID>` 替换为 Step 3 返回的表 ID）：
```bash
curl -s -X POST \
  "https://yach-teable.zhiyinlou.com/api/table/<角色表ID>/record" \
  -H "Authorization: Bearer teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [{"fields": {
      "角色ID": "role_sysadmin",
      "角色名称": "系统管理员",
      "权限配置": "{\"bom\":true,\"contracts\":true,\"orders\":true,\"create_order\":true,\"distribution\":true,\"approve_orders\":true,\"approve_users\":true,\"admin\":true}",
      "描述": "拥有所有权限"
    }}],
    "fieldKeyType": "name"
  }' | python3 -m json.tool
```

插入初始 admin 用户（将 `<用户表ID>` 替换为 Step 2 返回的表 ID，`<HASH>` 替换为上一步输出的哈希值）：
```bash
curl -s -X POST \
  "https://yach-teable.zhiyinlou.com/api/table/<用户表ID>/record" \
  -H "Authorization: Bearer teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [{"fields": {
      "用户名": "admin",
      "密码哈希": "<HASH>",
      "姓名": "系统管理员",
      "所属分校": "",
      "所属校区": "",
      "角色ID": "role_sysadmin",
      "负责校区": "[]",
      "状态": "已激活"
    }}],
    "fieldKeyType": "name"
  }' | python3 -m json.tool
```

- [ ] **Step 8：记录所有表 ID**

```bash
cat > "/Users/zhoulijie/AI探索/印刷平台/docs/teable-table-ids.md" << 'EOF'
# Teable 表 ID 记录

| 表名 | Table ID |
|---|---|
| 基础价格表 | tbli44QpvUROZMulyEd |
| 产品BOM表 | tblyl9Gu8RsxCLUC1fC |
| 订单主表 | tblxenIxdZZcL7Xsp8N |
| 订单明细表 | tbl2Q4u30171Uxhtcvv |
| 合同表 | 填入Step1返回的ID |
| 用户表 | 填入Step2返回的ID |
| 角色表 | 填入Step3返回的ID |
| 校区表 | 填入Step4返回的ID |
| 分发表 | 填入Step5返回的ID |
EOF
```

---

## Task 1：Vite + React 项目初始化

**Files:**
- Create: `app/` (整个 Vite 项目目录)
- Create: `app/.env`
- Create: `app/tailwind.config.js`
- Create: `app/vite.config.js`

- [ ] **Step 1：创建 Vite React 项目**

```bash
cd "/Users/zhoulijie/AI探索/印刷平台"
npm create vite@latest app -- --template react
cd app
npm install
```

- [ ] **Step 2：安装依赖**

```bash
cd "/Users/zhoulijie/AI探索/印刷平台/app"
npm install react-router-dom@6 bcryptjs xlsx
npm install -D tailwindcss@3 postcss autoprefixer vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npx tailwindcss init -p
```

- [ ] **Step 3：配置 Tailwind**

覆写 `app/tailwind.config.js`：
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

将 `app/src/index.css` 全部内容替换为：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4：配置 Vitest**

覆写 `app/vite.config.js`：
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
  },
})
```

创建 `app/src/__tests__/setup.js`：
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5：创建 `.env` 文件**

```bash
cat > "/Users/zhoulijie/AI探索/印刷平台/app/.env" << 'EOF'
VITE_TEABLE_BASE_URL=https://yach-teable.zhiyinlou.com
VITE_TEABLE_TOKEN=teable_acc7PlfHptFZ2V6JVgM_Szk+5OQCdyv0P1sIkmHRBTjExuOniSkvy17BYF2ONJU=
EOF

cat > "/Users/zhoulijie/AI探索/印刷平台/app/.env.example" << 'EOF'
VITE_TEABLE_BASE_URL=https://yach-teable.zhiyinlou.com
VITE_TEABLE_TOKEN=your_token_here
EOF
```

- [ ] **Step 6：验证项目启动**

```bash
npm run dev
```

预期：`http://localhost:5173` 显示 Vite + React 默认页面。Ctrl+C 停止。

- [ ] **Step 7：Commit**

```bash
cd "/Users/zhoulijie/AI探索/印刷平台"
git init
git add app/
git commit -m "feat: init vite react project with tailwind and vitest"
```

---

## Task 2：Teable API Layer

**Files:**
- Create: `app/src/api/tables.js`
- Create: `app/src/api/teable.js`
- Create: `app/src/__tests__/api/teable.test.js`

**设计说明：** `teable.js` 通过模块级 `config` 对象管理 baseUrl/token，并暴露 `configure()` 函数供测试注入——避免 `import.meta.env` 在测试环境中不可 mock 的问题。

- [ ] **Step 1：写测试**

创建 `app/src/__tests__/api/teable.test.js`：
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configure, teableRequest, fetchAllRecords, createRecord, updateRecord } from '../../api/teable.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  configure({ baseUrl: 'https://test.teable.com', token: 'test_token' })
})

describe('teableRequest', () => {
  it('sends GET with Bearer token and correct URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [], total: 0 }),
    })
    await teableRequest('/api/table/tbl123/record')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.teable.com/api/table/tbl123/record',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test_token' }),
      })
    )
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'Forbidden' })
    await expect(teableRequest('/api/table/tbl123/record')).rejects.toThrow('403')
  })
})

describe('fetchAllRecords', () => {
  it('fetches single page when total <= take', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [{ id: 'r1', fields: {} }], total: 1 }),
    })
    const records = await fetchAllRecords('tbl123')
    expect(records).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('paginates until all records fetched', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ records: Array(1000).fill({ id: 'r', fields: {} }), total: 1200 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ records: Array(200).fill({ id: 'r', fields: {} }), total: 1200 }) })
    const records = await fetchAllRecords('tbl123')
    expect(records).toHaveLength(1200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('createRecord', () => {
  it('sends POST with fields wrapped in records array', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'rec1' }) })
    await createRecord('tbl123', { name: 'test' })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.records[0].fields).toEqual({ name: 'test' })
    expect(body.fieldKeyType).toBe('name')
  })
})

describe('updateRecord', () => {
  it('sends PATCH with correct URL and body structure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await updateRecord('tbl123', 'rec999', { '订单状态': '已审核' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.teable.com/api/table/tbl123/record/rec999',
      expect.objectContaining({ method: 'PATCH' })
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.record.fields).toEqual({ '订单状态': '已审核' })
    expect(body.fieldKeyType).toBe('name')
  })
})
```

- [ ] **Step 2：运行测试，确认失败**

```bash
cd "/Users/zhoulijie/AI探索/印刷平台/app"
npx vitest run src/__tests__/api/teable.test.js
```

预期：FAIL（模块不存在）

- [ ] **Step 3：创建 `app/src/api/tables.js`**

```js
// 所有 Teable 表 ID 常量
// Task 0 完成后将新建表的 ID 填入此处
export const TABLES = {
  // 现有表
  PRICE_BASE: 'tbli44QpvUROZMulyEd',    // 基础价格表
  PRODUCT_BOM: 'tblyl9Gu8RsxCLUC1fC',  // 产品BOM表
  ORDER_MAIN: 'tblxenIxdZZcL7Xsp8N',   // 订单主表
  ORDER_DETAIL: 'tbl2Q4u30171Uxhtcvv', // 订单明细表

  // 新建表（Task 0 完成后填入）
  CONTRACT: '',      // 合同表
  USER: '',          // 用户表
  ROLE: '',          // 角色表
  CAMPUS: '',        // 校区表
  DISTRIBUTION: '',  // 分发表
}
```

- [ ] **Step 4：创建 `app/src/api/teable.js`**

```js
// 模块级配置对象，便于测试注入（避免直接依赖 import.meta.env）
const config = {
  baseUrl: import.meta.env?.VITE_TEABLE_BASE_URL ?? '',
  token: import.meta.env?.VITE_TEABLE_TOKEN ?? '',
}

/** 测试时注入配置，覆盖 env 变量 */
export function configure(newConfig) {
  Object.assign(config, newConfig)
}

/** 基础请求：自动附加 Bearer token */
export async function teableRequest(path, options = {}) {
  const url = `${config.baseUrl}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Teable API error ${response.status}: ${text}`)
  }
  return response.json()
}

/** 拉取某表全量记录（自动分页，1000条/页） */
export async function fetchAllRecords(tableId) {
  const allRecords = []
  const take = 1000
  let skip = 0

  while (true) {
    const data = await teableRequest(
      `/api/table/${tableId}/record?fieldKeyType=name&take=${take}&skip=${skip}`
    )
    allRecords.push(...data.records)
    if (allRecords.length >= data.total) break
    skip += take
  }

  return allRecords
}

/** 创建记录 */
export async function createRecord(tableId, fields) {
  return teableRequest(`/api/table/${tableId}/record`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ fields }], fieldKeyType: 'name' }),
  })
}

/**
 * 更新记录
 * Teable PATCH 单条记录格式：{ "record": { "fields": {...} }, "fieldKeyType": "name" }
 */
export async function updateRecord(tableId, recordId, fields) {
  return teableRequest(`/api/table/${tableId}/record/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ record: { fields }, fieldKeyType: 'name' }),
  })
}

/** 删除记录 */
export async function deleteRecord(tableId, recordId) {
  return teableRequest(`/api/table/${tableId}/record/${recordId}`, {
    method: 'DELETE',
  })
}
```

- [ ] **Step 5：运行测试，确认通过**

```bash
npx vitest run src/__tests__/api/teable.test.js
```

预期：全部 PASS

- [ ] **Step 6：Commit**

```bash
git add src/api/ src/__tests__/api/
git commit -m "feat: add Teable API client with pagination and testable configure()"
```

---

## Task 3：Auth 工具函数

**Files:**
- Create: `app/src/utils/auth.js`
- Create: `app/src/utils/id.js`
- Create: `app/src/__tests__/utils/auth.test.js`
- Create: `app/src/__tests__/utils/id.test.js`

- [ ] **Step 1：写 auth.js 测试**

创建 `app/src/__tests__/utils/auth.test.js`：
```js
import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword, parsePermissions } from '../../utils/auth.js'

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('TestPass123')
    expect(hash).toMatch(/^\$2[aby]\$/)
  })

  it('produces different hashes for same password (salted)', async () => {
    const [h1, h2] = await Promise.all([hashPassword('same'), hashPassword('same')])
    expect(h1).not.toBe(h2)
  })
})

describe('comparePassword', () => {
  it('returns true for matching password', async () => {
    const hash = await hashPassword('correct')
    expect(await comparePassword('correct', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await comparePassword('wrong', hash)).toBe(false)
  })
})

describe('parsePermissions', () => {
  it('parses valid JSON permission string', () => {
    const perm = parsePermissions('{"bom":true,"admin":false}')
    expect(perm.bom).toBe(true)
    expect(perm.admin).toBe(false)
  })

  it('fills missing keys with false', () => {
    const perm = parsePermissions('{"bom":true}')
    expect(perm.contracts).toBe(false)
  })

  it('returns all-false on invalid JSON', () => {
    const perm = parsePermissions('not-json')
    expect(perm.bom).toBe(false)
    expect(perm.admin).toBe(false)
  })

  it('returns all-false when input is null/undefined', () => {
    expect(parsePermissions(null).bom).toBe(false)
    expect(parsePermissions(undefined).admin).toBe(false)
  })
})
```

- [ ] **Step 2：写 id.js 测试**

创建 `app/src/__tests__/utils/id.test.js`：
```js
import { describe, it, expect } from 'vitest'
import { generateOrderId, generateDistributionId } from '../../utils/id.js'

describe('generateOrderId', () => {
  it('starts with DD prefix', () => {
    expect(generateOrderId()).toMatch(/^DD\d+$/)
  })

  it('generates unique IDs across 100 calls', () => {
    const ids = new Set(Array.from({ length: 100 }, generateOrderId))
    expect(ids.size).toBe(100)
  })
})

describe('generateDistributionId', () => {
  it('starts with FP prefix', () => {
    expect(generateDistributionId()).toMatch(/^FP\d+$/)
  })

  it('generates unique IDs across 100 calls', () => {
    const ids = new Set(Array.from({ length: 100 }, generateDistributionId))
    expect(ids.size).toBe(100)
  })
})
```

- [ ] **Step 3：运行测试，确认失败**

```bash
npx vitest run src/__tests__/utils/
```

预期：FAIL

- [ ] **Step 4：创建 `app/src/utils/auth.js`**

```js
import bcrypt from 'bcryptjs'

const COST_FACTOR = 10

const DEFAULT_PERMISSIONS = {
  bom: false,
  contracts: false,
  orders: false,
  create_order: false,
  distribution: false,
  approve_orders: false,
  approve_users: false,
  admin: false,
}

export function hashPassword(password) {
  return bcrypt.hash(password, COST_FACTOR)
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

/**
 * 解析角色权限 JSON 字符串。
 * 解析失败或输入为空时返回全 false 的权限对象。
 */
export function parsePermissions(jsonString) {
  try {
    if (!jsonString) return { ...DEFAULT_PERMISSIONS }
    return { ...DEFAULT_PERMISSIONS, ...JSON.parse(jsonString) }
  } catch {
    return { ...DEFAULT_PERMISSIONS }
  }
}
```

- [ ] **Step 5：创建 `app/src/utils/id.js`**

```js
/**
 * 生成唯一编号：前缀 + 时间戳(ms) + 随机4位数字
 * 保证同一毫秒内不同随机数的唯一性，适用于内部工具单用户场景
 */
function makeId(prefix) {
  const random = Math.floor(Math.random() * 9000) + 1000
  return `${prefix}${Date.now()}${random}`
}

export function generateOrderId() {
  return makeId('DD')
}

export function generateDistributionId() {
  return makeId('FP')
}
```

- [ ] **Step 6：运行测试，确认通过**

```bash
npx vitest run src/__tests__/utils/
```

预期：全部 PASS

- [ ] **Step 7：Commit**

```bash
git add src/utils/ src/__tests__/utils/
git commit -m "feat: add auth utils (bcrypt) and id generator"
```

---

## Task 4：Auth Context

**Files:**
- Create: `app/src/store/AuthContext.jsx`
- Create: `app/src/__tests__/store/AuthContext.test.jsx`

- [ ] **Step 1：写测试**

创建 `app/src/__tests__/store/AuthContext.test.jsx`：
```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../../store/AuthContext.jsx'
import * as teable from '../../api/teable.js'
import * as authUtils from '../../utils/auth.js'

// 测试用辅助组件
function TestConsumer() {
  const { user, permissions, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? user.fields['用户名'] : 'none'}</span>
      <span data-testid="perm-admin">{String(permissions.admin)}</span>
      <button onClick={() => login('admin', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

const mockActiveUser = {
  id: 'rec1',
  fields: { '用户名': 'admin', '密码哈希': 'hash', '状态': '已激活', '角色ID': 'role_admin' },
}
const mockRole = {
  id: 'role1',
  fields: { '角色ID': 'role_admin', '权限配置': '{"admin":true,"bom":true}' },
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('login', () => {
  it('sets user and permissions on successful login', async () => {
    vi.spyOn(teable, 'fetchAllRecords')
      .mockResolvedValueOnce([mockActiveUser])   // 用户表
      .mockResolvedValueOnce([mockRole])          // 角色表
    vi.spyOn(authUtils, 'comparePassword').mockResolvedValueOnce(true)

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await act(async () => {
      await userEvent.click(screen.getByText('Login'))
    })

    expect(screen.getByTestId('user').textContent).toBe('admin')
    expect(screen.getByTestId('perm-admin').textContent).toBe('true')
  })

  it('returns error for pending user', async () => {
    const pendingUser = { ...mockActiveUser, fields: { ...mockActiveUser.fields, '状态': '待审核' } }
    vi.spyOn(teable, 'fetchAllRecords').mockResolvedValueOnce([pendingUser])

    let loginResult
    function Capture() {
      const { login } = useAuth()
      return <button onClick={async () => { loginResult = await login('admin', 'pass') }}>Go</button>
    }
    render(<AuthProvider><Capture /></AuthProvider>)
    await act(async () => { await userEvent.click(screen.getByText('Go')) })

    expect(loginResult.success).toBe(false)
    expect(loginResult.error).toContain('审核中')
  })

  it('returns error for wrong password', async () => {
    vi.spyOn(teable, 'fetchAllRecords').mockResolvedValueOnce([mockActiveUser])
    vi.spyOn(authUtils, 'comparePassword').mockResolvedValueOnce(false)

    let loginResult
    function Capture() {
      const { login } = useAuth()
      return <button onClick={async () => { loginResult = await login('admin', 'wrong') }}>Go</button>
    }
    render(<AuthProvider><Capture /></AuthProvider>)
    await act(async () => { await userEvent.click(screen.getByText('Go')) })

    expect(loginResult.success).toBe(false)
    expect(loginResult.error).toContain('密码')
  })
})

describe('logout', () => {
  it('clears user and permissions', async () => {
    vi.spyOn(teable, 'fetchAllRecords')
      .mockResolvedValueOnce([mockActiveUser])
      .mockResolvedValueOnce([mockRole])
    vi.spyOn(authUtils, 'comparePassword').mockResolvedValueOnce(true)

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await act(async () => { await userEvent.click(screen.getByText('Login')) })
    expect(screen.getByTestId('user').textContent).toBe('admin')

    await act(async () => { await userEvent.click(screen.getByText('Logout')) })
    expect(screen.getByTestId('user').textContent).toBe('none')
    expect(localStorage.getItem('print_platform_session')).toBeNull()
  })
})
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run src/__tests__/store/AuthContext.test.jsx
```

预期：FAIL

- [ ] **Step 3：创建 `app/src/store/AuthContext.jsx`**

```jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { fetchAllRecords } from '../api/teable.js'
import { TABLES } from '../api/tables.js'
import { comparePassword, parsePermissions } from '../utils/auth.js'

const AuthContext = createContext(null)
const SESSION_KEY = 'print_platform_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        const { user: u, permissions: p } = JSON.parse(saved)
        setUser(u)
        setPermissions(p)
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    }
    setLoading(false)
  }, [])

  async function login(username, password) {
    const users = await fetchAllRecords(TABLES.USER)
    const found = users.find(r => r.fields['用户名'] === username)
    if (!found) return { success: false, error: '用户名或密码错误' }

    const status = found.fields['状态']
    if (status === '待审核') return { success: false, error: '账号审核中，请联系校区管理员' }
    if (status === '已驳回') return { success: false, error: '注册申请未通过' }

    const ok = await comparePassword(password, found.fields['密码哈希'])
    if (!ok) return { success: false, error: '用户名或密码错误' }

    let perms = parsePermissions(null)
    const roleId = found.fields['角色ID']
    if (roleId) {
      const roles = await fetchAllRecords(TABLES.ROLE)
      const role = roles.find(r => r.fields['角色ID'] === roleId)
      if (role) perms = parsePermissions(role.fields['权限配置'])
    }

    setUser(found)
    setPermissions(perms)
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: found, permissions: perms }))
    return { success: true }
  }

  function logout() {
    setUser(null)
    setPermissions({})
    localStorage.removeItem(SESSION_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 4：运行测试，确认通过**

```bash
npx vitest run src/__tests__/store/AuthContext.test.jsx
```

预期：全部 PASS

- [ ] **Step 5：Commit**

```bash
git add src/store/AuthContext.jsx src/__tests__/store/
git commit -m "feat: add AuthContext with login/logout and permission resolution"
```

---

## Task 5：Cache Context

**Files:**
- Create: `app/src/store/CacheContext.jsx`
- Create: `app/src/__tests__/store/CacheContext.test.jsx`

- [ ] **Step 1：写测试**

创建 `app/src/__tests__/store/CacheContext.test.jsx`：
```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { CacheProvider, useCache } from '../../store/CacheContext.jsx'
import * as teable from '../../api/teable.js'

function makeRecords(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `r${i}`, fields: {} }))
}

describe('getTableData', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('fetches from API on first call', async () => {
    const spy = vi.spyOn(teable, 'fetchAllRecords').mockResolvedValueOnce(makeRecords(5))
    let result
    function Comp() {
      const { getTableData } = useCache()
      return <button onClick={async () => { result = await getTableData('tbl1') }}>go</button>
    }
    const { getByText } = render(<CacheProvider><Comp /></CacheProvider>)
    await act(async () => { getByText('go').click() })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(5)
  })

  it('returns cached data on second call without fetch', async () => {
    const spy = vi.spyOn(teable, 'fetchAllRecords').mockResolvedValue(makeRecords(3))
    let calls = 0
    function Comp() {
      const { getTableData } = useCache()
      return <button onClick={async () => {
        await getTableData('tbl2')
        await getTableData('tbl2')
        calls++
      }}>go</button>
    }
    const { getByText } = render(<CacheProvider><Comp /></CacheProvider>)
    await act(async () => { getByText('go').click() })
    expect(spy).toHaveBeenCalledTimes(1) // second call hits cache
  })

  it('refetches when forceRefresh=true', async () => {
    const spy = vi.spyOn(teable, 'fetchAllRecords').mockResolvedValue(makeRecords(2))
    function Comp() {
      const { getTableData } = useCache()
      return <button onClick={async () => {
        await getTableData('tbl3')
        await getTableData('tbl3', true)
      }}>go</button>
    }
    const { getByText } = render(<CacheProvider><Comp /></CacheProvider>)
    await act(async () => { getByText('go').click() })
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

describe('invalidate', () => {
  it('causes next getTableData call to refetch', async () => {
    const spy = vi.spyOn(teable, 'fetchAllRecords').mockResolvedValue(makeRecords(1))
    function Comp() {
      const { getTableData, invalidate } = useCache()
      return <button onClick={async () => {
        await getTableData('tbl4')
        invalidate('tbl4')
        await getTableData('tbl4')
      }}>go</button>
    }
    const { getByText } = render(<CacheProvider><Comp /></CacheProvider>)
    await act(async () => { getByText('go').click() })
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run src/__tests__/store/CacheContext.test.jsx
```

- [ ] **Step 3：创建 `app/src/store/CacheContext.jsx`**

```jsx
import { createContext, useContext, useRef, useState, useCallback } from 'react'
import { fetchAllRecords } from '../api/teable.js'

const CacheContext = createContext(null)

export function CacheProvider({ children }) {
  // 使用 useRef 存储缓存数据，避免每次 setState 导致 getTableData 引用变化
  const cacheRef = useRef({})
  const loadingRef = useRef({})
  const [, forceUpdate] = useState(0) // 触发重渲染

  const getTableData = useCallback(async (tableId, forceRefresh = false) => {
    if (!forceRefresh && cacheRef.current[tableId]) {
      return cacheRef.current[tableId]
    }

    loadingRef.current[tableId] = true
    forceUpdate(n => n + 1)
    try {
      const records = await fetchAllRecords(tableId)
      cacheRef.current[tableId] = records
      return records
    } finally {
      loadingRef.current[tableId] = false
      forceUpdate(n => n + 1)
    }
  }, []) // 空依赖——函数引用稳定

  const invalidate = useCallback((tableId) => {
    delete cacheRef.current[tableId]
  }, [])

  const isLoading = (tableId) => !!loadingRef.current[tableId]

  return (
    <CacheContext.Provider value={{ getTableData, invalidate, isLoading }}>
      {children}
    </CacheContext.Provider>
  )
}

export function useCache() {
  const ctx = useContext(CacheContext)
  if (!ctx) throw new Error('useCache must be used within CacheProvider')
  return ctx
}
```

- [ ] **Step 4：运行测试，确认通过**

```bash
npx vitest run src/__tests__/store/CacheContext.test.jsx
```

预期：全部 PASS

- [ ] **Step 5：Commit**

```bash
git add src/store/CacheContext.jsx src/__tests__/store/CacheContext.test.jsx
git commit -m "feat: add CacheContext with stable ref-based caching"
```

---

## Task 6：基础 UI 组件（调用 UI skill）

**说明：** 此 Task 实现时**必须先调用 `ui-ux-pro-max:ui-ux-pro-max` skill**，按超极简主义风格生成组件。以下为接口规范和测试，样式由 UI skill 决定。

**Files:**
- Create: `app/src/components/ui/Button.jsx`
- Create: `app/src/components/ui/Input.jsx`
- Create: `app/src/components/ui/Table.jsx`
- Create: `app/src/components/ui/Badge.jsx`
- Create: `app/src/components/ui/Modal.jsx`
- Create: `app/src/components/ui/Select.jsx`
- Create: `app/src/__tests__/components/ui/Button.test.jsx`

- [ ] **Step 1：写 Button 测试**

创建 `app/src/__tests__/components/ui/Button.test.jsx`：
```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../../../components/ui/Button.jsx'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>提交</Button>)
    expect(screen.getByRole('button', { name: '提交' })).toBeInTheDocument()
  })

  it('calls onClick on click', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when loading=true', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders secondary variant without error', () => {
    render(<Button variant="secondary">Next</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders danger variant without error', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run src/__tests__/components/
```

- [ ] **Step 3：为剩余 5 个组件补充基础测试**

创建 `app/src/__tests__/components/ui/Input.test.jsx`：
```jsx
import { render, screen } from '@testing-library/react'
import Input from '../../../components/ui/Input.jsx'

it('renders label and input', () => {
  render(<Input label="用户名" value="" onChange={() => {}} />)
  expect(screen.getByText('用户名')).toBeInTheDocument()
  expect(screen.getByRole('textbox')).toBeInTheDocument()
})

it('shows error message', () => {
  render(<Input label="x" error="必填" value="" onChange={() => {}} />)
  expect(screen.getByText('必填')).toBeInTheDocument()
})
```

创建 `app/src/__tests__/components/ui/Badge.test.jsx`：
```jsx
import { render, screen } from '@testing-library/react'
import Badge from '../../../components/ui/Badge.jsx'

it.each([
  ['pending', '待审核'],
  ['approved', '已审核'],
  ['rejected', '已驳回'],
  ['confirmed', '已确认'],
  ['active', '已激活'],
])('renders correct label for status=%s', (status, label) => {
  render(<Badge status={status} />)
  expect(screen.getByText(label)).toBeInTheDocument()
})
```

创建 `app/src/__tests__/components/ui/Modal.test.jsx`：
```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Modal from '../../../components/ui/Modal.jsx'

it('renders title when open', () => {
  render(<Modal open title="确认操作" onClose={() => {}}>内容</Modal>)
  expect(screen.getByText('确认操作')).toBeInTheDocument()
})

it('does not render when closed', () => {
  render(<Modal open={false} title="确认操作" onClose={() => {}}>内容</Modal>)
  expect(screen.queryByText('确认操作')).not.toBeInTheDocument()
})

it('calls onClose when close button clicked', async () => {
  const onClose = vi.fn()
  render(<Modal open title="T" onClose={onClose}>内容</Modal>)
  await userEvent.click(screen.getByRole('button', { name: /关闭|×|close/i }))
  expect(onClose).toHaveBeenCalled()
})
```

创建 `app/src/__tests__/components/ui/Table.test.jsx`：
```jsx
import { render, screen } from '@testing-library/react'
import Table from '../../../components/ui/Table.jsx'

const columns = [{ key: 'name', title: '名称' }, { key: 'status', title: '状态' }]
const data = [{ name: '产品A', status: '待审核' }]

it('renders column headers', () => {
  render(<Table columns={columns} data={data} />)
  expect(screen.getByText('名称')).toBeInTheDocument()
  expect(screen.getByText('状态')).toBeInTheDocument()
})

it('renders row data', () => {
  render(<Table columns={columns} data={data} />)
  expect(screen.getByText('产品A')).toBeInTheDocument()
})

it('shows emptyText when data is empty', () => {
  render(<Table columns={columns} data={[]} emptyText="暂无数据" />)
  expect(screen.getByText('暂无数据')).toBeInTheDocument()
})
```

创建 `app/src/__tests__/components/ui/Select.test.jsx`：
```jsx
import { render, screen } from '@testing-library/react'
import Select from '../../../components/ui/Select.jsx'

const options = [{ value: 'a', label: '选项A' }, { value: 'b', label: '选项B' }]

it('renders label', () => {
  render(<Select label="类型" options={options} value="" onChange={() => {}} />)
  expect(screen.getByText('类型')).toBeInTheDocument()
})

it('renders all options', () => {
  render(<Select label="类型" options={options} value="" onChange={() => {}} />)
  expect(screen.getByText('选项A')).toBeInTheDocument()
  expect(screen.getByText('选项B')).toBeInTheDocument()
})
```

- [ ] **Step 4：调用 UI skill 生成 6 个组件**

调用 `ui-ux-pro-max:ui-ux-pro-max` skill，说明：超极简主义，Tailwind CSS，React，生成以下 6 个组件：

**接口规范：**
```
Button: variant('primary'|'secondary'|'danger', default='primary'), size('sm'|'md', default='md'),
        disabled, loading(spinner+disable), onClick, type, children

Input:  label(string), error(string，红色提示), type(default='text'),
        placeholder, value, onChange, disabled, ...其余input props

Select: label(string), options([{value,label}]), value, onChange, disabled, placeholder(string)

Table:  columns([{key,title,render?}]), data(array), loading(skeleton行), emptyText(string)

Badge:  status('pending'|'approved'|'rejected'|'confirmed'|'active')
        映射：pending→待审核灰，approved→已审核黑底白字，rejected→已驳回红底白字，
              confirmed→已确认黑底白字，active→已激活黑底白字

Modal:  open(bool), onClose, title(string), children, footer(ReactNode)
```

颜色规范：背景 #FFFFFF/#F9FAFB，文字 #111827/#6B7280，边框 #E5E7EB，
主按钮 #111827 底色，危险 #EF4444，成功 #10B981。无渐变无装饰阴影。

- [ ] **Step 5：运行测试，确认通过**

```bash
npx vitest run src/__tests__/components/
```

预期：全部 PASS

- [ ] **Step 6：Commit**

```bash
git add src/components/ui/ src/__tests__/components/
git commit -m "feat: add base UI components (Button, Input, Select, Table, Badge, Modal)"
```

---

## Task 7：Layout + 路由守卫 + App 框架

**Files:**
- Create: `app/src/components/PrivateRoute.jsx`
- Create: `app/src/components/Layout.jsx`
- Create: `app/src/App.jsx`
- Modify: `app/src/main.jsx`

- [ ] **Step 1：创建 `app/src/components/PrivateRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext.jsx'

export default function PrivateRoute({ children, permKey }) {
  const { user, permissions, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        加载中...
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (permKey && !permissions[permKey]) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500 text-sm">无访问权限</p>
          <p className="text-gray-400 text-xs mt-1">请联系管理员分配角色</p>
        </div>
      </div>
    )
  }
  return children
}
```

- [ ] **Step 2：调用 UI skill 生成 Layout.jsx**

调用 `ui-ux-pro-max:ui-ux-pro-max` skill，生成超极简主义布局组件。

**重要：Layout 通过 `children` prop 渲染主内容，不使用 React Router 的 `<Outlet>`。**

规格：
- Props: `children`（必须渲染在主内容区域）
- 顶栏 h-12（48px），白色，底部 `border-b border-gray-200`
- 顶栏左：「印刷管理平台」text-sm font-medium text-gray-900
- 顶栏右：`{user.fields['姓名']}` + 「退出」次要小按钮（调用 `logout()`）
- 左侧导航 w-48（192px），固定定位，top-12，白色，right border
- 导航项根据权限动态渲染（见下方 navItems）
- 主内容：`{children}` 渲染在 ml-48 pt-12 的区域，内部 padding p-8，max-w-6xl
- 使用 `useAuth()` 获取 user/permissions/logout，使用 `useLocation()` 判断当前路径

```js
// navItems 配置（在 Layout.jsx 内定义）
const navItems = [
  { path: '/', label: '首页', permKey: null },
  { path: '/bom', label: '产品BOM', permKey: 'bom' },
  { path: '/contracts', label: '合同管理', permKey: 'contracts' },
  { path: '/orders/create', label: '创建订单', permKey: 'create_order' },
  { path: '/orders', label: '查询订单', permKey: 'orders' },
  { path: '/distribution', label: '分发管理', permKey: 'distribution' },
  { path: '/admin/users', label: '用户管理', permKey: 'admin' },
  { path: '/admin/roles', label: '角色管理', permKey: 'admin' },
]
// 过滤：permKey=null 始终显示，否则检查 permissions[permKey]
```

- [ ] **Step 3：创建 `app/src/App.jsx`**

注意：嵌套 `<Routes>` 内使用**相对路径**（不带前缀 `/`）。

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext.jsx'
import { CacheProvider } from './store/CacheContext.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

const Todo = ({ name }) => (
  <p className="text-sm text-gray-400">{name} — 开发中 (Plan 2/3)</p>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CacheProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Layout>
                    <Routes>
                      {/* 相对路径（不带前缀 /） */}
                      <Route index element={<Todo name="Dashboard" />} />
                      <Route path="bom" element={<PrivateRoute permKey="bom"><Todo name="BOM" /></PrivateRoute>} />
                      <Route path="contracts" element={<PrivateRoute permKey="contracts"><Todo name="Contracts" /></PrivateRoute>} />
                      <Route path="orders/create" element={<PrivateRoute permKey="create_order"><Todo name="CreateOrder" /></PrivateRoute>} />
                      <Route path="orders" element={<PrivateRoute permKey="orders"><Todo name="Orders" /></PrivateRoute>} />
                      <Route path="distribution" element={<PrivateRoute permKey="distribution"><Todo name="Distribution" /></PrivateRoute>} />
                      <Route path="admin/users" element={<PrivateRoute permKey="admin"><Todo name="Users" /></PrivateRoute>} />
                      <Route path="admin/roles" element={<PrivateRoute permKey="admin"><Todo name="Roles" /></PrivateRoute>} />
                    </Routes>
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
        </CacheProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4：更新 `app/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5：启动验证**

```bash
npm run dev
```

访问 `http://localhost:5173` → 应跳转到 `/login`。

- [ ] **Step 6：Commit**

```bash
git add src/components/Layout.jsx src/components/PrivateRoute.jsx src/App.jsx src/main.jsx
git commit -m "feat: add layout, routing and auth guard"
```

---

## Task 8：登录页和注册页（调用 UI skill）

**Files:**
- Create: `app/src/pages/Login.jsx`
- Create: `app/src/pages/Register.jsx`

- [ ] **Step 1：调用 UI skill 生成 Login.jsx**

调用 `ui-ux-pro-max:ui-ux-pro-max` skill，超极简主义登录页。

规格：
- 全页居中（flex items-center justify-center min-h-screen），白色背景
- 卡片最大宽 360px：标题「印刷管理平台」+ 副标题「请登录」
- 字段：用户名 Input、密码 Input（type=password）
- 错误信息：红色 text-sm，在按钮上方
- 登录按钮：primary，全宽，loading 时禁用
- 底部：「还没有账号？申请注册」→ `<Link to="/register">`

集成逻辑：
```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext.jsx'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(username, password)
      if (result.success) navigate('/')
      else setError(result.error)
    } finally {
      setLoading(false)
    }
  }
  // 渲染由 UI skill 决定，将上述 state/handlers 传入对应组件
}
```

- [ ] **Step 2：调用 UI skill 生成 Register.jsx**

调用 `ui-ux-pro-max:ui-ux-pro-max` skill，超极简主义注册页。

规格：
- 全页居中，卡片最大宽 400px，标题「申请注册」
- 字段：用户名、密码（type=password）、确认密码（type=password）、姓名、所属分校、所属校区
- 提交按钮：primary，全宽
- 成功后显示绿色提示「注册申请已提交，请等待校区管理员审核」，不跳转
- 底部：「已有账号？去登录」→ `<Link to="/login">`

集成逻辑：
```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllRecords, createRecord } from '../api/teable.js'
import { hashPassword } from '../utils/auth.js'
import { TABLES } from '../api/tables.js'

export default function Register() {
  const [form, setForm] = useState({ username:'', password:'', confirm:'', name:'', branch:'', campus:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.username || !form.password || !form.name) { setError('请填写所有必填项'); return }
    if (form.password !== form.confirm) { setError('两次密码不一致'); return }
    setLoading(true)
    try {
      const users = await fetchAllRecords(TABLES.USER)
      if (users.some(u => u.fields['用户名'] === form.username)) {
        setError('用户名已被注册'); return
      }
      const hash = await hashPassword(form.password)
      await createRecord(TABLES.USER, {
        '用户名': form.username,
        '密码哈希': hash,
        '姓名': form.name,
        '所属分校': form.branch,
        '所属校区': form.campus,
        '角色ID': '',
        '负责校区': '[]',
        '状态': '待审核',
      })
      setSubmitted(true)
    } catch (err) {
      setError('提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }
}
```

- [ ] **Step 3：端到端验证**

```bash
npm run dev
```

验证清单：
```
□ /login 输入 admin/Admin@123 → 登录成功，进入首页
□ /login 输入错误密码 → 显示错误提示，不跳转
□ /register 填写信息提交 → Teable 用户表出现待审核记录
□ /register 使用已存在用户名 → 显示「用户名已被注册」
```

- [ ] **Step 4：运行全部测试**

```bash
npx vitest run
```

预期：全部 PASS

- [ ] **Step 5：Commit**

```bash
git add src/pages/
git commit -m "feat: add login and register pages"
```

---

## Task 9：Plan 1 收尾验证

- [ ] **Step 1：运行全部测试**

```bash
cd "/Users/zhoulijie/AI探索/印刷平台/app"
npx vitest run
```

预期：全部 PASS，无 FAIL

- [ ] **Step 2：端到端验证清单**

```
□ http://localhost:5173 → 跳转 /login（未登录）
□ admin/Admin@123 登录 → 进入首页，导航栏可见全部8个导航项
□ 点击各导航项 → 显示对应占位文字
□ 退出 → 跳回 /login，再访问 / → 仍跳回 /login（localStorage 已清除）
□ /register 注册 → Teable 中出现待审核用户记录
□ 以待审核用户登录 → 提示「账号审核中」
□ Task 0 的5张新表在 Teable 印刷管理平台文件夹中可见
□ tables.js 中所有 5 个新表 ID 已填入（非空字符串）
```

- [ ] **Step 3：最终 commit**

```bash
git add .
git commit -m "feat: plan 1 complete — foundation with auth, API layer, layout and routing"
```

---

## Plan 1 完成标准

- [ ] Teable 中 5 张新表已创建，订单主表已添加「驳回原因」字段
- [ ] 系统管理员角色和 admin 账号已在 Teable 中存在且可登录
- [ ] `tables.js` 中所有表 ID 均已填入（无空字符串）
- [ ] `npx vitest run` 全部通过，无 FAIL
- [ ] admin 账号可登录，可见全部导航项，退出后重定向到登录页
- [ ] 注册流程正常写入待审核用户

---

**下一步：Plan 2** `docs/superpowers/plans/2026-03-25-plan2-business.md`
（首页看板 · BOM管理 · 合同管理 · 创建订单 · 查询订单/审核）
