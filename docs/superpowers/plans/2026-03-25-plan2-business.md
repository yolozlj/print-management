# 印刷管理平台 Plan 2：业务页面

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 price.js 工具函数 + 首页看板、产品BOM管理、合同管理、创建订单、查询订单/审核 5 个业务页面，并替换 App.jsx 中的 Todo 占位组件。

**Architecture:** 每个页面通过 CacheContext.getTableData() 拉取全量数据，前端内存过滤计算；价格匹配逻辑抽取为纯函数 price.js；所有写操作后调用 invalidate() 清除缓存。

**Tech Stack:** React 18, Vite, Tailwind CSS v3, Vitest, React Router v6, CacheContext, AuthContext

**Spec:** `docs/superpowers/specs/2026-03-25-printing-platform-design.md`

---

## 全局约定（subagent 必读）

### 工作目录
所有文件路径基于 `/Users/zhoulijie/AI探索/印刷平台/app/`

### CacheContext API
```js
const { getTableData, invalidate } = useCache()
// getTableData(tableId, forceRefresh=false) → Promise<Record[]>
// invalidate(tableId) — 清除缓存（写操作后调用）
```

### AuthContext API
```js
const { user, permissions } = useAuth()
// user.fields['所属分校']  — 当前用户分校
// user.fields['所属校区']  — 当前用户校区
// permissions.approve_orders — boolean
// permissions.admin          — boolean
```

### Teable Record 格式
```js
{ id: 'recXXX', fields: { '字段名': value } }
```

### Table IDs（来自 src/api/tables.js）
```js
TABLES.ORDER_MAIN      // 订单主表
TABLES.ORDER_DETAIL    // 订单明细表
TABLES.PRICE_BASE      // 基础价格表
TABLES.PRODUCT_BOM     // 产品BOM表
TABLES.CONTRACT        // 合同表
TABLES.DISTRIBUTION    // 分发表
```

### 已有 UI 组件（src/components/ui/）
- `Button` — variant: primary/secondary/danger，size: sm/md，loading prop
- `Input` — label, value, onChange, placeholder, type
- `Select` — label, options:[{value,label}], value, onChange, placeholder
- `Table` — columns:[{key,title,render?}], data:[], loading, emptyText
- `Badge` — status: pending/approved/rejected/confirmed/active
- `Modal` — open, onClose, title, children, footer

### Badge status 对照
```
'待审核' → 'pending'
'已审核' → 'approved'
'已驳回' → 'rejected'
'待确认' → 'pending'
'已确认' → 'confirmed'
'已激活' → 'active'
```

### Teable API（src/api/teable.js）
```js
import { createRecord, updateRecord, deleteRecord } from '../api/teable.js'
// createRecord(tableId, fields) → Promise
// updateRecord(tableId, recordId, fields) → Promise
// deleteRecord(tableId, recordId) → Promise
```

### 测试 mock 模板
```jsx
// src/__tests__/pages/SomePage.test.jsx 顶部固定写法
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('../../store/CacheContext.jsx', () => ({
  useCache: () => ({
    getTableData: vi.fn().mockResolvedValue([]),
    invalidate: vi.fn(),
  }),
}))
vi.mock('../../store/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'u1', fields: { 姓名: '测试员', 所属分校: '北京分校', 所属校区: '朝阳校区', 负责校区: '[]' } },
    permissions: { bom: true, contracts: true, orders: true, create_order: true, distribution: true, admin: true, approve_orders: true, approve_users: true },
    logout: vi.fn(),
  }),
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }) => children,
}))
```

---

## 文件结构

| 文件 | 新建/修改 | 说明 |
|---|---|---|
| `src/utils/price.js` | 新建 | 价格匹配、总价计算、BOM去重、合同有效期判断（纯函数） |
| `src/__tests__/utils/price.test.js` | 新建 | price.js 完整单元测试 |
| `src/pages/Dashboard.jsx` | 新建 | 首页：4个统计卡 + 最近10条订单 |
| `src/pages/Bom.jsx` | 新建 | BOM列表：文本搜索 + 分校过滤 |
| `src/pages/Contracts.jsx` | 新建 | 合同列表 + 展开价格明细 + 新增/编辑合同/价格 |
| `src/pages/CreateOrder.jsx` | 新建 | 创建订单：BOM选择或手动规格 + 合同选价 + 提交 |
| `src/pages/Orders.jsx` | 新建 | 订单列表：状态过滤 + 明细查看 + 审核/驳回 |
| `src/__tests__/pages/Dashboard.test.jsx` | 新建 | Dashboard 渲染测试 |
| `src/__tests__/pages/Bom.test.jsx` | 新建 | Bom 渲染 + 过滤测试 |
| `src/__tests__/pages/Orders.test.jsx` | 新建 | Orders 渲染测试 |
| `src/App.jsx` | 修改 | 替换 Todo 占位为真实页面组件 |

---

## Task 1：价格匹配工具函数 price.js

**Files:**
- Create: `src/utils/price.js`
- Create: `src/__tests__/utils/price.test.js`

- [ ] **Step 1：写失败测试**

创建 `src/__tests__/utils/price.test.js`：

