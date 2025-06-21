import { request } from '@umijs/max';
import { InstanceInfo, InstanceInfoVO, Result_InstanceInfo_, Result_PageInfo_InstanceInfo__, Result_string_, APIResponse } from './typings';

/** 获取实例列表 GET /api/instances */
export async function queryInstanceList(
  params: {
    // query
    /** keyword */
    keyword?: string;
    /** page */
    page?: number;
    /** pageSize */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<Result_PageInfo_InstanceInfo__>('/api/instances', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 新增实例 POST /api/instances */
export async function addInstance(
  body?: InstanceInfoVO,
  options?: { [key: string]: any },
) {
  return request<Result_InstanceInfo_>('/api/instances', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取实例详情 GET /api/instances/${param0} */
export async function getInstanceDetail(
  params: {
    // path
    /** instanceId */
    instanceId?: string;
  },
  options?: { [key: string]: any },
) {
  const { instanceId: param0 } = params;
  return request<Result_InstanceInfo_>(`/api/instances/${param0}`, {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
}

/** 更新实例 PUT /api/instances/${param0} */
export async function modifyInstance(
  params: {
    // path
    /** instanceId */
    instanceId?: string;
  },
  body?: InstanceInfoVO,
  options?: { [key: string]: any },
) {
  const { instanceId: param0 } = params;
  return request<Result_InstanceInfo_>(`/api/instances/${param0}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    params: { ...params },
    data: body,
    ...(options || {}),
  });
}

/** 删除实例 DELETE /api/instances/${param0} */
export async function deleteInstance(
  params: {
    // path
    /** instanceId */
    instanceId?: string;
  },
  options?: { [key: string]: any },
) {
  const { instanceId: param0 } = params;
  return request<Result_string_>(`/api/instances/${param0}`, {
    method: 'DELETE',
    params: { ...params },
    ...(options || {}),
  });
}

/** 测试数据库连接 POST /api/instances/test-connection */
export async function testConnection(
  body?: {
    host: string;
    port: number;
    username: string;
    password?: string;
    params?: Array<Record<string, string>>;
  },
  options?: { [key: string]: any },
) {
  return request<Result_string_>('/api/instances/test-connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 同步数据库 POST /api/instances/sync-databases */
export async function syncDatabases(
  body?: {
    instance_ids: number[];
  },
  options?: { [key: string]: any },
) {
  return request<Result_string_>('/api/instances/sync-databases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

export interface InstanceOption {
    value: number;
    label: string;
}

export async function getInstanceOptions() {
    return request<APIResponse<InstanceOption[]>>('/api/instances/options', {
        method: 'GET',
    });
} 