export interface RecentTask {
    id: number;
    task_name: string;
    status: number;
    created_at: string;
}

export interface TaskSummary {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
}

export interface DashboardStats {
    total_instances: number;
    task_summary: TaskSummary;
    recent_tasks: RecentTask[];
    favorite_tasks: RecentTask[];
}

export interface Result_DashboardStats_ {
    code: number;
    message: string;
    data: DashboardStats;
} 