```js
import { describe, it, expect } from 'vitest'
import {
  matchPrice,
  calcLinePrintQty,
  calcLineTotal,
  calcSavings,
  isBomDuplicate,
  isContractActive,
} from '../../utils/price.js'

const makePrice = (fields) => ({ id: 'p1', fields })

const baseCriteria = {
  contractName: '合同A',
  branch: '北京分校',
  type: '教材',
  size: 'A4',
  binding: '平装',
  pageType: '内页',
  paperType: '轻型纸',
  paperBrand: '品牌X',
  printReq: '黑白',
  craftReq: '',
  quantity: 500,
}

const matchingPriceFields = {
  合同名称: '合同A', 所属分校: '北京分校', 类型: '教材',
  成品尺寸: 'A4', 装订要求: '平装', '封面/内页': '内页',
  纸张种类: '轻型纸', 纸张品牌: '品牌X', 印刷要求: '黑白',
  工艺要求: '', 数量起: 100, 数量止: 999, 印刷单价: 2.5,
}

describe('matchPrice', () => {
  it('returns null unitPrice when no records', () => {
    expect(matchPrice([], baseCriteria)).toEqual({ unitPrice: null, warning: null })
  })

  it('matches a record within quantity range', () => {
    expect(matchPrice([makePrice(matchingPriceFields)], baseCriteria))
      .toEqual({ unitPrice: 2.5, warning: null })
  })

  it('returns null when quantity out of range', () => {
    const r = makePrice({ ...matchingPriceFields, 数量起: 1000, 数量止: 9999 })
    expect(matchPrice([r], baseCriteria)).toEqual({ unitPrice: null, warning: null })
  })

  it('returns first match with warning when multiple records match', () => {
    const r1 = makePrice({ ...matchingPriceFields, 印刷单价: 2.5 })
    const r2 = makePrice({ ...matchingPriceFields, 印刷单价: 3.0 })
    const result = matchPrice([r1, r2], baseCriteria)
    expect(result.unitPrice).toBe(2.5)
    expect(result.warning).toBe('发现多条价格记录，已取第一条')
  })

  it('returns null when contract name does not match', () => {
    const r = makePrice({ ...matchingPriceFields, 合同名称: '合同B' })
    expect(matchPrice([r], baseCriteria)).toEqual({ unitPrice: null, warning: null })
  })

  it('returns null when branch does not match', () => {
    const r = makePrice({ ...matchingPriceFields, 所属分校: '上海分校' })
    expect(matchPrice([r], baseCriteria)).toEqual({ unitPrice: null, warning: null })
  })
})

describe('calcLinePrintQty', () => {
  it('multiplies order qty by bom qty', () => {
    expect(calcLinePrintQty(100, 2)).toBe(200)
  })
  it('returns orderQty when bomQty is 1', () => {
    expect(calcLinePrintQty(500, 1)).toBe(500)
  })
})

describe('calcLineTotal', () => {
  it('multiplies printQty by unitPrice', () => {
    expect(calcLineTotal(200, 2.5)).toBe(500)
  })
})

describe('calcSavings', () => {
  it('computes savings and rate correctly', () => {
    const r = calcSavings(800, 1000)
    expect(r.savings).toBe(200)
    expect(r.savingsRate).toBeCloseTo(0.2)
  })
  it('returns zeros when compareTotal is 0', () => {
    expect(calcSavings(800, 0)).toEqual({ savings: 0, savingsRate: 0 })
  })
  it('returns zeros when compareTotal is null', () => {
    expect(calcSavings(800, null)).toEqual({ savings: 0, savingsRate: 0 })
  })
})

describe('isBomDuplicate', () => {
  const existing = [{
    fields: {
      所属分校: '北京分校', 产品名称: '教材A', 成品尺寸: 'A4',
      装订要求: '平装', 纸张种类: '轻型纸', 印刷要求: '黑白',
    },
  }]

  it('returns true when all 6 key fields match', () => {
    expect(isBomDuplicate(existing, {
      所属分校: '北京分校', 产品名称: '教材A', 成品尺寸: 'A4',
      装订要求: '平装', 纸张种类: '轻型纸', 印刷要求: '黑白',
    })).toBe(true)
  })

  it('returns false when one key field differs', () => {
    expect(isBomDuplicate(existing, {
      所属分校: '北京分校', 产品名称: '教材A', 成品尺寸: 'A4',
      装订要求: '精装', 纸张种类: '轻型纸', 印刷要求: '黑白',
    })).toBe(false)
  })
})

describe('isContractActive', () => {
  it('returns true when today is within range', () => {
    const c = { fields: { 有效期开始: '2026-01-01', 有效期结束: '2026-12-31' } }
    expect(isContractActive(c, '2026-06-01')).toBe(true)
  })
  it('returns true on boundary dates', () => {
    const c = { fields: { 有效期开始: '2026-06-01', 有效期结束: '2026-06-01' } }
    expect(isContractActive(c, '2026-06-01')).toBe(true)
  })
  it('returns false when today is before start', () => {
    const c = { fields: { 有效期开始: '2026-07-01', 有效期结束: '2026-12-31' } }
    expect(isContractActive(c, '2026-06-01')).toBe(false)
  })
  it('returns false when today is after end', () => {
    const c = { fields: { 有效期开始: '2026-01-01', 有效期结束: '2026-03-01' } }
    expect(isContractActive(c, '2026-04-01')).toBe(false)
  })
})
```

- [ ] **Step 2：运行测试，确认失败**

```bash
cd /Users/zhoulijie/AI探索/印刷平台/app
npx vitest run src/__tests__/utils/price.test.js
```

Expected: FAIL（模块不存在）

- [ ] **Step 3：实现 price.js**

创建 `src/utils/price.js`：

```js
/**
 * 从基础价格表匹配单条明细的价格
 * @param priceRecords - 基础价格表全量记录
 * @param criteria - { contractName, branch, type, size, binding, pageType,
 *                     paperType, paperBrand, printReq, craftReq, quantity }
 * @returns { unitPrice: number|null, warning: string|null }
 */
export function matchPrice(priceRecords, criteria) {
  const candidates = priceRecords.filter((r) => {
    const f = r.fields
    return (
      f['合同名称'] === criteria.contractName &&
      f['所属分校'] === criteria.branch &&
      f['类型'] === criteria.type &&
      f['成品尺寸'] === criteria.size &&
      f['装订要求'] === criteria.binding &&
      f['封面/内页'] === criteria.pageType &&
      f['纸张种类'] === criteria.paperType &&
      f['纸张品牌'] === criteria.paperBrand &&
      f['印刷要求'] === criteria.printReq &&
      f['工艺要求'] === criteria.craftReq &&
      Number(f['数量起']) <= criteria.quantity &&
      Number(f['数量止']) >= criteria.quantity
    )
  })

  if (candidates.length === 0) return { unitPrice: null, warning: null }

  const warning =
    candidates.length > 1 ? '发现多条价格记录，已取第一条' : null
  return { unitPrice: Number(candidates[0].fields['印刷单价']), warning }
}

/** 明细打印数量 = 订单数量 × 单BOM印刷数量 */
export function calcLinePrintQty(orderQty, bomQty) {
  return orderQty * bomQty
}

/** 明细总价 = 打印数量 × 单价 */
export function calcLineTotal(printQty, unitPrice) {
  return printQty * unitPrice
}

/**
 * 计算节约金额和节约率
 * @returns { savings: number, savingsRate: number }
 */
export function calcSavings(mainTotal, compareTotal) {
  if (!compareTotal) return { savings: 0, savingsRate: 0 }
  const savings = compareTotal - mainTotal
  return { savings, savingsRate: savings / compareTotal }
}

/**
 * 检查BOM是否重复（6字段组合键）
 * 去重字段：所属分校、产品名称、成品尺寸、装订要求、纸张种类、印刷要求
 */
export function isBomDuplicate(bomRecords, fields) {
  const key = (f) =>
    [f['所属分校'], f['产品名称'], f['成品尺寸'], f['装订要求'], f['纸张种类'], f['印刷要求']].join('|')
  return bomRecords.some((r) => key(r.fields) === key(fields))
}

/**
 * 判断合同今日是否有效
 * @param contract - Teable record
 * @param today - YYYY-MM-DD 字符串，默认取当前日期
 */
export function isContractActive(contract, today = new Date().toISOString().slice(0, 10)) {
  const { '有效期开始': start, '有效期结束': end } = contract.fields
  return !!start && !!end && start <= today && end >= today
}
```

- [ ] **Step 4：运行测试，确认全部通过**

```bash
npx vitest run src/__tests__/utils/price.test.js
```

Expected: 全部 PASS

- [ ] **Step 5：提交**

```bash
cd /Users/zhoulijie/AI探索/印刷平台/app
git add src/utils/price.js src/__tests__/utils/price.test.js
git commit -m "feat: add price matching and BOM dedup utilities with tests"
```

---

## Task 2：首页看板 Dashboard.jsx

**Files:**
- Create: `src/pages/Dashboard.jsx`
- Create: `src/__tests__/pages/Dashboard.test.jsx`

- [ ] **Step 1：写测试**

创建 `src/__tests__/pages/Dashboard.test.jsx`：

```jsx
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Dashboard from '../../pages/Dashboard.jsx'

vi.mock('../../store/CacheContext.jsx', () => ({
  useCache: () => ({
    getTableData: vi.fn().mockResolvedValue([]),
    invalidate: vi.fn(),
  }),
}))
vi.mock('../../store/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'u1', fields: { 姓名: '测试员', 所属分校: '北京分校' } },
    permissions: {},
  }),
}))

describe('Dashboard', () => {
  it('renders heading and stat cards', () => {
    render(<Dashboard />)
    expect(screen.getByText('首页看板')).toBeInTheDocument()
    expect(screen.getByText('待审核订单')).toBeInTheDocument()
    expect(screen.getByText('本月已审核订单')).toBeInTheDocument()
    expect(screen.getByText('有效合同')).toBeInTheDocument()
    expect(screen.getByText('待确认分发')).toBeInTheDocument()
  })

  it('renders recent orders section', () => {
    render(<Dashboard />)
    expect(screen.getByText('最近10条订单')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run src/__tests__/pages/Dashboard.test.jsx
```

