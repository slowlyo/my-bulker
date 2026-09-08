import React from 'react';
import { DatabaseOutlined, CodeOutlined } from '@ant-design/icons';

interface ExecutionStatsProps {
    stats: {
        db: { total: number; completed: number; failed: number; pending: number };
        sql: { total: number; completed: number; failed: number; pending: number };
    };
}

/**
 * 任务执行指标统计面板，分别展示数据库与 SQL 维度的覆盖总数、完成进度与失败率。
 * @param props 组件属性
 */
const ExecutionStats: React.FC<ExecutionStatsProps> = ({ stats }) => {
    const { db, sql } = stats;

    /**
     * 渲染单个指标统计卡片（数据库或 SQL）。
     * @param title 指标标题
     * @param data 统计数据对象
     * @param icon 前缀图标
     */
    const renderStat = (title: string, data: any, icon: React.ReactNode) => {
        const percent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        const hasFailure = data.failed > 0;
        const allDone = data.pending === 0;

        return (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between gap-3">
                {/* 顶部标题与完成率 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm">{icon}</span>
                        <span className="text-sm font-semibold text-slate-800">{title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-medium">完成率</span>
                        <span className={`text-sm font-bold font-mono ${hasFailure ? 'text-rose-600' : allDone ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {percent}%
                        </span>
                    </div>
                </div>

                {/* 分段进度条 */}
                <div className="w-full flex h-2 rounded-full overflow-hidden bg-slate-100">
                    {/* 成功执行分段 */}
                    <div
                        style={{ flex: data.completed }}
                        className={`${allDone && !hasFailure ? 'bg-emerald-500' : 'bg-slate-900'} transition-all`}
                    />
                    {/* 异常失败分段 */}
                    {hasFailure && (
                        <div
                            style={{ flex: data.failed }}
                            className="bg-rose-500 transition-all"
                        />
                    )}
                    {/* 等待调度分段 */}
                    {data.pending > 0 && (
                        <div
                            style={{ flex: data.pending }}
                            className="bg-slate-200"
                        />
                    )}
                </div>

                {/* 底部明细数量统计 */}
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
                    <div>
                        <span className="text-neutral-400 block scale-90 origin-left">总计</span>
                        <span className="font-semibold text-neutral-800 font-mono">{data.total}</span>
                    </div>
                    <div>
                        <span className="text-neutral-400 block scale-90 origin-left">成功</span>
                        <span className="font-semibold text-emerald-600 font-mono">{data.completed}</span>
                    </div>
                    <div>
                        <span className="text-neutral-400 block scale-90 origin-left">失败</span>
                        <span className={`font-semibold font-mono ${hasFailure ? 'text-rose-600' : 'text-neutral-400'}`}>
                            {data.failed}
                        </span>
                    </div>
                    <div>
                        <span className="text-neutral-400 block scale-90 origin-left">待执行</span>
                        <span className="font-semibold text-neutral-500 font-mono">{data.pending}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {renderStat('数据库执行进度', db, <DatabaseOutlined />)}
            {renderStat('SQL 执行进度', sql, <CodeOutlined />)}
        </div>
    );
};

export default ExecutionStats; 