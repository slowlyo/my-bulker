import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, Drawer, Descriptions, Spin } from 'antd';
import { useRef, useState, useEffect } from 'react';
import { queryDatabaseList, getDatabaseDetail } from '@/services/database/DatabaseController';
import { getInstanceOptions, InstanceOption } from '@/services/instance/InstanceController';
import { DatabaseInfo } from '@/services/database/typings';
import { formatFileSize } from '@/utils/format';

const DatabasePage: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [instanceOptions, setInstanceOptions] = useState<{ label: string; value: number }[]>([]);

    // 获取实例选项
    useEffect(() => {
        const fetchInstanceOptions = async () => {
            const res = await getInstanceOptions();
            if (res.code === 200 && res.data) {
                setInstanceOptions(res.data);
            }
        };
        fetchInstanceOptions();
    }, []);

    // 抽屉与详情状态
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [currentDatabase, setCurrentDatabase] = useState<DatabaseInfo | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const columns: ProColumns<DatabaseInfo>[] = [
        {
            title: '数据库名称',
            dataIndex: 'name',
            copyable: true,
            ellipsis: true,
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: '实例名称',
            dataIndex: 'instance_id',
            valueType: 'select',
            fieldProps: {
                options: instanceOptions,
                showSearch: true,
                filterOption: (input: string, option: { label: string; value: number } | undefined) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
            },
            render: (_, record) => <Tag>{record.instance?.name}</Tag>,
        },
        {
            title: '表数量',
            dataIndex: 'table_count',
            hideInSearch: true,
            sorter: true,
        },
        {
            title: '数据库大小',
            dataIndex: 'size',
            hideInSearch: true,
            sorter: true,
            render: (text) => formatFileSize(Number(text)),
        },
        {
            title: '最后同步时间',
            dataIndex: 'updated_at',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
        },
    ];

    // 点击行，加载数据库详情
    const handleRowClick = async (record: DatabaseInfo) => {
        setDrawerVisible(true);
        setLoadingDetail(true);
        try {
            const res = await getDatabaseDetail(record.id);
            if (res.code === 200) {
                setCurrentDatabase(res.data);
            }
        } finally {
            setLoadingDetail(false);
        }
    };

    return (
        <PageContainer ghost>
            <ProTable<DatabaseInfo>
                cardBordered
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 120,
                }}
                request={async (params, sort, filter) => {
                    const { current, pageSize, ...rest } = params;
                    
                    // 处理排序参数
                    let sort_field = undefined;
                    let sort_order = undefined;
                    
                    if (sort && Object.keys(sort).length > 0) {
                        // 获取第一个排序字段（ProTable 通常只支持单字段排序）
                        const fieldName = Object.keys(sort)[0];
                        const order = sort[fieldName];
                        
                        sort_field = fieldName;
                        sort_order = order === 'ascend' ? 'asc' : 'desc';
                    }
                    
                    const res = await queryDatabaseList({
                        page: current,
                        pageSize,
                        sort_field,
                        sort_order,
                        ...rest,
                    });
                    return {
                        data: res.data?.items || [],
                        success: res.code === 200,
                        total: res.data?.total || 0,
                    };
                }}
                columns={columns}
                onRow={(record) => {
                    return {
                        onClick: () => handleRowClick(record),
                        style: { cursor: 'pointer' },
                    };
                }}
            />

            <Drawer
                title={currentDatabase ? `数据库：${currentDatabase.name}` : '数据库详情'}
                width={400}
                open={drawerVisible}
                onClose={() => {
                    setDrawerVisible(false);
                    setCurrentDatabase(null);
                }}
                destroyOnClose
            >
                {loadingDetail ? (
                    <Spin />
                ) : currentDatabase ? (
                    <>
                        <Descriptions column={1} bordered style={{ marginBottom: 24 }}>
                            <Descriptions.Item label="数据库名称">{currentDatabase.name}</Descriptions.Item>
                            <Descriptions.Item label="实例名称">{currentDatabase.instance?.name}</Descriptions.Item>
                            <Descriptions.Item label="字符集">{currentDatabase.character_set}</Descriptions.Item>
                            <Descriptions.Item label="排序规则">{currentDatabase.collation}</Descriptions.Item>
                            <Descriptions.Item label="表数量">{currentDatabase.table_count}</Descriptions.Item>
                            <Descriptions.Item label="数据库大小">{formatFileSize(currentDatabase.size)}</Descriptions.Item>
                        </Descriptions>
                    </>
                ) : null}
            </Drawer>
        </PageContainer>
    );
};

export default DatabasePage; 