- [ ] **Step 3：实现 Dashboard.jsx**

创建 `src/pages/Dashboard.jsx`：

```jsx
import { useEffect, useState } from 'react'
import { useCache } from '../store/CacheContext.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import { TABLES } from '../api/tables.js'
import Table from '../components/ui/Table.jsx'
import Badge from '../components/ui/Badge.jsx'
import { isContractActive } from '../utils/price.js'

const STATUS_KEY = {
  '待审核': 'pending',
  '已审核': 'approved',
  '已驳回': 'rejected',
}

export default function Dashboard() {
  const { getTableData } = useCache()
  const { user } = useAuth()
  const branch = user?.fields?.['所属分校'] ?? ''

  const [stats, setStats] = useState({ pending: 0, approvedThisMonth: 0, activeContracts: 0, pendingDist: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [orders, contracts, distributions] = await Promise.all([
          getTableData(TABLES.ORDER_MAIN),
          getTableData(TABLES.CONTRACT),
          getTableData(TABLES.DISTRIBUTION),
        ])

        const thisMonth = new Date().toISOString().slice(0, 7)
        const myOrders = branch
          ? orders.filter((o) => o.fields['所属分校'] === branch)
          : orders

        const pending = myOrders.filter((o) => o.fields['订单状态'] === '待审核').length
        const approvedThisMonth = myOrders.filter(
          (o) =>
            o.fields['订单状态'] === '已审核' &&
            (o.fields['提交时间'] || '').startsWith(thisMonth)
        ).length
        const activeContracts = contracts.filter((c) => isContractActive(c)).length
        const myDists = branch
          ? distributions.filter((d) => d.fields['所属分校'] === branch)
          : distributions
        const pendingDist = myDists.filter((d) => d.fields['状态'] === '待确认').length

        setStats({ pending, approvedThisMonth, activeContracts, pendingDist })

        const sorted = [...myOrders]
          .sort((a, b) =>
            (b.fields['提交时间'] || '').localeCompare(a.fields['提交时间'] || '')
          )
          .slice(0, 10)
        setRecentOrders(sorted)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getTableData, branch])

  const statCards = [
    { label: '待审核订单', value: stats.pending },
    { label: '本月已审核订单', value: stats.approvedThisMonth },
    { label: '有效合同', value: stats.activeContracts },
    { label: '待确认分发', value: stats.pendingDist },
  ]

  const columns = [
    { key: '订单编号', title: '订单编号' },
    { key: '产品名称', title: '产品名称' },
    {
      key: '订单状态',
      title: '状态',
      render: (v) => <Badge status={STATUS_KEY[v] ?? 'pending'} />,
    },
    {
      key: '提交时间',
      title: '提交时间',
      render: (v) => (v ? v.slice(0, 10) : '-'),
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-base font-semibold text-gray-900">首页看板</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-100 bg-white p-5">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {loading ? '—' : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-medium text-gray-700">最近10条订单</h2>
        </div>
        <Table
          columns={columns}
          data={recentOrders.map((r) => r.fields)}
          loading={loading}
          emptyText="暂无订单"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4：运行测试，确认通过**

```bash
npx vitest run src/__tests__/pages/Dashboard.test.jsx
```

- [ ] **Step 5：提交**

```bash
git add src/pages/Dashboard.jsx src/__tests__/pages/Dashboard.test.jsx
git commit -m "feat: add Dashboard page with stat cards and recent orders"
```

---

## Task 3：产品BOM管理页 Bom.jsx

**Files:**
- Create: `src/pages/Bom.jsx`
- Create: `src/__tests__/pages/Bom.test.jsx`

- [ ] **Step 1：写测试**

创建 `src/__tests__/pages/Bom.test.jsx`：

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Bom from '../../pages/Bom.jsx'

const mockBoms = [
  { id: 'b1', fields: { 产品名称: '数学教材', 类型: '教材', 成品尺寸: 'A4', 装订要求: '平装', '封面/内页': '内页', 纸张种类: '轻型纸', 印刷要求: '黑白', 单BOM印刷数量: 1, 所属分校: '北京分校' } },
  { id: 'b2', fields: { 产品名称: '英语教材', 类型: '教材', 成品尺寸: 'A5', 装订要求: '精装', '封面/内页': '封面', 纸张种类: '铜版纸', 印刷要求: '彩色', 单BOM印刷数量: 1, 所属分校: '上海分校' } },
]

vi.mock('../../store/CacheContext.jsx', () => ({
  useCache: () => ({ getTableData: vi.fn().mockResolvedValue(mockBoms), invalidate: vi.fn() }),
}))
vi.mock('../../store/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { fields: { 所属分校: '北京分校' } }, permissions: {} }),
}))

describe('Bom', () => {
  it('renders heading', () => {
    render(<Bom />)
    expect(screen.getByText('产品BOM管理')).toBeInTheDocument()
  })

  it('renders search and filter inputs', () => {
    render(<Bom />)
    expect(screen.getByPlaceholderText('搜索产品名称')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run src/__tests__/pages/Bom.test.jsx
```

- [ ] **Step 3：实现 Bom.jsx**

创建 `src/pages/Bom.jsx`：

```jsx
import { useEffect, useState, useMemo } from 'react'
import { useCache } from '../store/CacheContext.jsx'
import { TABLES } from '../api/tables.js'
import Table from '../components/ui/Table.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'

export default function Bom() {
  const { getTableData } = useCache()
  const [boms, setBoms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  useEffect(() => {
    getTableData(TABLES.PRODUCT_BOM)
      .then(setBoms)
      .finally(() => setLoading(false))
  }, [getTableData])

  const branches = useMemo(() => {
    const set = new Set(boms.map((b) => b.fields['所属分校']).filter(Boolean))
    return [...set].sort()
  }, [boms])

  const filtered = useMemo(
    () =>
      boms.filter((b) => {
        const matchSearch = !search || (b.fields['产品名称'] || '').includes(search)
        const matchBranch = !branchFilter || b.fields['所属分校'] === branchFilter
        return matchSearch && matchBranch
      }),
    [boms, search, branchFilter]
  )

  const columns = [
    { key: '产品名称', title: '产品名称' },
    { key: '类型', title: '类型' },
    { key: '成品尺寸', title: '成品尺寸' },
    { key: '装订要求', title: '装订要求' },
    { key: '封面/内页', title: '封面/内页' },
    { key: '纸张种类', title: '纸张种类' },
    { key: '纸张品牌', title: '纸张品牌' },
    { key: '印刷要求', title: '印刷要求' },
    { key: '工艺要求', title: '工艺要求' },
    { key: '单BOM印刷数量', title: '单BOM数量' },
    { key: '所属分校', title: '所属分校' },
  ]

  return (
    <div>
      <h1 className="mb-6 text-base font-semibold text-gray-900">产品BOM管理</h1>

      <div className="mb-4 flex gap-3">
        <Input
          placeholder="搜索产品名称"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select
          placeholder="全部分校"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          options={branches.map((b) => ({ value: b, label: b }))}
          className="w-40"
        />
      </div>

      <div className="rounded-lg border border-gray-100 bg-white">
        <Table
          columns={columns}
          data={filtered.map((r) => r.fields)}
          loading={loading}
          emptyText="暂无BOM数据"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4：运行测试**

```bash
npx vitest run src/__tests__/pages/Bom.test.jsx
```

- [ ] **Step 5：提交**

```bash
git add src/pages/Bom.jsx src/__tests__/pages/Bom.test.jsx
git commit -m "feat: add BOM list page with search and branch filter"
```

---

## Task 4：合同管理页 Contracts.jsx

**Files:**
- Create: `src/pages/Contracts.jsx`

合同管理分两层：
- 上层：合同列表（合同编号、合同名称、有效期、适用分校、是否有效、操作）
- 下层：点击合同行展开，显示该合同从基础价格表筛出的阶梯价格明细

功能：新增/编辑合同、在展开明细处新增/编辑/删除价格行。

- [ ] **Step 1：实现 Contracts.jsx**

创建 `src/pages/Contracts.jsx`：

```jsx
import { useEffect, useState, useMemo } from 'react'
import { useCache } from '../store/CacheContext.jsx'
import { TABLES } from '../api/tables.js'
import { createRecord, updateRecord, deleteRecord } from '../api/teable.js'
import Table from '../components/ui/Table.jsx'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import Input from '../components/ui/Input.jsx'
import Badge from '../components/ui/Badge.jsx'
import { isContractActive } from '../utils/price.js'

