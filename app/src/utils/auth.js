import bcrypt from 'bcryptjs'

const COST_FACTOR = 10

const DEFAULT_PERMISSIONS = {
  bom: false,
  bom_delete: false,
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
