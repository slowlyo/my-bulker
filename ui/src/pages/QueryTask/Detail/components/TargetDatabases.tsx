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

    // 按实例分组
    const groupedDatabases = databaseList.reduce((acc, db) => {
        if (!acc[db.instance_name]) {
            acc[db.instance_name] = [];
        }
        acc[db.instance_name].push(db.database_name);
        return acc;
    }, {} as Record<string, string[]>);

    return (
        <Card 
            title={
                <Space>
                    <span>目标数据库</span>
                    <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 'normal' }}>
                        (共 {Object.keys(groupedDatabases).length} 个实例，{databaseList.length} 个数据库)
                    </span>
                </Space>
            } 
            size="small"
            style={{ height: '100%' }}
            styles={{ body: { padding: '12px', maxHeight: '185px', overflowY: 'auto' } }}
        >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {Object.entries(groupedDatabases).map(([instanceName, dbs]) => (
                    <div key={instanceName} style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ 
                            width: '120px', 
                            flexShrink: 0, 
                            display: 'flex', 
                            alignItems: 'center',
                            color: '#1f2937',
                            fontWeight: 500,
                            fontSize: '13px',
                            paddingTop: '2px'
                        }}>
                            <ClusterOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={instanceName}>
                                {instanceName}
                            </span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {dbs.map(dbName => (
                                <Tag key={dbName} style={{ margin: 0, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151' }}>
                                    <DatabaseOutlined style={{ marginRight: '4px', color: '#9ca3af' }} />
                                    {dbName}
                                </Tag>
                            ))}
                        </div>
                    </div>
                ))}
            </Space>
        </Card>
    );
};

export default TargetDatabases; 