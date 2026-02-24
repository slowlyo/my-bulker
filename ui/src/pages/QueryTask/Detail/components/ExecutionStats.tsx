import React from 'react';
import { Progress, Space } from 'antd';
import { DatabaseOutlined, CodeOutlined } from '@ant-design/icons';

interface ExecutionStatsProps {
    stats: {
        db: { total: number; completed: number; failed: number; pending: number };
        sql: { total: number; completed: number; failed: number; pending: number };
    };
}

const ExecutionStats: React.FC<ExecutionStatsProps> = ({ stats }) => {
    const { db, sql } = stats;
    
    const renderStat = (title: string, data: any, icon: React.ReactNode) => {
        const percent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        const isError = data.failed > 0;
        
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f9fafb', padding: '10px 16px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '120px' }}>
                    <span style={{ marginRight: '8px', color: '#1890ff', fontSize: '16px' }}>{icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{title}</span>
                </div>
                
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Progress 
                        percent={percent} 
                        status={isError ? 'exception' : (percent === 100 ? 'success' : 'normal')} 
                        style={{ margin: 0, flex: 1 }} 
                        size="small"
                        strokeWidth={6}
                    />
                    <Space size={12} style={{ fontSize: '12px', flexShrink: 0 }}>
                        <span style={{ color: '#6b7280' }}>共 <span style={{ fontWeight: 500, color: '#374151' }}>{data.total}</span></span>
                        <span style={{ color: '#10b981' }}>✓ {data.completed}</span>
                        {data.failed > 0 && <span style={{ color: '#ef4444' }}>✗ {data.failed}</span>}
                        {data.pending > 0 && <span style={{ color: '#6b7280' }}>待执行 {data.pending}</span>}
                    </Space>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: 16 }}>
            {renderStat('数据库进度', db, <DatabaseOutlined />)}
            {renderStat('SQL语句进度', sql, <CodeOutlined />)}
        </div>
    );
};

export default ExecutionStats; 