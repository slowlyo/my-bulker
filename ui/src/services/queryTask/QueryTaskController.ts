import { request } from '@umijs/max';
import type { QueryTaskInfo, Result_PageInfo_QueryTaskInfo__, CreateQueryTaskRequest, Result_QueryTaskInfo_, Result_PageInfo_QueryTaskSQLInfo__ } from './typings.d';

/** 获取查询任务列表 GET /api/query-tasks */
export async function queryQueryTaskList(
    params: {
        // query
        /** 任务名称 */
        task_name?: string;
        /** 任务状态 */
        status?: number;
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
    return request<Result_PageInfo_QueryTaskInfo__>('/api/query-tasks', {
        method: 'GET',
        params: {
            ...params,
        },
        ...(options || {}),
    });
}

/** 创建查询任务 POST /api/query-tasks */
export async function createQueryTask(
    data: CreateQueryTaskRequest,
    options?: { [key: string]: any },
) {
    return request<Result_QueryTaskInfo_>('/api/query-tasks', {
        method: 'POST',
        data,
        ...(options || {}),
    });
}

/** 获取查询任务详情 GET /api/query-tasks/${id} */
export async function getQueryTaskDetail(id: number) {
    return request<Result_QueryTaskInfo_>(`/api/query-tasks/${id}`, {
        method: 'GET',
    });
}

/** 获取查询任务SQL语句列表 GET /api/query-tasks/${taskId}/sqls */
export async function getQueryTaskSQLs(taskId: number) {
    return request<Result_PageInfo_QueryTaskSQLInfo__>(`/api/query-tasks/${taskId}/sqls`, {
        method: 'GET',
    });
} 