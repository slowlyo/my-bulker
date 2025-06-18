export interface PageInfo_QueryTaskInfo_ {
    total: number;
    items: Array<QueryTaskInfo>;
}

export interface Result_PageInfo_QueryTaskInfo__ {
    code: number;
    message: string;
    data: PageInfo_QueryTaskInfo_;
}

export interface Result_QueryTaskInfo_ {
    code: number;
    message: string;
    data: QueryTaskInfo;
}

export interface QueryTaskInfo {
    id: number;
    created_at: string;
    updated_at: string;
    task_name: string;
    databases: string;
    status: number;
    total_dbs: number;
    completed_dbs: number;
    failed_dbs: number;
    total_sqls: number;
    completed_sqls: number;
    failed_sqls: number;
    started_at?: string;
    completed_at?: string;
    description: string;
}

// 创建查询任务相关类型
export interface TaskDatabase {
    instance_id: number;
    database_name: string;
}

export interface TableField {
    name: string;
    type: string;
    comment: string;
}

export interface TableSchema {
    fields: TableField[];
}

export interface CreateQueryTaskRequest {
    task_name: string;
    description?: string;
    instance_ids: number[];
    database_mode: 'include' | 'exclude';
    selected_dbs: TaskDatabase[];
    sql_content: string;
}

// SQL语句相关类型
export interface QueryTaskSQLInfo {
    id: number;
    created_at: string;
    updated_at: string;
    task_id: number;
    sql_content: string;
    sql_order: number;
    result_table_name: string;
    result_table_schema: string;
    total_dbs: number;
    completed_dbs: number;
    failed_dbs: number;
    started_at?: string;
    completed_at?: string;
}

export interface PageInfo_QueryTaskSQLInfo_ {
    total: number;
    items: Array<QueryTaskSQLInfo>;
}

export interface Result_PageInfo_QueryTaskSQLInfo__ {
    code: number;
    message: string;
    data: PageInfo_QueryTaskSQLInfo_;
} 