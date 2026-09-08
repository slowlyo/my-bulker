import React from 'react';
import { Card, Tag, Tooltip } from 'antd';
import { QueryTaskInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';
import { ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface QueryTaskBaseInfoProps {
    task: QueryTaskInfo;
    status: { text: string; color: string };
}

/**
 * 计算任务执行总耗时，格式化为易读的毫秒/秒/分钟。
 * @param start 开始时间
 * @param end 结束时间
 * @returns 耗时文本
 */
const calculateDuration = (start?: string | null, end?: string | null): string => {
    // 未开始执行时无耗时数据
    if (!start) {
        return '-';
    }
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffMs = endTime - startTime;

    // 时间戳异常兜底
    if (diffMs < 0) {
        return '-';
    }
    // 小于 1 秒以毫秒输出
    if (diffMs < 1000) {
        return `${diffMs}ms`;
    }
    const totalSeconds = (diffMs / 1000).toFixed(1);
    // 小于 1 分钟以秒输出
    if (Number(totalSeconds) < 60) {
        return `${totalSeconds}s`;
    }
    const minutes = Math.floor(Number(totalSeconds) / 60);
    const remainSec = (Number(totalSeconds) % 60).toFixed(0);
    return `${minutes}分 ${remainSec}秒`;
};

/**
 * 任务详情基本信息卡片，网格化对齐展示任务元数据、状态、执行各阶段时间戳与总耗时。
 * @param props 组件属性
 */
const QueryTaskBaseInfo: React.FC<QueryTaskBaseInfoProps> = ({ task, status }) => {
    const durationText = calculateDuration(task.started_at, task.completed_at);

    return (
        <Card
            size="small"
            styles={{ body: { padding: '16px 20px' } }}
            className="border border-slate-200 rounded-lg shadow-2xs mb-4"
        >
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">任务基本信息</span>
                    <Tag color={status.color} className="m-0 border-none font-medium px-2 py-0.5 text-xs">
                        {status.text}
                    </Tag>
                </div>
                {task.started_at && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono">
                        <ClockCircleOutlined className="text-neutral-400" />
                        <span>执行耗时: <strong className="text-neutral-800 font-semibold">{durationText}</strong></span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-neutral-400">任务名称</span>
                    <span className="text-sm font-medium text-neutral-800 truncate" title={task.task_name}>
                        {task.task_name}
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-xs text-neutral-400">任务描述</span>
                    <span className="text-sm text-neutral-700 truncate" title={task.description || '-'}>
                        {task.description || '-'}
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-xs text-neutral-400">创建时间</span>
                    <span className="text-sm text-neutral-700 font-mono">
                        {formatDateTime(task.created_at)}
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-xs text-neutral-400">开始时间</span>
                    <span className="text-sm text-neutral-700 font-mono">
                        {task.started_at ? formatDateTime(task.started_at) : '-'}
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-xs text-neutral-400">完成时间</span>
                    <span className="text-sm text-neutral-700 font-mono">
                        {task.completed_at ? formatDateTime(task.completed_at) : '-'}
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-xs text-neutral-400">总耗时</span>
                    <span className="text-sm font-semibold text-neutral-800 font-mono">
                        {durationText}
                    </span>
                </div>
            </div>
        </Card>
    );
};

export default QueryTaskBaseInfo; 