const emptyContract = { 合同编号: '', 合同名称: '', 有效期开始: '', 有效期结束: '', 适用分校: '', 备注: '' }
const emptyPrice = { 合同名称: '', 所属分校: '', 类型: '', 成品尺寸: '', 装订要求: '', '封面/内页': '', 纸张种类: '', 纸张品牌: '', 印刷要求: '', 工艺要求: '', 数量起: '', 数量止: '', 印刷单价: '' }

function ContractForm({ form, onChange }) {
  const fields = [
    { key: '合同编号', label: '合同编号 *', placeholder: '如 HT2026001' },
    { key: '合同名称', label: '合同名称 *', placeholder: '如 2026年北京分校合同' },
    { key: '有效期开始', label: '有效期开始 *', placeholder: 'YYYY-MM-DD' },
    { key: '有效期结束', label: '有效期结束 *', placeholder: 'YYYY-MM-DD' },
    { key: '适用分校', label: '适用分校', placeholder: '北京分校,上海分校' },
    { key: '备注', label: '备注', placeholder: '可选' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {fields.map(({ key, label, placeholder }) => (
        <Input
          key={key}
          label={label}
          value={form[key]}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={placeholder}
        />
      ))}
    </div>
  )
}

function PriceForm({ form, onChange }) {
  const fields = [
    { key: '所属分校', label: '所属分校 *' },
    { key: '类型', label: '类型 *', placeholder: '如 教材' },
    { key: '成品尺寸', label: '成品尺寸 *', placeholder: '如 A4' },
    { key: '装订要求', label: '装订要求 *', placeholder: '如 平装' },
    { key: '封面/内页', label: '封面/内页 *', placeholder: '封面 或 内页' },
    { key: '纸张种类', label: '纸张种类 *' },
    { key: '纸张品牌', label: '纸张品牌' },
    { key: '印刷要求', label: '印刷要求 *', placeholder: '如 黑白' },
    { key: '工艺要求', label: '工艺要求', placeholder: '可为空' },
    { key: '数量起', label: '数量起 *', placeholder: '如 100' },
    { key: '数量止', label: '数量止 *', placeholder: '如 999' },
    { key: '印刷单价', label: '印刷单价 *', placeholder: '如 2.50' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(({ key, label, placeholder }) => (
        <Input
          key={key}
          label={label}
          value={form[key]}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={placeholder ?? ''}
        />
      ))}
    </div>
  )
}

export default function Contracts() {
  const { getTableData, invalidate } = useCache()
  const [contracts, setContracts] = useState([])
  const [priceRows, setPriceRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  // Contract modal
  const [contractModal, setContractModal] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [contractForm, setContractForm] = useState(emptyContract)
  const [contractSaving, setContractSaving] = useState(false)

  // Price modal
  const [priceModal, setPriceModal] = useState(false)
  const [editingPrice, setEditingPrice] = useState(null)
  const [priceForm, setPriceForm] = useState(emptyPrice)
  const [priceSaving, setPriceSaving] = useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getTableData(TABLES.CONTRACT), getTableData(TABLES.PRICE_BASE)])
      .then(([c, p]) => { setContracts(c); setPriceRows(p) })
      .finally(() => setLoading(false))
  }, [getTableData])

  // --- Contract handlers ---
  function openAddContract() {
    setEditingContract(null)
    setContractForm(emptyContract)
    setError('')
    setContractModal(true)
  }

  function openEditContract(rec) {
    setEditingContract(rec)
    setContractForm({ ...emptyContract, ...rec.fields })
    setError('')
    setContractModal(true)
  }

  async function saveContract() {
    if (!contractForm['合同编号'] || !contractForm['合同名称'] || !contractForm['有效期开始'] || !contractForm['有效期结束']) {
      setError('合同编号、名称、有效期为必填项')
      return
    }
    setContractSaving(true)
    setError('')
    try {
      if (editingContract) {
        await updateRecord(TABLES.CONTRACT, editingContract.id, contractForm)
      } else {
        await createRecord(TABLES.CONTRACT, contractForm)
      }
      invalidate(TABLES.CONTRACT)
      setContracts(await getTableData(TABLES.CONTRACT, true))
      setContractModal(false)
    } catch {
      setError('保存失败，请重试')
    } finally {
      setContractSaving(false)
    }
  }

  // --- Price handlers ---
  function openAddPrice(contractName, branch) {
    setEditingPrice(null)
    setPriceForm({ ...emptyPrice, 合同名称: contractName, 所属分校: branch })
    setError('')
    setPriceModal(true)
  }

  function openEditPrice(rec) {
    setEditingPrice(rec)
    setPriceForm({ ...emptyPrice, ...rec.fields, 数量起: String(rec.fields['数量起'] ?? ''), 数量止: String(rec.fields['数量止'] ?? ''), 印刷单价: String(rec.fields['印刷单价'] ?? '') })
    setError('')
    setPriceModal(true)
  }

  async function savePrice() {
    setPriceSaving(true)
    setError('')
    try {
      const payload = {
        ...priceForm,
        数量起: Number(priceForm['数量起']),
        数量止: Number(priceForm['数量止']),
        印刷单价: Number(priceForm['印刷单价']),
      }
      if (editingPrice) {
        await updateRecord(TABLES.PRICE_BASE, editingPrice.id, payload)
      } else {
        await createRecord(TABLES.PRICE_BASE, payload)
      }
      invalidate(TABLES.PRICE_BASE)
      setPriceRows(await getTableData(TABLES.PRICE_BASE, true))
      setPriceModal(false)
    } catch {
      setError('保存失败，请重试')
    } finally {
      setPriceSaving(false)
    }
  }

  async function handleDeletePrice(id) {
    if (!window.confirm('确认删除该价格条目？')) return
    try {
      await deleteRecord(TABLES.PRICE_BASE, id)
      invalidate(TABLES.PRICE_BASE)
      setPriceRows(await getTableData(TABLES.PRICE_BASE, true))
    } catch {
      setError('删除失败，请重试')
    }
  }

  // --- Price detail columns ---
  const priceColumns = [
    { key: '所属分校', title: '所属分校' },
    { key: '类型', title: '类型' },
    { key: '成品尺寸', title: '成品尺寸' },
    { key: '装订要求', title: '装订要求' },
    { key: '封面/内页', title: '封面/内页' },
    { key: '纸张种类', title: '纸张种类' },
    { key: '印刷要求', title: '印刷要求' },
    { key: '数量起', title: '数量起' },
    { key: '数量止', title: '数量止' },
    { key: '印刷单价', title: '单价(元)' },
    {
      key: '_actions',
      title: '操作',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEditPrice(row._record)}>编辑</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeletePrice(row._record.id)}>删除</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">合同管理</h1>
        <Button onClick={openAddContract}>新增合同</Button>
      </div>

      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

      <div className="rounded-lg border border-gray-100 bg-white">
        {loading ? (
          <p className="py-12 text-center text-sm text-gray-400">加载中…</p>
        ) : contracts.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">暂无合同</p>
        ) : (
          contracts.map((rec) => {
            const f = rec.fields
            const active = isContractActive(rec)
            const expanded = expandedId === rec.id
            const detail = priceRows.filter((p) => p.fields['合同名称'] === f['合同名称'])

            return (
              <div key={rec.id} className="border-b border-gray-50 last:border-0">
                {/* Contract row */}
                <div
                  className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : rec.id)}
                >
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="w-28 text-xs text-gray-500">{f['合同编号']}</span>
                  <span className="flex-1 text-sm font-medium text-gray-900">{f['合同名称']}</span>
                  <span className="w-52 text-xs text-gray-500">{f['有效期开始']} ~ {f['有效期结束']}</span>
                  <span className="w-32 text-xs text-gray-500">{f['适用分校']}</span>
                  <Badge status={active ? 'active' : 'rejected'} />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => { e.stopPropagation(); openEditContract(rec) }}
                  >
                    编辑
                  </Button>
                </div>

                {/* Expanded price detail */}
                {expanded && (
                  <div className="border-t border-gray-50 bg-gray-50 px-5 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">价格明细（{detail.length} 条）</span>
                      <Button
                        size="sm"
                        onClick={() => openAddPrice(f['合同名称'], f['适用分校'])}
                      >
                        新增价格行
                      </Button>
                    </div>
                    <Table
                      columns={priceColumns}
                      data={detail.map((r) => ({ ...r.fields, _record: r }))}
                      emptyText="该合同暂无价格数据"
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Contract Modal */}
      <Modal
        open={contractModal}
        onClose={() => setContractModal(false)}
        title={editingContract ? '编辑合同' : '新增合同'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setContractModal(false)}>取消</Button>
            <Button loading={contractSaving} onClick={saveContract}>保存</Button>
          </>
        }
      >
        {editingContract && (
          <p className="mb-3 rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
            修改合同名称会影响历史订单的关联关系，建议新建合同替代
          </p>
        )}
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <ContractForm
          form={contractForm}
          onChange={(key, val) => setContractForm((prev) => ({ ...prev, [key]: val }))}
        />
      </Modal>

      {/* Price Modal */}
      <Modal
        open={priceModal}
        onClose={() => setPriceModal(false)}
        title={editingPrice ? '编辑价格行' : '新增价格行'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPriceModal(false)}>取消</Button>
            <Button loading={priceSaving} onClick={savePrice}>保存</Button>
          </>
        }
      >
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <PriceForm
          form={priceForm}
          onChange={(key, val) => setPriceForm((prev) => ({ ...prev, [key]: val }))}
        />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2：运行全量测试，确认不影响已有测试**

