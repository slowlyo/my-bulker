import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Drawer, Descriptions, Spin } from 'antd';
import { useRef, useState, useEffect } from 'react';
import { queryDatabaseList, getDatabaseDetail } from '@/services/database/DatabaseController';
import { getInstanceOptions } from '@/services/instance/InstanceController';
import { DatabaseInfo } from '@/services/database/typings';
import { formatFileSize } from '@/utils/format';
import { DatabaseOutlined, EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';

// DatabasePage 数据库管理列表与明细查看面板
const DatabasePage: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [instanceOptions, setInstanceOptions] = useState<{ label: string; value: number }[]>([]);

    // 初始化加载所属实例选项，用于搜索下拉筛选
    useEffect(() => {
        // 请求实例选项集合
        const fetchInstanceOptions = async () => {
            const res = await getInstanceOptions();
            // 接口返回成功且数据非空时写入状态
            if (res.code === 200 && res.data) {
                setInstanceOptions(res.data);
            }
        };
        fetchInstanceOptions();
    }, []);

    // 抽屉状态与详情数据
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [currentDatabase, setCurrentDatabase] = useState<DatabaseInfo | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // 点击行或操作按钮加载数据库详情
    const handleRowClick = async (record: DatabaseInfo) => {
        setDrawerVisible(true);
        setLoadingDetail(true);
        try {
            const res = await getDatabaseDetail(record.id);
            // 请求成功写入详情数据
            if (res.code === 200) {
                setCurrentDatabase(res.data);
            }
        } finally {
            setLoadingDetail(false);
        }
    };

    const columns: ProColumns<DatabaseInfo>[] = [
        {
            title: '数据库名称',
            dataIndex: 'name',
            copyable: true,
            ellipsis: true,
            // 数据库名称带轻量图标呈现
            render: (text) => (
                <div className="flex items-center gap-1.5">
                    <DatabaseOutlined className="text-slate-400 text-xs shrink-0" />
                    <span className="font-semibold text-slate-800 text-sm">{text}</span>
                </div>
            ),
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
            // 所属实例以紧凑浅灰徽标展示
            render: (_, record) => (
                <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium border border-slate-200/60">
                    {record.instance?.name || '-'}
                </span>
            ),
        },
        {
            title: '表数量',
            dataIndex: 'table_count',
            hideInSearch: true,
            sorter: true,
            render: (text) => <span className="font-mono text-xs text-slate-700">{text ?? 0}</span>,
        },
        {
            title: '数据库大小',
            dataIndex: 'size',
            hideInSearch: true,
            sorter: true,
            render: (text) => (
                <span className="font-mono text-xs text-slate-700">
                    {formatFileSize(Number(text))}
                </span>
            ),
        },
        {
            title: '最后同步时间',
            dataIndex: 'updated_at',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
        },
        {
            title: '操作',
            valueType: 'option',
            width: 80,
            render: (_, record) => (
                <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined className="text-slate-500" />}
                    className="!text-slate-700 hover:!text-slate-900 hover:!bg-slate-100 !px-2 !h-7 !text-xs !rounded-md"
                    onClick={(e) => {
                        // 阻止事件冒泡避免触发 onRow
                        e.stopPropagation();
                        handleRowClick(record);
                    }}
                >
                    详情
                </Button>
            ),
        },
    ];

    return (
        <PageContainer ghost>
            <ProTable<DatabaseInfo>
                cardBordered
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 120,
                }}
                request={async (params, sort) => {
                    const { current, pageSize, ...rest } = params;

                    // 处理列表排序参数
                    let sort_field = undefined;
                    let sort_order = undefined;

                    // 排序参数有效时解析单字段排序
                    if (sort && Object.keys(sort).length > 0) {
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
                pagination={{
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    defaultPageSize: 20,
                    showTotal: (total) => `共 ${total} 条记录`,
                }}
                onRow={(record) => {
                    return {
                        onClick: () => handleRowClick(record),
                        style: { cursor: 'pointer' },
                    };
                }}
            />

            <Drawer
                title={currentDatabase ? `数据库：${currentDatabase.name}` : '数据库详情'}
                width={420}
                open={drawerVisible}
                onClose={() => {
                    setDrawerVisible(false);
                    setCurrentDatabase(null);
                }}
                destroyOnClose
            >
                {/* 详情加载中展示骨架等待 */}
                {loadingDetail ? (
                    <div className="flex justify-center items-center py-20">
                        <Spin />
                    </div>
                ) : currentDatabase ? (
                    <div className="flex flex-col h-full justify-between">
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <DatabaseOutlined className="text-slate-600 text-base" />
                                    <div>
                                        <div className="font-semibold text-slate-900 text-sm leading-tight">
                                            {currentDatabase.name}
                                        </div>
                                        <div className="text-xs text-slate-500 leading-tight mt-0.5">
                                            所属实例: {currentDatabase.instance?.name || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label="数据库名称">{currentDatabase.name}</Descriptions.Item>
                                <Descriptions.Item label="实例名称">{currentDatabase.instance?.name || '-'}</Descriptions.Item>
                                <Descriptions.Item label="字符集">{currentDatabase.character_set || '-'}</Descriptions.Item>
                                <Descriptions.Item label="排序规则">{currentDatabase.collation || '-'}</Descriptions.Item>
                                <Descriptions.Item label="表数量">
                                    <span className="font-mono">{currentDatabase.table_count}</span>
                                </Descriptions.Item>
                                <Descriptions.Item label="数据库大小">
                                    <span className="font-mono">{formatFileSize(currentDatabase.size)}</span>
                                </Descriptions.Item>
                            </Descriptions>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={() => history.push('/query-task?action=create')}
                                className="!rounded-md !text-xs !h-8"
                            >
                                发起查询任务
                            </Button>
                        </div>
                    </div>
                ) : null}
            </Drawer>
        </PageContainer>
    );
};

export default DatabasePage; 