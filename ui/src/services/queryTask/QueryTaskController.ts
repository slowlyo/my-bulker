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
        /** 是否仅看常用 */
        is_favorite?: boolean;
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

/** 获取查询任务SQL执行明细 GET /api/query-tasks/${taskId}/sqls/executions */
export async function getQueryTaskSQLExecutions(taskId: number) {
    return request<any>(`/api/query-tasks/${taskId}/sqls/executions`, {
        method: 'GET',
    });
}

/** 开始查询任务 POST /api/query-tasks/${id}/run */
export async function runQueryTask(id: number) {
    return request<any>(`/api/query-tasks/${id}/run`, {
        method: 'POST',
    });
}

/** 查询SQL结果表 GET /api/query-tasks/sqls/${sqlId}/results */
export async function getQueryTaskSQLResult(sqlId: number, params?: { page?: number; page_size?: number; instance_id?: string; database_name?: string }) {
    return request<any>(`/api/query-tasks/sqls/${sqlId}/results`, {
        method: 'GET',
        params,
    });
}

/** 校验SQL合法性 POST /api/sql/validate */
export async function validateSQL(sql: string) {
    return request<any>('/api/sql/validate', {
        method: 'POST',
        data: { sql },
    });
}

/** 批量删除查询任务 DELETE /api/query-tasks */
export async function batchDeleteQueryTasks(
    taskIds: number[],
    options?: { [key: string]: any },
) {
    return request<any>('/api/query-tasks', {
        method: 'DELETE',
        data: { task_ids: taskIds },
        ...(options || {}),
    });
}

/** 切换任务常用状态 POST /api/query-tasks/:id/toggle-favorite */
export async function toggleFavoriteStatus(
    taskId: number,
    options?: { [key: string]: any },
) {
    return request<any>(`/api/query-tasks/${taskId}/toggle-favorite`, {
        method: 'POST',
        ...(options || {}),
    });
} 