```bash
npx vitest run
```

- [ ] **Step 3：提交**

```bash
git add src/pages/Contracts.jsx
git commit -m "feat: add Contracts page with expandable price detail and CRUD"
```

---

## Task 5：创建订单页 CreateOrder.jsx

**Files:**
- Create: `src/pages/CreateOrder.jsx`

**业务规则：**
- 两种模式：「从BOM新建」或「手动填写规格」
- BOM模式：按产品名称搜索BOM表（同分校），选中后自动填充规格字段
- 规格字段：产品名称、类型、成品尺寸、装订要求、封面/内页、纸张种类、纸张品牌、印刷要求、工艺要求、单BOM印刷数量
- 填写印刷数量（整数），选主合同（有效且适用分校匹配），可选对比合同
- 每条BOM明细独立价格匹配：matchPrice(priceRows, { ...bomRow, contractName, branch, quantity: orderQty × bomQty })
- 价格展示：主合同总价、对比合同总价（若选了）、节约金额、节约率
- 提交：写订单主表（状态=待审核）+ 逐条写订单明细表
- 手动模式可勾选「同时保存为BOM」，保存前检查 isBomDuplicate()

- [ ] **Step 1：实现 CreateOrder.jsx**

创建 `src/pages/CreateOrder.jsx`：

