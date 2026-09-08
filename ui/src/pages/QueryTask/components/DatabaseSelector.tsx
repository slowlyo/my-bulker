import React, { useState, useEffect } from 'react';
import { Select, Spin, Empty, Button, Tag } from 'antd';
import { batchQueryDatabaseList } from '@/services/database/DatabaseController';
import { TaskDatabase } from '@/services/queryTask/typings';

interface DatabaseSelectorProps {
    instanceIds: number[];
    disabled?: boolean;
    value?: TaskDatabase[];
    onChange?: (value: TaskDatabase[]) => void;
}

/**
 * 数据库多选组件，根据选中的实例列表异步加载候选数据库，支持全选与反选操作。
 * @param props 组件属性
 */
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

    /**
     * 根据实例 ID 列表加载各实例包含的数据库。
     */
    useEffect(() => {
        // 未选择实例时立即清空候选数据库列表
        if (instanceIds.length === 0) {
            setDatabases([]);
            return;
        }

        const loadDatabases = async () => {
            setLoading(true);
            try {
                const res = await batchQueryDatabaseList(instanceIds);
                // 接口响应成功且存在数据时映射为标准候选列表
                if (res.code === 200 && res.data) {
                    setDatabases(res.data.map((item: any) => ({
                        id: 0,
                        name: item.database_name,
                        instance_id: item.instance_id,
                        instance: { name: item.instance_name },
                    })));
                } else {
                    // 数据为空或返回异常时兜底清空
                    setDatabases([]);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('加载数据库数据失败:', error);
                setDatabases([]);
            } finally {
                setLoading(false);
            }
        };

        loadDatabases();
    }, [instanceIds]);

    /**
     * 处理多选变动，将复合值字符串还原为 TaskDatabase 对象数组。
     * @param selectedValues 选中的组合字符串列表
     */
    const handleChange = (selectedValues: string[]) => {
        const selectedDBs: TaskDatabase[] = selectedValues.map((val) => {
            const [instanceId, databaseName] = val.split('|');
            return {
                instance_id: parseInt(instanceId),
                database_name: databaseName,
            };
        });

        // 触发父级表单数据同步
        if (onChange) {
            onChange(selectedDBs);
        }
    };

    /**
     * 将 TaskDatabase 数组转为 Select 所需的复合字符串数组。
     * @param selectedDBs 数据库对象列表
     * @returns 复合主键数组
     */
    const formatValue = (selectedDBs: TaskDatabase[]): string[] => {
        return selectedDBs.map((db) => `${db.instance_id}|${db.database_name}`);
    };

    /**
     * 一键选中当前所有候选数据库。
     */
    const handleSelectAll = () => {
        const allDBs: TaskDatabase[] = databases.map((db) => ({
            instance_id: db.instance_id,
            database_name: db.name,
        }));

        // 全选触发更新
        if (onChange) {
            onChange(allDBs);
        }
    };

    /**
     * 针对当前候选库进行反向选择。
     */
    const handleInvertSelection = () => {
        const currentSelected = new Set(formatValue(value));
        const allOptions = databases.map((db) => `${db.instance_id}|${db.name}`);

        const invertedSelection = allOptions.filter((option) => !currentSelected.has(option));

        const invertedDBs: TaskDatabase[] = invertedSelection.map((val) => {
            const [instanceId, databaseName] = val.split('|');
            return {
                instance_id: parseInt(instanceId),
                database_name: databaseName,
            };
        });

        // 反选触发更新
        if (onChange) {
            onChange(invertedDBs);
        }
    };

    // 构建下拉候选数据，包含实例名称前缀以便于区分同名库
    const options = databases.map((db) => ({
        label: `${db.instance?.name || `实例${db.instance_id}`} - ${db.name}`,
        value: `${db.instance_id}|${db.name}`,
    }));

    // 未选择实例时的禁用状态呈现
    if (disabled) {
        return (
            <Select
                mode="multiple"
                placeholder="请先在上方选择实例"
                disabled
                style={{ width: '100%' }}
            />
        );
    }

    // 正在拉取候选数据库时的加载占位
    if (loading) {
        return (
            <div className="py-4 text-center border border-slate-200 rounded-md bg-slate-50/50">
                <Spin size="small" />
                <span className="text-xs text-slate-400 ml-2">正在获取数据库列表...</span>
            </div>
        );
    }

    // 实例下无可用数据库时的空状态
    if (databases.length === 0) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选中的实例下暂未发现可用数据库" />;
    }

    return (
        <div className="flex flex-col gap-2">
            <Select
                mode="multiple"
                placeholder="请选择数据库"
                value={formatValue(value)}
                onChange={handleChange}
                style={{ width: '100%' }}
                options={options}
                showSearch
                filterOption={(input, option) => {
                    // 空标签时无法匹配
                    if (!option?.label) return false;
                    return String(option.label).toLowerCase().includes(input.toLowerCase());
                }}
                allowClear
                maxTagCount="responsive"
            />

            <div className="flex items-center justify-between text-xs text-neutral-500 pt-0.5">
                <div className="flex items-center gap-1.5">
                    <Button
                        size="small"
                        type="text"
                        onClick={handleSelectAll}
                        className="h-6 px-1.5 text-xs text-neutral-700 hover:text-neutral-900"
                    >
                        全选
                    </Button>
                    <span className="text-neutral-300">|</span>
                    <Button
                        size="small"
                        type="text"
                        onClick={handleInvertSelection}
                        className="h-6 px-1.5 text-xs text-neutral-700 hover:text-neutral-900"
                    >
                        反选
                    </Button>
                </div>
                <div>
                    <Tag bordered={false} className="mr-0 text-xs bg-neutral-100 text-neutral-600">
                        已选 {value.length} / {databases.length}
                    </Tag>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSelector; 