import React from 'react';
import { Space } from 'antd';
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
        const hasFailure = data.failed > 0;
        const allDone = data.pending === 0;
        // 全部成功才算 success；部分失败但大部分完成用 normal；全部失败或失败占多数用 exception
        let status: 'success' | 'exception' | 'normal' = 'normal';
        if (!hasFailure && allDone) {
            status = 'success';
        } else if (hasFailure && data.failed >= data.completed) {
            status = 'exception';
        }

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f9fafb', padding: '10px 16px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '120px' }}>
                    <span style={{ marginRight: '8px', color: '#1890ff', fontSize: '16px' }}>{icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{title}</span>
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {/* 成功部分 */}
                        <div style={{
                            flex: data.completed,
                            height: 6,
                            borderRadius: '3px 0 0 3px',
                            background: allDone && !hasFailure ? '#52c41a' : '#1890ff',
                            borderTopRightRadius: hasFailure ? 0 : 3,
                            borderBottomRightRadius: hasFailure ? 0 : 3,
                        }} />
                        {/* 失败部分 */}
                        {hasFailure && (
                            <div style={{
                                flex: data.failed,
                                height: 6,
                                background: '#ff4d4f',
                                borderRadius: data.completed === 0 ? '3px' : '0 3px 3px 0',
                            }} />
                        )}
                        {/* 未执行部分 */}
                        {data.pending > 0 && (
                            <div style={{
                                flex: data.pending,
                                height: 6,
                                background: '#e5e7eb',
                                borderRadius: (data.completed === 0 && !hasFailure) ? '3px' : '0 3px 3px 0',
                            }} />
                        )}
                    </div>
                    <Space size={12} style={{ fontSize: '12px', flexShrink: 0 }}>
                        <span style={{ color: '#6b7280' }}>共 <span style={{ fontWeight: 500, color: '#374151' }}>{data.total}</span></span>
                        <span style={{ color: allDone && !hasFailure ? '#10b981' : '#1890ff' }}>✓ {data.completed}</span>
                        {hasFailure && <span style={{ color: '#ef4444' }}>✗ {data.failed}</span>}
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