```jsx
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCache } from '../store/CacheContext.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import { TABLES } from '../api/tables.js'
import { createRecord } from '../api/teable.js'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import { matchPrice, calcLinePrintQty, calcLineTotal, calcSavings, isBomDuplicate, isContractActive } from '../utils/price.js'
import { generateOrderId } from '../utils/id.js'

const emptySpec = {
  产品名称: '', 类型: '', 成品尺寸: '', 装订要求: '', '封面/内页': '',
  纸张种类: '', 纸张品牌: '', 印刷要求: '', 工艺要求: '', 单BOM印刷数量: '1',
}

/** 从BOM record 提取规格字段 */
function bomToSpec(rec) {
  const f = rec.fields
  return {
    产品名称: f['产品名称'] ?? '',
    类型: f['类型'] ?? '',
    成品尺寸: f['成品尺寸'] ?? '',
    装订要求: f['装订要求'] ?? '',
    '封面/内页': f['封面/内页'] ?? '',
    纸张种类: f['纸张种类'] ?? '',
    纸张品牌: f['纸张品牌'] ?? '',
    印刷要求: f['印刷要求'] ?? '',
    工艺要求: f['工艺要求'] ?? '',
    单BOM印刷数量: String(f['单BOM印刷数量'] ?? '1'),
  }
}

/** 把一组BOM行对应一个合同，计算所有明细及总价 */
function calcPriceForContract(bomRows, contractName, branch, orderQty, priceRows) {
  let total = 0
  const lines = []
  let globalWarning = null

  for (const bom of bomRows) {
    const f = bom.fields ?? bom // 支持 record 或 spec 对象
    const bomQty = Number(f['单BOM印刷数量'] || 1)
    const printQty = calcLinePrintQty(orderQty, bomQty)
    const { unitPrice, warning } = matchPrice(priceRows, {
      contractName,
      branch,
      type: f['类型'],
      size: f['成品尺寸'],
      binding: f['装订要求'],
      pageType: f['封面/内页'],
      paperType: f['纸张种类'],
      paperBrand: f['纸张品牌'] ?? '',
      printReq: f['印刷要求'],
      craftReq: f['工艺要求'] ?? '',
      quantity: printQty,
    })
    if (warning) globalWarning = warning
    if (unitPrice === null) return null // 无法匹配则整体失败
    const lineTotal = calcLineTotal(printQty, unitPrice)
    total += lineTotal
    lines.push({ ...f, 单BOM印刷数量: bomQty, 印刷数量: printQty, 印刷单价: unitPrice, 印刷总价: lineTotal })
  }
  return { total, lines, warning: globalWarning }
}

export default function CreateOrder() {
  const { getTableData, invalidate } = useCache()
  const { user } = useAuth()
  const navigate = useNavigate()
  const branch = user?.fields?.['所属分校'] ?? ''

  const [mode, setMode] = useState('bom') // 'bom' | 'manual'
  const [bomSearch, setBomSearch] = useState('')
  const [allBoms, setAllBoms] = useState([])
  const [selectedBomProduct, setSelectedBomProduct] = useState('') // 产品名称
  const [spec, setSpec] = useState(emptySpec) // 手动模式用
  const [orderQty, setOrderQty] = useState('')
  const [mainContract, setMainContract] = useState('')
  const [compareContract, setCompareContract] = useState('')
  const [contracts, setContracts] = useState([])
  const [priceRows, setPriceRows] = useState([])
  const [saveBom, setSaveBom] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      getTableData(TABLES.PRODUCT_BOM),
      getTableData(TABLES.CONTRACT),
      getTableData(TABLES.PRICE_BASE),
    ]).then(([b, c, p]) => {
      setAllBoms(b)
      setContracts(c)
      setPriceRows(p)
    })
  }, [getTableData])

  // 当前分校且今日有效的合同（主合同候选）
  const validContracts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return contracts.filter((c) => {
      const validBranches = (c.fields['适用分校'] || '').split(',').map((s) => s.trim())
      return isContractActive(c, today) && validBranches.includes(branch)
    })
  }, [contracts, branch])

  // BOM产品名称列表（同分校，去重）
  const bomProducts = useMemo(() => {
    const myBoms = allBoms.filter((b) => !branch || b.fields['所属分校'] === branch)
    const names = [...new Set(myBoms.map((b) => b.fields['产品名称']).filter(Boolean))]
    return names.filter((n) => !bomSearch || n.includes(bomSearch)).slice(0, 20)
  }, [allBoms, branch, bomSearch])

  // BOM模式：选中产品的所有BOM行
  const selectedBomRows = useMemo(() => {
    if (mode !== 'bom' || !selectedBomProduct) return []
    return allBoms.filter(
      (b) => b.fields['产品名称'] === selectedBomProduct && (!branch || b.fields['所属分校'] === branch)
    )
  }, [allBoms, mode, selectedBomProduct, branch])

  // 当前实际的BOM行集合
  const activeBomRows = mode === 'bom' ? selectedBomRows : (spec['产品名称'] ? [{ fields: { ...spec, 单BOM印刷数量: Number(spec['单BOM印刷数量'] || 1) } }] : [])

  // 价格计算
  const qty = parseInt(orderQty, 10)
  const mainResult = mainContract && activeBomRows.length > 0 && qty > 0
    ? calcPriceForContract(activeBomRows, mainContract, branch, qty, priceRows)
    : null
  const compareResult = compareContract && activeBomRows.length > 0 && qty > 0
    ? calcPriceForContract(activeBomRows, compareContract, branch, qty, priceRows)
    : null
  const savings = mainResult && compareResult
    ? calcSavings(mainResult.total, compareResult.total)
    : null

  async function handleSubmit() {
    setError('')
    if (!spec['产品名称'] && mode === 'manual') {
      setError('请填写产品名称')
      return
    }
    if (mode === 'bom' && !selectedBomProduct) {
      setError('请选择BOM产品')
      return
    }
    if (!qty || qty <= 0) {
      setError('请填写有效的印刷数量')
      return
    }
    if (!mainContract) {
      setError('请选择主合同')
      return
    }
    if (!mainResult) {
      setError('当前规格在所选合同中无对应价格，无法提交')
      return
    }

    setSubmitting(true)
    try {
      // 可选：保存为BOM（手动模式）
      if (mode === 'manual' && saveBom) {
        const bomRecords = await getTableData(TABLES.PRODUCT_BOM)
        if (isBomDuplicate(bomRecords, { ...spec, 所属分校: branch })) {
          setError('该规格BOM已存在，未重复写入')
          setSubmitting(false)
          return
        }
        await createRecord(TABLES.PRODUCT_BOM, { ...spec, 所属分校: branch, 单BOM印刷数量: Number(spec['单BOM印刷数量'] || 1) })
        invalidate(TABLES.PRODUCT_BOM)
      }

      const orderId = generateOrderId()
      const now = new Date().toISOString()
      const productName = mode === 'bom' ? selectedBomProduct : spec['产品名称']

      // 写订单主表
      await createRecord(TABLES.ORDER_MAIN, {
        订单编号: orderId,
        合同名称: mainContract,
        所属分校: branch,
        类型: activeBomRows[0]?.fields?.['类型'] ?? '',
        产品名称: productName,
        印刷数量: qty,
        订单状态: '待审核',
        提交时间: now,
        创建时间: now,
        总价: mainResult.total,
        驳回原因: '',
      })

      // 写订单明细表（每条BOM行一条明细）
      for (const line of mainResult.lines) {
        await createRecord(TABLES.ORDER_DETAIL, {
          订单编号: orderId,
          装订要求: line['装订要求'] ?? '',
          '封面/内页': line['封面/内页'] ?? '',
          单BOM印刷数量: line['单BOM印刷数量'],
          印刷数量: line['印刷数量'],
          印刷单价: line['印刷单价'],
          成品尺寸: line['成品尺寸'] ?? '',
          印刷总价: line['印刷总价'],
          纸张种类: line['纸张种类'] ?? '',
          纸张品牌: line['纸张品牌'] ?? '',
          工艺要求: line['工艺要求'] ?? '',
          印刷要求: line['印刷要求'] ?? '',
        })
      }

      invalidate(TABLES.ORDER_MAIN)
      invalidate(TABLES.ORDER_DETAIL)
      setSuccess(true)
    } catch {
      setError('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">订单提交成功，待审核</p>
        <button
          className="mt-4 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
          onClick={() => { setSuccess(false); setMode('bom'); setSelectedBomProduct(''); setSpec(emptySpec); setOrderQty(''); setMainContract(''); setCompareContract('') }}
        >
          继续创建
        </button>
        <button
          className="mt-2 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
          onClick={() => navigate('/orders')}
        >
          查看订单
        </button>
      </div>
    )
  }

  const specFields = [
    { key: '产品名称', label: '产品名称 *' },
    { key: '类型', label: '类型 *', placeholder: '如 教材' },
    { key: '成品尺寸', label: '成品尺寸 *', placeholder: '如 A4' },
    { key: '装订要求', label: '装订要求 *', placeholder: '如 平装' },
    { key: '封面/内页', label: '封面/内页 *', placeholder: '封面 或 内页' },
    { key: '纸张种类', label: '纸张种类 *' },
    { key: '纸张品牌', label: '纸张品牌' },
    { key: '印刷要求', label: '印刷要求 *', placeholder: '如 黑白' },
    { key: '工艺要求', label: '工艺要求', placeholder: '可为空' },
    { key: '单BOM印刷数量', label: '单BOM印刷数量 *', placeholder: '通常为 1' },
  ]

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-base font-semibold text-gray-900">创建订单</h1>

      {/* Mode selector */}
      <div className="mb-6 flex gap-4">
        {[{ value: 'bom', label: '从BOM新建' }, { value: 'manual', label: '手动填写规格' }].map(({ value, label }) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="mode"
              value={value}
              checked={mode === value}
              onChange={() => { setMode(value); setSelectedBomProduct(''); setSpec(emptySpec) }}
              className="accent-gray-900"
            />
            {label}
          </label>
        ))}
      </div>

      {/* BOM mode: product selector */}
      {mode === 'bom' && (
        <div className="mb-6 rounded-lg border border-gray-100 bg-white p-5">
          <Input
            label="搜索产品名称"
            placeholder="输入关键字…"
            value={bomSearch}
            onChange={(e) => setBomSearch(e.target.value)}
            className="mb-3"
          />
          {bomProducts.length > 0 ? (
            <div className="max-h-48 overflow-y-auto rounded border border-gray-100">
              {bomProducts.map((name) => (
                <div
                  key={name}
                  className={`cursor-pointer px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${selectedBomProduct === name ? 'bg-gray-100 font-medium' : ''}`}
                  onClick={() => setSelectedBomProduct(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">暂无BOM数据（或无匹配结果）</p>
          )}
          {selectedBomProduct && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-gray-500">已选产品：{selectedBomProduct}（{selectedBomRows.length} 条BOM明细）</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-100">{['类型','成品尺寸','装订要求','封面/内页','纸张种类','印刷要求','单BOM数量'].map(h => <th key={h} className="px-2 py-1 text-left text-gray-400">{h}</th>)}</tr></thead>
                  <tbody>
                    {selectedBomRows.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {['类型','成品尺寸','装订要求','封面/内页','纸张种类','印刷要求','单BOM印刷数量'].map(k => (
                          <td key={k} className="px-2 py-1 text-gray-700">{r.fields[k]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual mode: spec form */}
      {mode === 'manual' && (
        <div className="mb-6 rounded-lg border border-gray-100 bg-white p-5">
          <div className="grid grid-cols-2 gap-3">
            {specFields.map(({ key, label, placeholder }) => (
              <Input
                key={key}
                label={label}
                value={spec[key]}
                onChange={(e) => setSpec((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder ?? ''}
              />
            ))}
          </div>
        </div>
      )}

      {/* Order qty + contract */}
      <div className="mb-6 rounded-lg border border-gray-100 bg-white p-5">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="印刷数量 *"
            type="number"
            value={orderQty}
            onChange={(e) => setOrderQty(e.target.value)}
            placeholder="输入数量"
          />
          <Select
            label="主合同 *"
            value={mainContract}
            onChange={(e) => setMainContract(e.target.value)}
            options={validContracts.map((c) => ({ value: c.fields['合同名称'], label: c.fields['合同名称'] }))}
            placeholder="选择有效合同"
          />
          <Select
            label="对比合同（可选）"
            value={compareContract}
            onChange={(e) => setCompareContract(e.target.value)}
            options={contracts.map((c) => ({ value: c.fields['合同名称'], label: c.fields['合同名称'] }))}
            placeholder="不对比"
          />
        </div>
      </div>

      {/* Price preview */}
      {mainResult && (
        <div className="mb-6 rounded-lg border border-gray-100 bg-white p-5">
          <h2 className="mb-3 text-xs font-medium text-gray-500">价格预览</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">主合同总价：</span>
              <span className="font-semibold text-gray-900">¥{mainResult.total.toFixed(2)}</span>
              {mainResult.warning && <p className="mt-1 text-xs text-yellow-600">{mainResult.warning}</p>}
            </div>
            {compareResult && (
              <>
                <div>
                  <span className="text-gray-500">对比合同总价：</span>
                  <span className="font-semibold text-gray-900">¥{compareResult.total.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">节约金额：</span>
                  <span className={`font-semibold ${savings.savings >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ¥{savings.savings.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">节约率：</span>
                  <span className={`font-semibold ${savings.savingsRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {(savings.savingsRate * 100).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {mainContract && activeBomRows.length > 0 && qty > 0 && !mainResult && (
        <p className="mb-4 rounded bg-red-50 px-4 py-2 text-xs text-red-600">
          当前规格在所选合同中无对应价格，无法提交
        </p>
      )}

      {/* Save BOM option (manual only) */}
      {mode === 'manual' && (
        <label className="mb-6 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={saveBom}
            onChange={(e) => setSaveBom(e.target.checked)}
            className="accent-gray-900"
          />
          同时保存为BOM
        </label>
      )}

      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

      <Button
        loading={submitting}
        disabled={!mainResult}
        onClick={handleSubmit}
        className="w-full"
      >
        提交订单
      </Button>
    </div>
  )
}
```

- [ ] **Step 2：运行全量测试**

```bash
npx vitest run
```

Expected: 已有测试全部通过（CreateOrder 无专门测试，逻辑在 price.js 中已覆盖）

- [ ] **Step 3：提交**

```bash
git add src/pages/CreateOrder.jsx
git commit -m "feat: add CreateOrder page with BOM selection, price calculation and order submission"
```

---

## Task 6：查询订单页 Orders.jsx

**Files:**
- Create: `src/pages/Orders.jsx`
- Create: `src/__tests__/pages/Orders.test.jsx`

**功能：**
- 状态过滤 tab：全部 / 待审核 / 已审核 / 已驳回
- 分校过滤（同分校用户只看本分校数据）
- 点击订单行展开：显示主表信息 + 订单明细表数据
- 拥有 `approve_orders` 权限的用户看到「通过」「驳回」按钮
- 驳回弹窗填写原因 → PATCH 订单主表

- [ ] **Step 1：写测试**

创建 `src/__tests__/pages/Orders.test.jsx`：

```jsx
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Orders from '../../pages/Orders.jsx'

vi.mock('../../store/CacheContext.jsx', () => ({
  useCache: () => ({ getTableData: vi.fn().mockResolvedValue([]), invalidate: vi.fn() }),
}))
vi.mock('../../store/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'u1', fields: { 姓名: '测试员', 所属分校: '北京分校' } },
    permissions: { orders: true, approve_orders: true },
  }),
}))

describe('Orders', () => {
  it('renders heading and status tabs', () => {
    render(<Orders />)
    expect(screen.getByText('查询订单')).toBeInTheDocument()
    expect(screen.getByText('全部')).toBeInTheDocument()
    expect(screen.getByText('待审核')).toBeInTheDocument()
    expect(screen.getByText('已审核')).toBeInTheDocument()
    expect(screen.getByText('已驳回')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npx vitest run src/__tests__/pages/Orders.test.jsx
```

- [ ] **Step 3：实现 Orders.jsx**

创建 `src/pages/Orders.jsx`：

```jsx
import { useEffect, useState, useMemo } from 'react'
import { useCache } from '../store/CacheContext.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import { TABLES } from '../api/tables.js'
import { updateRecord } from '../api/teable.js'
import Table from '../components/ui/Table.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Modal from '../components/ui/Modal.jsx'
import Input from '../components/ui/Input.jsx'

const STATUS_KEY = {
  '待审核': 'pending',
  '已审核': 'approved',
  '已驳回': 'rejected',
}

const TABS = ['全部', '待审核', '已审核', '已驳回']

export default function Orders() {
  const { getTableData, invalidate } = useCache()
  const { user, permissions } = useAuth()
  const branch = user?.fields?.['所属分校'] ?? ''

  const [orders, setOrders] = useState([])
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('全部')
  const [expandedId, setExpandedId] = useState(null)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectingOrder, setRejectingOrder] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getTableData(TABLES.ORDER_MAIN), getTableData(TABLES.ORDER_DETAIL)])
      .then(([o, d]) => { setOrders(o); setDetails(d) })
      .finally(() => setLoading(false))
  }, [getTableData])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchBranch = !branch || o.fields['所属分校'] === branch
      const matchStatus = activeTab === '全部' || o.fields['订单状态'] === activeTab
      return matchBranch && matchStatus
    }).sort((a, b) =>
      (b.fields['提交时间'] || '').localeCompare(a.fields['提交时间'] || '')
    )
  }, [orders, branch, activeTab])

  async function approve(rec) {
    setActionLoading(true)
    setError('')
    try {
      await updateRecord(TABLES.ORDER_MAIN, rec.id, { 订单状态: '已审核' })
      invalidate(TABLES.ORDER_MAIN)
      setOrders(await getTableData(TABLES.ORDER_MAIN, true))
    } catch {
      setError('操作失败，请重试')
    } finally {
      setActionLoading(false)
    }
  }

  async function submitReject() {
    if (!rejectReason.trim()) {
      setError('请填写驳回原因')
      return
    }
    setActionLoading(true)
    setError('')
    try {
      await updateRecord(TABLES.ORDER_MAIN, rejectingOrder.id, { 订单状态: '已驳回', 驳回原因: rejectReason })
      invalidate(TABLES.ORDER_MAIN)
      setOrders(await getTableData(TABLES.ORDER_MAIN, true))
      setRejectModal(false)
      setRejectReason('')
    } catch {
      setError('操作失败，请重试')
    } finally {
      setActionLoading(false)
    }
  }

  const mainColumns = [
    { key: '订单编号', title: '订单编号' },
    { key: '产品名称', title: '产品名称' },
    { key: '合同名称', title: '合同' },
    { key: '所属分校', title: '所属分校' },
    { key: '印刷数量', title: '数量' },
    { key: '总价', title: '总价', render: (v) => v != null ? `¥${Number(v).toFixed(2)}` : '-' },
    { key: '订单状态', title: '状态', render: (v) => <Badge status={STATUS_KEY[v] ?? 'pending'} /> },
    { key: '提交时间', title: '提交时间', render: (v) => v ? v.slice(0, 10) : '-' },
    {
      key: '_actions',
      title: '操作',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setExpandedId((prev) => prev === row._id ? null : row._id)}
          >
            {expandedId === row._id ? '收起' : '详情'}
          </Button>
          {permissions?.approve_orders && row['订单状态'] === '待审核' && (
            <>
              <Button size="sm" onClick={() => approve(row._record)} loading={actionLoading}>通过</Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => { setRejectingOrder(row._record); setRejectReason(''); setError(''); setRejectModal(true) }}
              >
                驳回
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const detailColumns = [
    { key: '装订要求', title: '装订要求' },
    { key: '封面/内页', title: '封面/内页' },
    { key: '成品尺寸', title: '成品尺寸' },
    { key: '纸张种类', title: '纸张种类' },
    { key: '印刷要求', title: '印刷要求' },
    { key: '单BOM印刷数量', title: '单BOM数量' },
    { key: '印刷数量', title: '印刷数量' },
    { key: '印刷单价', title: '单价' },
    { key: '印刷总价', title: '总价' },
  ]

  return (
    <div>
      <h1 className="mb-6 text-base font-semibold text-gray-900">查询订单</h1>

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

      <div className="rounded-lg border border-gray-100 bg-white">
        {/* Order rows */}
        {loading ? (
          <p className="py-12 text-center text-sm text-gray-400">加载中…</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">暂无订单</p>
        ) : (
          filtered.map((rec) => {
            const f = rec.fields
            const isExpanded = expandedId === rec.id
            const orderDetails = details.filter((d) => d.fields['订单编号'] === f['订单编号'])
            const row = { ...f, _id: rec.id, _record: rec }

            return (
              <div key={rec.id} className="border-b border-gray-50 last:border-0">
                {/* Main row via Table-style columns */}
                <div className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-sm">
                  <span className="w-28 text-xs text-gray-500">{f['订单编号']}</span>
                  <span className="flex-1 text-gray-900">{f['产品名称']}</span>
                  <span className="w-32 text-xs text-gray-500">{f['合同名称']}</span>
                  <span className="w-20 text-xs text-gray-500">{f['所属分校']}</span>
                  <span className="w-16 text-right text-xs text-gray-700">{f['印刷数量']}</span>
                  <span className="w-24 text-right text-xs text-gray-700">
                    {f['总价'] != null ? `¥${Number(f['总价']).toFixed(2)}` : '-'}
                  </span>
                  <span className="w-16"><Badge status={STATUS_KEY[f['订单状态']] ?? 'pending'} /></span>
                  <span className="w-20 text-xs text-gray-500">{f['提交时间'] ? f['提交时间'].slice(0, 10) : '-'}</span>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setExpandedId((prev) => prev === rec.id ? null : rec.id)}
                    >
                      {isExpanded ? '收起' : '详情'}
                    </Button>
                    {permissions?.approve_orders && f['订单状态'] === '待审核' && (
                      <>
                        <Button size="sm" onClick={() => approve(rec)} loading={actionLoading}>通过</Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => { setRejectingOrder(rec); setRejectReason(''); setError(''); setRejectModal(true) }}
                        >
                          驳回
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-50 bg-gray-50 px-5 py-4">
                    {f['驳回原因'] && (
                      <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">
                        驳回原因：{f['驳回原因']}
                      </p>
                    )}
                    <Table
                      columns={detailColumns}
                      data={orderDetails.map((d) => d.fields)}
                      emptyText="暂无明细数据"
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Reject modal */}
      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="驳回订单"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(false)}>取消</Button>
            <Button variant="danger" loading={actionLoading} onClick={submitReject}>确认驳回</Button>
          </>
        }
      >
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <Input
          label="驳回原因 *"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请说明驳回原因"
        />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 4：运行测试**

```bash
npx vitest run src/__tests__/pages/Orders.test.jsx
```

- [ ] **Step 5：提交**

```bash
git add src/pages/Orders.jsx src/__tests__/pages/Orders.test.jsx
git commit -m "feat: add Orders page with status filter, detail expand and approve/reject flow"
```

---

## Task 7：替换 App.jsx 占位组件

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1：修改 App.jsx**

打开 `src/App.jsx`，替换文件为：

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext.jsx'
import { CacheProvider } from './store/CacheContext.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Bom from './pages/Bom.jsx'
import Contracts from './pages/Contracts.jsx'
import CreateOrder from './pages/CreateOrder.jsx'
import Orders from './pages/Orders.jsx'

// Plan 3 占位页面
const Todo = ({ name }) => (
  <p className="text-sm text-gray-400">{name} — 开发中 (Plan 3)</p>
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
                      <Route index element={<Dashboard />} />
                      <Route
                        path="bom"
                        element={
                          <PrivateRoute permKey="bom">
                            <Bom />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="contracts"
                        element={
                          <PrivateRoute permKey="contracts">
                            <Contracts />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="orders/create"
                        element={
                          <PrivateRoute permKey="create_order">
                            <CreateOrder />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="orders"
                        element={
                          <PrivateRoute permKey="orders">
                            <Orders />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="distribution"
                        element={
                          <PrivateRoute permKey="distribution">
                            <Todo name="分发管理" />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="admin/users"
                        element={
                          <PrivateRoute permKey="admin">
                            <Todo name="用户管理" />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="admin/roles"
                        element={
                          <PrivateRoute permKey="admin">
                            <Todo name="角色管理" />
                          </PrivateRoute>
                        }
                      />
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

- [ ] **Step 2：运行全量测试**

```bash
cd /Users/zhoulijie/AI探索/印刷平台/app
npx vitest run
```

Expected: 全部通过

- [ ] **Step 3：提交**

```bash
git add src/App.jsx
git commit -m "feat: wire up business pages in App.jsx routing"
```

---

## Task 8：端到端冒烟验证

**目标：** 手工验证所有新页面在浏览器中正常显示，数据可读取。

- [ ] **Step 1：启动开发服务器**

```bash
cd /Users/zhoulijie/AI探索/印刷平台/app
npm run dev
```

- [ ] **Step 2：登录验证**

访问 `http://localhost:5175`，用 admin / Admin@123 登录，确认跳转到首页看板。

- [ ] **Step 3：各页面冒烟**

| 页面 | 路径 | 验证内容 |
|---|---|---|
| 首页看板 | / | 4 个统计卡显示（可为 0），最近订单表格显示 |
| BOM管理 | /bom | 表格加载，搜索框可输入 |
| 合同管理 | /contracts | 合同列表显示，点击行展开价格明细 |
| 创建订单 | /orders/create | 模式选择器显示，BOM搜索可用 |
| 查询订单 | /orders | Tab切换正常，表格加载 |

- [ ] **Step 4：运行全量测试确认最终通过数**

```bash
npx vitest run
```

记录测试通过数（参考值：Plan 1 结束时为 53 条，Plan 2 预计 ≥ 70 条）。

- [ ] **Step 5：最终提交**

如有任何遗漏修复，在此提交：

```bash
git add -A
git commit -m "fix: plan2 smoke test fixes"
```
