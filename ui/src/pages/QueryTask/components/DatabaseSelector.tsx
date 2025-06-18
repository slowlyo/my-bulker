import React, { useState, useEffect } from 'react';
import { Select, Spin, Empty, Space, Button } from 'antd';
import { queryDatabaseList } from '@/services/database/DatabaseController';
import { TaskDatabase } from '@/services/queryTask/typings';

interface DatabaseSelectorProps {
    instanceIds: number[];
    disabled?: boolean;
    value?: TaskDatabase[];
    onChange?: (value: TaskDatabase[]) => void;
}

const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
    instanceIds,
    disabled = false,
    value = [],
    onChange,
}) => {
    const [databases, setDatabases] = useState<Array<{
        id: number;
        name: string;
        instance_id: number;
        instance?: { name: string };
    }>>([]);
    const [loading, setLoading] = useState(false);

    // 加载数据库数据
    useEffect(() => {
        if (instanceIds.length === 0) {
            setDatabases([]);
            return;
        }

        const loadDatabases = async () => {
            setLoading(true);
            try {
                // 为每个实例ID分别获取数据库列表
                const allDatabases: Array<{
                    id: number;
                    name: string;
                    instance_id: number;
                    instance?: { name: string };
                }> = [];
                
                for (const instanceId of instanceIds) {
                    const res = await queryDatabaseList({
                        instance_id: instanceId,
                        page: 1,
                        pageSize: 1000, // 获取所有数据库
                    });
                    
                    if (res.code === 200 && res.data) {
                        allDatabases.push(...(res.data.items || []));
                    }
                }
                
                setDatabases(allDatabases);
            } catch (error) {
                console.error('加载数据库数据失败:', error);
            } finally {
                setLoading(false);
            }
        };

        loadDatabases();
    }, [instanceIds]);

    const handleChange = (selectedValues: string[]) => {
        const selectedDBs: TaskDatabase[] = selectedValues.map(val => {
            const [instanceId, databaseName] = val.split('|');
            return {
                instance_id: parseInt(instanceId),
                database_name: databaseName,
            };
        });
        
        if (onChange) {
            onChange(selectedDBs);
        }
    };

    const formatValue = (selectedDBs: TaskDatabase[]): string[] => {
        return selectedDBs.map(db => `${db.instance_id}|${db.database_name}`);
    };

    // 全选功能
    const handleSelectAll = () => {
        const allDBs: TaskDatabase[] = databases.map(db => ({
            instance_id: db.instance_id,
            database_name: db.name,
        }));
        
        if (onChange) {
            onChange(allDBs);
        }
    };

    // 反选功能
    const handleInvertSelection = () => {
        const currentSelected = new Set(formatValue(value));
        const allOptions = databases.map(db => `${db.instance_id}|${db.name}`);
        
        const invertedSelection = allOptions.filter(option => !currentSelected.has(option));
        
        const invertedDBs: TaskDatabase[] = invertedSelection.map(val => {
            const [instanceId, databaseName] = val.split('|');
            return {
                instance_id: parseInt(instanceId),
                database_name: databaseName,
            };
        });
        
        if (onChange) {
            onChange(invertedDBs);
        }
    };

    // 构建options
    const options = databases.map(db => ({
        label: `${db.instance?.name || `实例${db.instance_id}`} - ${db.name}`,
        value: `${db.instance_id}|${db.name}`,
    }));

    if (disabled) {
        return (
            <Select
                mode="multiple"
                placeholder="请先选择实例"
                disabled
                style={{ width: '100%' }}
                allowClear
            />
        );
    }

    if (loading) {
        return <Spin />;
    }

    if (databases.length === 0) {
        return <Empty description="未找到数据库" />;
    }

    return (
        <div>
            <div style={{ marginBottom: '8px' }}>
                <Space size="small">
                    <Button 
                        size="small" 
                        type="link" 
                        onClick={handleSelectAll}
                        style={{ padding: '0', fontSize: '12px' }}
                    >
                        全选
                    </Button>
                    <span style={{ color: '#d9d9d9' }}>|</span>
                    <Button 
                        size="small" 
                        type="link" 
                        onClick={handleInvertSelection}
                        style={{ padding: '0', fontSize: '12px' }}
                    >
                        反选
                    </Button>
                    <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}>
                        已选择 {value.length} / {databases.length}
                    </span>
                </Space>
            </div>
            
            <Select
                mode="multiple"
                placeholder="请选择数据库"
                value={formatValue(value)}
                onChange={handleChange}
                style={{ width: '100%' }}
                options={options}
                showSearch
                filterOption={(input, option) => {
                    if (!option?.label) return false;
                    return String(option.label).toLowerCase().includes(input.toLowerCase());
                }}
                allowClear
                maxTagCount={5}
                maxTagTextLength={20}
            />
        </div>
    );
};

export default DatabaseSelector; 