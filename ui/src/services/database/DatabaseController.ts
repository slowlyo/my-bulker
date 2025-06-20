import { request } from '@umijs/max';
import { DatabaseInfo, Result_PageInfo_DatabaseInfo__, Result_DatabaseInfo_ } from './typings';

/** 获取数据库列表 GET /api/databases */
export async function queryDatabaseList(
    params: {
        // query
        /** 实例ID */
        instance_id?: number;
        /** 数据库名称 */
        name?: string;
        /** 页码 */
        page?: number;
        /** 每页条数 */
        pageSize?: number;
        /** 排序字段 */
        sort_field?: string;
        /** 排序方向 */
        sort_order?: string;
    },
    options?: { [key: string]: any },
) {
    return request<Result_PageInfo_DatabaseInfo__>('/api/databases', {
        method: 'GET',
        params: {
            ...params,
        },
        ...(options || {}),
    });
}

/** 获取数据库详情 GET /api/databases/${id} */
export async function getDatabaseDetail(id: number) {
    return request<Result_DatabaseInfo_>(`/api/databases/${id}`, {
        method: 'GET',
    });
}

/** 批量获取数据库列表 POST /api/databases/batch-list */
export async function batchQueryDatabaseList(instance_ids: number[]) {
    return request<any>('/api/databases/batch-list', {
        method: 'POST',
        data: { instance_ids },
    });
} 