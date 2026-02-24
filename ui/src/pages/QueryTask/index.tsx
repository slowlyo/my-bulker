import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Space, Button, message, Modal, Tooltip, Segmented, Tabs, Progress, Typography } from 'antd';
import { useRef, useState, useEffect } from 'react';
import { EyeOutlined, DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { queryQueryTaskList, createQueryTask, batchDeleteQueryTasks, toggleFavoriteStatus } from '@/services/queryTask/QueryTaskController';
import { QueryTaskInfo, CreateQueryTaskRequest } from '@/services/queryTask/typings';
import CreateTaskForm from './components/CreateTaskForm';
import { history, useLocation } from '@umijs/max';

type FavoriteFilter = 'all' | 'favorites';
type HistoryTabKey = 'quick-query' | 'task-history';
type StatusFilter = 'all' | 0 | 1 | 2 | 3;



const QueryTaskPage: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>('all');
    const [activeTab, setActiveTab] = useState<HistoryTabKey>('quick-query');

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

    const columns: ProColumns<QueryTaskInfo>[] = [
        {
            dataIndex: 'is_favorite',
            width: 48,
            search: false,
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
            title: '任务名称',
            dataIndex: 'task_name',
            width: 280,
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 500, color: '#1f2937', fontSize: '14px' }}>{record.task_name}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.description || '暂无任务描述'}
                    </span>
                </div>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            valueType: 'select',
            valueEnum: {
                0: { text: '待执行', status: 'Default' },
                1: { text: '执行中', status: 'Processing' },
                2: { text: '已完成', status: 'Success' },
                3: { text: '失败', status: 'Error' },
            },
        },
        {
            title: '执行进度',
            dataIndex: 'progress',
            width: 260,
            search: false,
            render: (_, record) => {
                const hasFailure = record.failed_dbs > 0 || record.failed_sqls > 0;
                const dbPercent = record.total_dbs === 0 ? 0 : Math.round((record.completed_dbs / record.total_dbs) * 100);
                
                return (
                    <div style={{ width: '100%', paddingRight: 24, margin: '8px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: '#4b5563' }}>数据库 ({record.completed_dbs}/{record.total_dbs})</span>
                            <span style={{ color: '#4b5563' }}>SQL ({record.completed_sqls}/{record.total_sqls})</span>
                        </div>
                        <Progress 
                            percent={dbPercent} 
                            status={hasFailure ? 'exception' : (dbPercent === 100 ? 'success' : 'normal')}
                            size="small" 
                            showInfo={false} 
                            style={{ margin: 0 }}
                        />
                        {hasFailure ? (
                            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                                失败：{record.failed_dbs} 个库异常，{record.failed_sqls} 条SQL失败
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: '#10b981', marginTop: 4, visibility: dbPercent === 100 ? 'visible' : 'hidden' }}>
                                全部执行成功
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            valueType: 'dateTime',
            sorter: true,
            search: false,
            width: 170,
        },
        {
            title: '操作',
            valueType: 'option',
            search: false,
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
                                search={{
                                    labelWidth: 'auto',
                                    collapsed: false,
                                    collapseRender: false,
                                }}
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
                                    const { current, pageSize, task_name, status } = params;

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

                                    // 从 params 获取 ProTable 提供的标准筛选条件
                                    if (task_name) {
                                        queryParams.task_name = task_name;
                                    }

                                    // 状态非空时才下发
                                    if (status !== undefined && status !== '') {
                                        queryParams.status = Number(status);
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
