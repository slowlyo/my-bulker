import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, Drawer, Descriptions, List, Modal, Spin } from 'antd';
import { useRef, useState, useEffect } from 'react';
import { queryDatabaseList, getDatabaseDetail, getTableDetail } from '@/services/database/DatabaseController';
import { getInstanceOptions, InstanceOption } from '@/services/instance/InstanceController';
import { DatabaseInfo, TableInfo } from '@/services/database/typings';
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

    const [tableDetailVisible, setTableDetailVisible] = useState(false);
    const [currentTable, setCurrentTable] = useState<TableInfo | null>(null);
    const [loadingTable, setLoadingTable] = useState(false);

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
        },
        {
            title: '数据库大小',
            dataIndex: 'size',
            hideInSearch: true,
            render: (text) => formatFileSize(Number(text)),
        },
        {
            title: '最后同步时间',
            dataIndex: 'updated_at',
            valueType: 'dateTime',
            hideInSearch: true,
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

    // 点击表项，加载表详情
    const handleTableClick = async (table: TableInfo) => {
        setTableDetailVisible(true);
        setLoadingTable(true);
        try {
            const res = await getTableDetail(table.id);
            if (res.code === 200) {
                setCurrentTable(res.data);
            }
        } finally {
            setLoadingTable(false);
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
                request={async (params) => {
                    const { current, pageSize, ...rest } = params;
                    const res = await queryDatabaseList({
                        page: current,
                        pageSize,
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
                width={600}
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
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="数据库名称">{currentDatabase.name}</Descriptions.Item>
                            <Descriptions.Item label="实例名称">{currentDatabase.instance?.name}</Descriptions.Item>
                            <Descriptions.Item label="字符集">{currentDatabase.character_set}</Descriptions.Item>
                            <Descriptions.Item label="排序规则">{currentDatabase.collation}</Descriptions.Item>
                            <Descriptions.Item label="表数量">{currentDatabase.table_count}</Descriptions.Item>
                            <Descriptions.Item label="数据库大小">{formatFileSize(currentDatabase.size)}</Descriptions.Item>
                        </Descriptions>
                        <div style={{ marginTop: 24 }}>
                            <List
                                bordered
                                dataSource={currentDatabase.tables || []}
                                renderItem={item => (
                                    <List.Item style={{ cursor: 'pointer' }} onClick={() => handleTableClick(item)}>
                                        <Space>
                                            <strong>{item.name}</strong>
                                            <span>{item.comment}</span>
                                        </Space>
                                    </List.Item>
                                )}
                                locale={{ emptyText: '暂无表' }}
                            />
                        </div>
                    </>
                ) : null}
            </Drawer>

            <Modal
                title={currentTable ? `表：${currentTable.name}` : '表详情'}
                open={tableDetailVisible}
                onCancel={() => {
                    setTableDetailVisible(false);
                    setCurrentTable(null);
                }}
                footer={null}
                destroyOnHidden
            >
                {loadingTable ? (
                    <Spin />
                ) : currentTable ? (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="表名">{currentTable.name}</Descriptions.Item>
                        <Descriptions.Item label="注释">{currentTable.comment}</Descriptions.Item>
                        <Descriptions.Item label="引擎">{currentTable.engine}</Descriptions.Item>
                        <Descriptions.Item label="字符集">{currentTable.character_set}</Descriptions.Item>
                        <Descriptions.Item label="排序规则">{currentTable.collation}</Descriptions.Item>
                        <Descriptions.Item label="行数">{currentTable.row_count}</Descriptions.Item>
                        <Descriptions.Item label="表大小">{formatFileSize(currentTable.size)}</Descriptions.Item>
                        <Descriptions.Item label="索引大小">{formatFileSize(currentTable.index_size)}</Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Modal>
        </PageContainer>
    );
};

export default DatabasePage; 