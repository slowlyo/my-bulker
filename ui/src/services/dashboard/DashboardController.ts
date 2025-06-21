import { request } from '@umijs/max';
import { Result_DashboardStats_ } from './typings';

export async function getDashboardStats(options?: { [key: string]: any }) {
    return request<Result_DashboardStats_>('/api/dashboard/stats', {
        method: 'GET',
        ...(options || {}),
    });
} 