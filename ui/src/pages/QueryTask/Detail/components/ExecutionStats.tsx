import React from 'react';
import { Card } from 'antd';

interface ExecutionStatsProps {
    stats: {
        db: { total: number; completed: number; failed: number; pending: number };
        sql: { total: number; completed: number; failed: number; pending: number };
    };
}

const ExecutionStats: React.FC<ExecutionStatsProps> = ({ stats }) => {
    const { db, sql } = stats;
    return (
        <Card title="执行统计" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* 数据库统计 */}
                <div style={{ 
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1890ff';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                    e.currentTarget.style.boxShadow = 'none';
                }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ 
                            fontSize: '16px', 
                            marginRight: '8px',
                            color: '#1890ff'
                        }}>🗄️</span>
                        <div>
                            <div style={{ fontSize: '12px', color: '#666' }}>数据库</div>
                            <div style={{ fontSize: '20px', fontWeight: '500', color: '#262626' }}>{db.total}</div>
                        </div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#666' }}>进度</span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                {db.total > 0 ? Math.round((db.completed / db.total) * 100) : 0}%
                            </span>
                        </div>
                        <div style={{ 
                            width: '100%', 
                            height: '4px', 
                            background: '#f0f0f0', 
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}>
                            <div style={{ 
                                width: `${db.total > 0 ? (db.completed / db.total) * 100 : 0}%`,
                                height: '100%',
                                background: '#52c41a',
                                borderRadius: '2px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#52c41a', fontWeight: '500' }}>{db.completed}</div>
                            <div style={{ color: '#666' }}>已完成</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#ff4d4f', fontWeight: '500' }}>{db.failed}</div>
                            <div style={{ color: '#666' }}>失败</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#666', fontWeight: '500' }}>{db.pending}</div>
                            <div style={{ color: '#666' }}>待执行</div>
                        </div>
                    </div>
                </div>

                {/* SQL统计 */}
                <div style={{ 
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1890ff';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                    e.currentTarget.style.boxShadow = 'none';
                }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ 
                            fontSize: '16px', 
                            marginRight: '8px',
                            color: '#1890ff'
                        }}>⚡</span>
                        <div>
                            <div style={{ fontSize: '12px', color: '#666' }}>SQL语句</div>
                            <div style={{ fontSize: '20px', fontWeight: '500', color: '#262626' }}>{sql.total}</div>
                        </div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#666' }}>进度</span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                {sql.total > 0 ? Math.round((sql.completed / sql.total) * 100) : 0}%
                            </span>
                        </div>
                        <div style={{ 
                            width: '100%', 
                            height: '4px', 
                            background: '#f0f0f0', 
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}>
                            <div style={{ 
                                width: `${sql.total > 0 ? (sql.completed / sql.total) * 100 : 0}%`,
                                height: '100%',
                                background: '#52c41a',
                                borderRadius: '2px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#52c41a', fontWeight: '500' }}>{sql.completed}</div>
                            <div style={{ color: '#666' }}>已完成</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#ff4d4f', fontWeight: '500' }}>{sql.failed}</div>
                            <div style={{ color: '#666' }}>失败</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#666', fontWeight: '500' }}>{sql.pending}</div>
                            <div style={{ color: '#666' }}>待执行</div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default ExecutionStats; 