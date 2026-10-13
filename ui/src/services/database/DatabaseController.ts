import { request } from '@umijs/max';

/** 批量获取数据库列表 POST /api/databases/batch-list */
export async function batchQueryDatabaseList(instance_ids: number[]) {
    return request<any>('/api/databases/batch-list', {
        method: 'POST',
        data: { instance_ids },
    });
} 