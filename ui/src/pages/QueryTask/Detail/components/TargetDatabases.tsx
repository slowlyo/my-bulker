import React from 'react';
import { Card, Tag, Space } from 'antd';
import { DatabaseOutlined, ClusterOutlined } from '@ant-design/icons';

interface TaskDatabase {
    instance_id: number;
    database_name: string;
    instance_name: string;
}

interface TargetDatabasesProps {
    databases: string; // JSON字符串格式的数据库列表
}

const TargetDatabases: React.FC<TargetDatabasesProps> = ({ databases }) => {
    // 解析数据库JSON字符串
    const parseDatabases = (): TaskDatabase[] => {
        try {
            return JSON.parse(databases);
        } catch (error) {
            console.error('解析数据库数据失败:', error);
            return [];
        }
    };

    const databaseList = parseDatabases();

    if (databaseList.length === 0) {
        return (
            <Card title="目标数据库">
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    暂无目标数据库
                </div>
            </Card>
        );
    }

    return (
        <Card title="目标数据库" style={{ marginBottom: 16 }}>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '8px',
                maxHeight: '400px',
                overflow: 'auto',
                paddingRight: '4px'
            }}>
                {databaseList.map((db, index) => (
                    <div
                        key={`${db.instance_id}-${db.database_name}-${index}`}
                        style={{
                            border: '1px solid #e8e8e8',
                            borderRadius: '8px',
                            padding: '8px',
                            background: '#fff',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
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
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                            <DatabaseOutlined style={{ color: '#1890ff', marginRight: '6px', fontSize: '15px' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#262626' }}>
                                    {db.database_name}
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <ClusterOutlined style={{ color: '#666', marginRight: '4px', fontSize: '11px' }} />
                            <span style={{ fontSize: '11px', color: '#666' }}>
                                {db.instance_name}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            
            <div style={{ 
                marginTop: '16px', 
                padding: '8px',
                background: '#f8f9fa', 
                borderRadius: '8px',
                fontSize: '11px',
                color: '#666'
            }}>
                <Space>
                    <span>总计: {databaseList.length} 个数据库</span>
                    <span>•</span>
                    <span>涉及 {new Set(databaseList.map(db => db.instance_id)).size} 个实例</span>
                </Space>
            </div>
        </Card>
    );
};

export default TargetDatabases; 