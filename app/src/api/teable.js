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
    const records = data.records ?? []
    allRecords.push(...records)

    // 终止条件：
    // 1. 返回记录数少于 take（已到最后一页）
    // 2. total 有效且已全部拉取
    // 3. 没有更多记录
    if (records.length < take) break
    if (data.total != null && allRecords.length >= data.total) break
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
