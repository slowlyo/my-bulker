import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Space, Button, message, Modal, Tooltip, Segmented, Tabs, Input, Select } from 'antd';
import { useRef, useState, useEffect } from 'react';
import { EyeOutlined, DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { queryQueryTaskList, createQueryTask, batchDeleteQueryTasks, toggleFavoriteStatus } from '@/services/queryTask/QueryTaskController';
import { QueryTaskInfo, CreateQueryTaskRequest } from '@/services/queryTask/typings';
import CreateTaskForm from './components/CreateTaskForm';
import { history, useLocation } from '@umijs/max';

type FavoriteFilter = 'all' | 'favorites';
type HistoryTabKey = 'quick-query' | 'task-history';
type StatusFilter = 'all' | 0 | 1 | 2 | 3;

const statusMap = {
    0: { text: '待执行', color: 'default' },
    1: { text: '执行中', color: 'processing' },
    2: { text: '已完成', color: 'success' },
    3: { text: '失败', color: 'error' },
};

const QueryTaskPage: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>('all');
    const [activeTab, setActiveTab] = useState<HistoryTabKey>('quick-query');
    const [historyKeyword, setHistoryKeyword] = useState('');
    const [historyStatus, setHistoryStatus] = useState<StatusFilter>('all');

    // 解析 URL 参数，兼容首页跳转的创建动作和收藏筛选动作。
    useEffect(() => {
        const params = new URLSearchParams(location.search);

        // 带 action=create 时强制聚焦到快速创建，并清理该一次性参数。
        if (params.get('action') === 'create') {
            setActiveTab('quick-query');
            params.delete('action');
            const query = params.toString();
            history.replace(query ? `/query-task?${query}` : '/query-task');
        }

        // 带 filter=favorites 时默认展示历史页并启用收藏筛选。
        if (params.get('filter') === 'favorites') {
            setFavoriteFilter('favorites');
            setActiveTab('task-history');
        }
    }, [location.search]);

    // 跳转到详情页，保证创建后和历史查看的路径一致。
    const handleViewDetail = (record: QueryTaskInfo) => {
        history.push(`/query-task/detail/${record.id}`);
    };

    // 创建任务后直接进入详情，减少二次点击。
    const handleCreateTask = async (values: CreateQueryTaskRequest) => {
        setLoading(true);
        try {
            const res = await createQueryTask(values);
            if (res.code === 200) {
                message.success('创建任务成功');
                history.push(`/query-task/detail/${res.data.id}`);
            } else {
                message.error(res.message || '创建任务失败');
            }
        } catch {
            message.error('创建任务失败');
        } finally {
            setLoading(false);
        }
    };

    // 批量删除前强校验选择，避免误删空集合。
    const handleBatchDelete = () => {
        if (selectedRowKeys.length === 0) {
            message.warning('请至少选择一个任务');
            return;
        }
        Modal.confirm({
            title: `确认删除选中的 ${selectedRowKeys.length} 个任务吗？`,
            content: '此操作将永久删除任务、所有执行记录以及相关结果数据表，且无法恢复。',
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    const res = await batchDeleteQueryTasks(selectedRowKeys as number[]);
                    if (res.code === 200) {
                        message.success('删除成功');
                        setSelectedRowKeys([]);
                        actionRef.current?.reload();
                    } else {
                        message.error(res.message || '删除失败');
                    }
                } catch {
                    message.error('删除失败');
                }
            },
        });
    };

    // 收藏状态变更后刷新列表，保证筛选结果实时可见。
    const handleToggleFavorite = async (taskId: number, isFavorite: boolean) => {
        try {
            const res = await toggleFavoriteStatus(taskId);
            if (res.code === 200) {
                message.success(isFavorite ? '已取消收藏' : '已收藏');
                actionRef.current?.reload();
            } else {
                message.error(res.message || '操作失败');
            }
        } catch {
            message.error('操作失败');
        }
    };

    // 切换收藏筛选并刷新历史列表。
    const handleFavoriteFilterChange = (value: string | number) => {
        setFavoriteFilter(value as FavoriteFilter);
        actionRef.current?.reload();
    };

    // 切换状态筛选并刷新历史列表。
    const handleHistoryStatusChange = (value: StatusFilter) => {
        setHistoryStatus(value);
        actionRef.current?.reload();
    };

    // 关键词搜索仅在确认后触发，避免输入中频繁请求。
    const handleHistorySearch = (value: string) => {
        setHistoryKeyword(value.trim());
        actionRef.current?.reload();
    };

    const columns: ProColumns<QueryTaskInfo>[] = [
        {
            dataIndex: 'is_favorite',
            width: 48,
            render: (_, record) => (
                <Tooltip title={record.is_favorite ? '取消收藏' : '收藏'}>
                    <Button
                        type="text"
                        shape="circle"
                        icon={record.is_favorite ? <StarFilled style={{ color: '#ffc53d' }} /> : <StarOutlined />}
                        onClick={() => handleToggleFavorite(record.id, record.is_favorite)}
                    />
                </Tooltip>
            ),
        },
        {
            title: '任务',
            dataIndex: 'task_name',
            width: 320,
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <strong>{record.task_name}</strong>
                    {record.description ? (
                        <span style={{ fontSize: 12, color: '#8c8c8c' }}>{record.description}</span>
                    ) : (
                        <span style={{ fontSize: 12, color: '#bfbfbf' }}>无描述</span>
                    )}
                </Space>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (_, record) => {
                const status = statusMap[record.status as keyof typeof statusMap];
                return <Tag color={status.color}>{status.text}</Tag>;
            },
        },
        {
            title: '执行进度',
            dataIndex: 'progress',
            width: 240,
            render: (_, record) => {
                const hasFailure = record.failed_dbs > 0 || record.failed_sqls > 0;
                return (
                    <Space direction="vertical" size={2}>
                        <span>数据库：{record.completed_dbs}/{record.total_dbs}</span>
                        <span>SQL：{record.completed_sqls}/{record.total_sqls}</span>
                        {hasFailure ? (
                            <span style={{ fontSize: 12, color: '#cf1322' }}>
                                失败库 {record.failed_dbs}，失败SQL {record.failed_sqls}
                            </span>
                        ) : (
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>暂无失败</span>
                        )}
                    </Space>
                );
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            valueType: 'dateTime',
            sorter: true,
            width: 170,
        },
        {
            title: '操作',
            valueType: 'option',
            width: 88,
            fixed: 'right',
            render: (_, record) => [
                <Button
                    key="view"
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(record)}
                >
                    详情
                </Button>,
            ],
        },
    ];

    return (
        <PageContainer ghost>
            <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as HistoryTabKey)}
                destroyInactiveTabPane
                items={[
                    {
                        key: 'quick-query',
                        label: '快速查询',
                        children: (
                            <CreateTaskForm
                                onSubmit={handleCreateTask}
                                loading={loading}
                            />
                        ),
                    },
                    {
                        key: 'task-history',
                        label: '历史任务',
                        children: (
                            <ProTable<QueryTaskInfo>
                                cardBordered
                                actionRef={actionRef}
                                rowKey="id"
                                search={false}
                                headerTitle={(
                                    <Segmented
                                        options={[
                                            { label: '全部任务', value: 'all' },
                                            { label: '我的收藏', value: 'favorites' },
                                        ]}
                                        value={favoriteFilter}
                                        onChange={handleFavoriteFilterChange}
                                    />
                                )}
                                toolBarRender={() => [
                                    <Select<StatusFilter>
                                        key="status-filter"
                                        style={{ width: 130 }}
                                        value={historyStatus}
                                        onChange={handleHistoryStatusChange}
                                        options={[
                                            { label: '全部状态', value: 'all' },
                                            { label: '待执行', value: 0 },
                                            { label: '执行中', value: 1 },
                                            { label: '已完成', value: 2 },
                                            { label: '失败', value: 3 },
                                        ]}
                                    />,
                                    <Input.Search
                                        key="task-search"
                                        allowClear
                                        style={{ width: 240 }}
                                        placeholder="按任务名称搜索"
                                        onSearch={handleHistorySearch}
                                        onChange={(e) => {
                                            // 清空输入框时立即恢复全量列表。
                                            if (!e.target.value) {
                                                handleHistorySearch('');
                                            }
                                        }}
                                    />,
                                    <Button
                                        key="delete"
                                        danger
                                        icon={<DeleteOutlined />}
                                        disabled={selectedRowKeys.length === 0}
                                        onClick={handleBatchDelete}
                                    >
                                        批量删除
                                    </Button>,
                                ]}
                                request={async (params, sort) => {
                                    const { current, pageSize } = params;

                                    let sortField = undefined;
                                    let sortOrder = undefined;

                                    // ProTable 仅取首个排序字段，和后端单字段排序契合。
                                    if (sort && Object.keys(sort).length > 0) {
                                        const fieldName = Object.keys(sort)[0];
                                        const order = sort[fieldName];

                                        sortField = fieldName;
                                        sortOrder = order === 'ascend' ? 'asc' : 'desc';
                                    }

                                    const queryParams: {
                                        task_name?: string;
                                        status?: number;
                                        is_favorite?: boolean;
                                    } = {};

                                    // 收藏视图只看已收藏任务。
                                    if (favoriteFilter === 'favorites') {
                                        queryParams.is_favorite = true;
                                    }

                                    // 有关键词才下发名称筛选，避免无效参数。
                                    if (historyKeyword) {
                                        queryParams.task_name = historyKeyword;
                                    }

                                    // 状态不是“全部”时才下发状态筛选。
                                    if (historyStatus !== 'all') {
                                        queryParams.status = historyStatus;
                                    }

                                    const res = await queryQueryTaskList({
                                        page: current,
                                        pageSize,
                                        sort_field: sortField,
                                        sort_order: sortOrder,
                                        ...queryParams,
                                    });
                                    return {
                                        data: res.data?.items || [],
                                        success: res.code === 200,
                                        total: res.data?.total || 0,
                                    };
                                }}
                                columns={columns}
                                scroll={{ x: 980 }}
                                pagination={{
                                    showSizeChanger: true,
                                    pageSizeOptions: ['10', '20', '50', '100'],
                                    defaultPageSize: 20,
                                    showTotal: (total) => `共 ${total} 条记录`,
                                }}
                                rowSelection={{
                                    onChange: (keys) => {
                                        setSelectedRowKeys(keys);
                                    },
                                    selectedRowKeys,
                                }}
                            />
                        ),
                    },
                ]}
            />
        </PageContainer>
    );
};

export default QueryTaskPage;
