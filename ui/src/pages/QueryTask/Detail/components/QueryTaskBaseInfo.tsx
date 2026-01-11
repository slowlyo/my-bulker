import React from 'react';
import { Card, Descriptions, Tag, Row, Col } from 'antd';
import { QueryTaskInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';

interface QueryTaskBaseInfoProps {
    task: QueryTaskInfo;
    status: { text: string; color: string };
}

const QueryTaskBaseInfo: React.FC<QueryTaskBaseInfoProps> = ({ task, status }) => (
    <Card title="基本信息" style={{ height: '100%' }}>
        <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="任务名称">
                <strong>{task.task_name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="任务状态">
                <Tag color={status.color}>{status.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="任务描述">
                {task.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="时间进度">
                <div style={{ fontSize: '12px' }}>
                    <div>创建: {formatDateTime(task.created_at)}</div>
                    {task.started_at && <div>开始: {formatDateTime(task.started_at)}</div>}
                    {task.completed_at && <div>完成: {formatDateTime(task.completed_at)}</div>}
                </div>
            </Descriptions.Item>
        </Descriptions>
    </Card>
);

export default QueryTaskBaseInfo; 