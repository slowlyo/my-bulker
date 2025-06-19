import React from 'react';
import { Card, Descriptions, Tag } from 'antd';
import { QueryTaskInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';

interface QueryTaskBaseInfoProps {
    task: QueryTaskInfo;
    status: { text: string; color: string };
}

const QueryTaskBaseInfo: React.FC<QueryTaskBaseInfoProps> = ({ task, status }) => (
    <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
            <Descriptions.Item label="任务名称">
                <strong>{task.task_name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="任务状态">
                <Tag color={status.color}>{status.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="任务描述" span={2}>
                {task.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
                {formatDateTime(task.created_at)}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
                {formatDateTime(task.updated_at)}
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
                {formatDateTime(task.started_at)}
            </Descriptions.Item>
            <Descriptions.Item label="完成时间">
                {formatDateTime(task.completed_at)}
            </Descriptions.Item>
        </Descriptions>
    </Card>
);

export default QueryTaskBaseInfo; 