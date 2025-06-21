import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Space, Button, message, Modal, Tooltip, Segmented } from 'antd';
import { useRef, useState, useEffect } from 'react';
import { PlusOutlined, EyeOutlined, DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { queryQueryTaskList, createQueryTask, batchDeleteQueryTasks, toggleFavoriteStatus } from '@/services/queryTask/QueryTaskController';
import { QueryTaskInfo, CreateQueryTaskRequest } from '@/services/queryTask/typings';
import CreateTaskForm from './components/CreateTaskForm';
import { history, useLocation } from '@umijs/max';

const QueryTaskPage: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [favoriteFilter, setFavoriteFilter] = useState<string | number>('all');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'create') {
            setDrawerVisible(true);
            // 清理URL参数，避免刷新时再次触发
            history.replace('/query-task');
        }
        
        // 处理收藏筛选参数
        if (params.get('filter') === 'favorites') {
            setFavoriteFilter('favorites');
            // 不清除URL参数，保留筛选状态
        }
    }, [location.search]);

    // 状态映射
    const statusMap = {
        0: { text: '待执行', color: 'default' },
        1: { text: '执行中', color: 'processing' },
        2: { text: '已完成', color: 'success' },
        3: { text: '失败', color: 'error' },
    };

    // 跳转到详情页
    const handleViewDetail = (record: QueryTaskInfo) => {
        history.push(`/query-task/detail/${record.id}`);
    };

    // 处理创建任务
    const handleCreateTask = async (values: CreateQueryTaskRequest) => {
        setLoading(true);
        try {
            const res = await createQueryTask(values);
            if (res.code === 200) {
                message.success('创建任务成功');
                setDrawerVisible(false);
                // 跳转到详情页
                history.push(`/query-task/detail/${res.data.id}`);
            } else {
                message.error(res.message || '创建任务失败');
            }
        } catch (error) {
            message.error('创建任务失败');
        } finally {
            setLoading(false);
        }
    };

    const handleBatchDelete = () => {
        if (selectedRowKeys.length === 0) {
            message.warning('请至少选择一个任务');
            return;
        }
        Modal.confirm({
            title: `确认删除选中的 ${selectedRowKeys.length} 个任务吗？`,
            content: '此操作将永久删除任务、所有执行记录以及相关的结果数据表，且无法恢复。请谨慎操作。',
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    const res = await batchDeleteQueryTasks(selectedRowKeys as number[]);
                    if (res.code === 200) {
                        message.success('删除成功');
                        setSelectedRowKeys([]); // Clear selection
                        actionRef.current?.reload(); // Refresh table
                    } else {
                        message.error(res.message || '删除失败');
                    }
                } catch {
                    message.error('删除失败');
                }
            },
        });
    };

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
            hideInSearch: true,
        },
        {
            title: '任务名称',
            dataIndex: 'task_name',
            ellipsis: true,
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: '任务描述',
            dataIndex: 'description',
            ellipsis: true,
            hideInSearch: true,
        },
        {
            title: '任务状态',
            dataIndex: 'status',
            valueType: 'select',
            width: 120,
            fieldProps: {
                options: [
                    { label: '待执行', value: 0 },
                    { label: '执行中', value: 1 },
                    { label: '已完成', value: 2 },
                    { label: '失败', value: 3 },
                ],
            },
            render: (_, record) => {
                const status = statusMap[record.status as keyof typeof statusMap];
                return <Tag color={status.color}>{status.text}</Tag>;
            },
        },
        {
            title: '数据库统计',
            dataIndex: 'total_dbs',
            hideInSearch: true,
            width: 120,
            render: (_, record) => {
                const showStats = (record.completed_dbs > 0 || record.failed_dbs > 0);
                return (
                    <Space direction="vertical" size="small">
                        <span>总数: {record.total_dbs}</span>
                        {showStats && (
                            <>
                                <span className='text-green-500'>已完成: {record.completed_dbs}</span>
                                <span className={record.failed_dbs > 0 ? 'text-red-500' : 'text-gray-400'}>
                                    失败: {record.failed_dbs}
                                </span>
                            </>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'SQL统计',
            dataIndex: 'total_sqls',
            hideInSearch: true,
            width: 120,
            render: (_, record) => {
                const showStats = (record.completed_sqls > 0 || record.failed_sqls > 0);
                return (
                    <Space direction="vertical" size="small">
                        <span>总数: {record.total_sqls}</span>
                        {showStats && (
                            <>
                                <span className='text-green-500'>已完成: {record.completed_sqls}</span>
                                <span className={record.failed_sqls > 0 ? 'text-red-500' : 'text-gray-400'}>
                                    失败: {record.failed_sqls}
                                </span>
                            </>
                        )}
                    </Space>
                );
            },
        },
        {
            title: '开始时间',
            dataIndex: 'started_at',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
            width: 160,
        },
        {
            title: '完成时间',
            dataIndex: 'completed_at',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
            width: 160,
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
            width: 160,
        },
        {
            title: '操作',
            valueType: 'option',
            width: 80,
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
        <PageContainer
            ghost
            header={{
                title: (
                    <Segmented
                        options={[
                            { label: '全部任务', value: 'all' },
                            { label: '我的收藏', value: 'favorites' },
                        ]}
                        value={favoriteFilter}
                        onChange={(value) => {
                            setFavoriteFilter(value);
                            actionRef.current?.reload();
                        }}
                    />
                ),
            }}
        >
            <ProTable<QueryTaskInfo>
                cardBordered
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 120,
                }}
                toolBarRender={() => [
                    <Button
                        key="create"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setDrawerVisible(true)}
                    >
                        创建任务
                    </Button>,
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

                    // 处理常用筛选
                    const queryParams: any = { ...rest };
                    if (favoriteFilter === 'favorites') {
                        queryParams.is_favorite = true;
                    }

                    const res = await queryQueryTaskList({
                        page: current,
                        pageSize,
                        sort_field,
                        sort_order,
                        ...queryParams,
                    });
                    return {
                        data: res.data?.items || [],
                        success: res.code === 200,
                        total: res.data?.total || 0,
                    };
                }}
                columns={columns}
                scroll={{ x: 1200 }}
                pagination={{
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    defaultPageSize: 20,
                    showTotal: (total) => `共 ${total} 条记录`
                }}
                rowSelection={{
                    onChange: (keys) => {
                        setSelectedRowKeys(keys);
                    },
                    selectedRowKeys: selectedRowKeys,
                }}
            />

            <CreateTaskForm
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                onSubmit={handleCreateTask}
                loading={loading}
            />
        </PageContainer>
    );
};

export default QueryTaskPage; 