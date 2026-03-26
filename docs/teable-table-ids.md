# Teable 表 ID 记录

Base ID: `bseMiLxmWtt0BQcngwy`
Base 名称: 印刷管理平台
创建时间: 2026-03-25

---

## 已有表（Task 0 之前）

| 表名 | 表 ID |
|------|-------|
| 基础价格表 | `tbli44QpvUROZMulyEd` |
| 产品BOM表 | `tblyl9Gu8RsxCLUC1fC` |
| 订单主表 | `tblxenIxdZZcL7Xsp8N` |
| 订单明细表 | `tbl2Q4u30171Uxhtcvv` |

---

## Task 0 新增表（2026-03-25）

| 表名 | 表 ID |
|------|-------|
| 合同表 | `tblKGsHCOg6pasS3rrk` |
| 用户表 | `tblCKS7ekfnQKwZQuYj` |
| 角色表 | `tblYkIVOC6VHIG7TzAW` |
| 校区表 | `tbl2hrn4QMj9ukc3RqS` |
| 分发表 | `tbl22e6BFp7MouFUU3T` |

---

## 订单主表新增字段（Task 0 Step 6）

| 字段名 | 字段 ID | 表 |
|--------|---------|-----|
| 驳回原因 | `fldJDQmXOFhkh83QqKe` | 订单主表 (`tblxenIxdZZcL7Xsp8N`) |

---

## 种子数据（Task 0 Step 7）

### 角色表 (`tblYkIVOC6VHIG7TzAW`)

| 角色ID | 角色名称 | 权限配置 |
|--------|---------|---------|
| admin | 超级管理员 | all |
| branch_admin | 分校管理员 | branch:manage,order:approve,user:manage |
| campus_user | 校区用户 | order:create,order:view |

### 用户表 (`tblCKS7ekfnQKwZQuYj`)

| 用户名 | 姓名 | 角色ID | 状态 | 密码 |
|--------|------|--------|------|------|
| admin | 超级管理员 | admin | active | Admin@123 |
