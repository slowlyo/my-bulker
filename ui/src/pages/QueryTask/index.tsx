import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Space, Button, message } from 'antd';
import { useRef, useState } from 'react';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { queryQueryTaskList, createQueryTask } from '@/services/queryTask/QueryTaskController';
import { QueryTaskInfo, CreateQueryTaskRequest } from '@/services/queryTask/typings';
import CreateTaskForm from './components/CreateTaskForm';
import { history } from '@umijs/max';

const QueryTaskPage: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [loading, setLoading] = useState(false);

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

    const columns: ProColumns<QueryTaskInfo>[] = [
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
            render: (_, record) => (
                <Space direction="vertical" size="small">
                    <span>总数: {record.total_dbs}</span>
                    <span className='text-green-500'>已完成: {record.completed_dbs}</span>
                    <span className='text-red-500'>失败: {record.failed_dbs}</span>
                </Space>
            ),
        },
        {
            title: 'SQL统计',
            dataIndex: 'total_sqls',
            hideInSearch: true,
            width: 120,
            render: (_, record) => (
                <Space direction="vertical" size="small">
                    <span>总数: {record.total_sqls}</span>
                    <span className='text-green-500'>已完成: {record.completed_sqls}</span>
                    <span className='text-red-500'>失败: {record.failed_sqls}</span>
                </Space>
            ),
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
        <PageContainer ghost>
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
                    
                    const res = await queryQueryTaskList({
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
                scroll={{ x: 1200 }}
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