import React from 'react';
import { Card, Descriptions, Tag, Row, Col } from 'antd';
import { QueryTaskInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';

interface QueryTaskBaseInfoProps {
    task: QueryTaskInfo;
    status: { text: string; color: string };
}

const QueryTaskBaseInfo: React.FC<QueryTaskBaseInfoProps> = ({ task, status }) => (
    <Card size="small" styles={{ body: { padding: '16px 20px' } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 4, height: 16, background: '#1890ff', borderRadius: 2, marginRight: 8 }} />
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#1f2937' }}>基本信息</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>任务名称</span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>{task.task_name}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>状态</span>
                <span><Tag color={status.color} style={{ margin: 0, border: 'none', padding: '0 8px' }}>{status.text}</Tag></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>描述</span>
                <span style={{ fontSize: '14px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }} title={task.description}>
                    {task.description || '-'}
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>创建时间</span>
                <span style={{ fontSize: '14px', color: '#374151' }}>{formatDateTime(task.created_at)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>开始时间</span>
                <span style={{ fontSize: '14px', color: '#374151' }}>{task.started_at ? formatDateTime(task.started_at) : '-'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>完成时间</span>
                <span style={{ fontSize: '14px', color: '#374151' }}>{task.completed_at ? formatDateTime(task.completed_at) : '-'}</span>
            </div>
        </div>
    </Card>
);

export default QueryTaskBaseInfo; 