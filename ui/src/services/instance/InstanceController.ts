import { request } from '@umijs/max';

/** 获取实例列表 GET /api/v1/instances */
export async function queryInstanceList(
  params: {
    // query
    /** keyword */
    keyword?: string;
    /** current */
    current?: number;
    /** pageSize */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.Result_PageInfo_InstanceInfo__>('/api/v1/instances', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 新增实例 POST /api/v1/instances */
export async function addInstance(
  body?: API.InstanceInfoVO,
  options?: { [key: string]: any },
) {
  return request<API.Result_InstanceInfo_>('/api/v1/instances', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取实例详情 GET /api/v1/instances/${param0} */
export async function getInstanceDetail(
  params: {
    // path
    /** instanceId */
    instanceId?: string;
  },
  options?: { [key: string]: any },
) {
  const { instanceId: param0 } = params;
  return request<API.Result_InstanceInfo_>(`/api/v1/instances/${param0}`, {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
}

/** 更新实例 PUT /api/v1/instances/${param0} */
export async function modifyInstance(
  params: {
    // path
    /** instanceId */
    instanceId?: string;
  },
  body?: API.InstanceInfoVO,
  options?: { [key: string]: any },
) {
  const { instanceId: param0 } = params;
  return request<API.Result_InstanceInfo_>(`/api/v1/instances/${param0}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    params: { ...params },
    data: body,
    ...(options || {}),
  });
}

/** 删除实例 DELETE /api/v1/instances/${param0} */
export async function deleteInstance(
  params: {
    // path
    /** instanceId */
    instanceId?: string;
  },
  options?: { [key: string]: any },
) {
  const { instanceId: param0 } = params;
  return request<API.Result_string_>(`/api/v1/instances/${param0}`, {
    method: 'DELETE',
    params: { ...params },
    ...(options || {}),
  });
} 