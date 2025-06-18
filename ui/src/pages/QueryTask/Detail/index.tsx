import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, Tag, Space, Button, Spin, message, Tabs } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useParams, history, useLocation } from '@umijs/max';
import { getQueryTaskDetail } from '@/services/queryTask/QueryTaskController';
import { QueryTaskInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';
import ExecutionStats from './components/ExecutionStats';
import TargetDatabases from './components/TargetDatabases';
import TaskSQLs from './components/TaskSQLs';

const QueryTaskDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<QueryTaskInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    // 从地址栏参数获取当前tab
    const getCurrentTab = () => {
        const searchParams = new URLSearchParams(location.search);
        const tab = searchParams.get('tab');
        return tab && ['detail', 'progress', 'results'].includes(tab) ? tab : 'detail';
    };

    const [activeTab, setActiveTab] = useState(getCurrentTab);

    // 处理tab切换
    const handleTabChange = (key: string) => {
        setActiveTab(key);
        // 更新地址栏参数
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('tab', key);
        history.replace({
            pathname: location.pathname,
            search: searchParams.toString(),
        });
    };

    // 监听地址栏参数变化
    useEffect(() => {
        setActiveTab(getCurrentTab());
    }, [location.search]);

    // 状态映射
    const statusMap = {
        0: { text: '待执行', color: 'default' },
        1: { text: '执行中', color: 'processing' },
        2: { text: '已完成', color: 'success' },
        3: { text: '失败', color: 'error' },
    };

    // 加载任务详情
    const loadTaskDetail = async () => {
        if (!id) return;
        
        setLoading(true);
        try {
            const res = await getQueryTaskDetail(parseInt(id));
            if (res.code === 200) {
                setTask(res.data);
            } else {
                message.error(res.message || '获取任务详情失败');
            }
        } catch (error) {
            message.error('获取任务详情失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTaskDetail();
    }, [id]);

    // 返回列表页
    const handleBack = () => {
        history.push('/query-task');
    };

    if (loading) {
        return (
            <PageContainer ghost>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" />
                </div>
            </PageContainer>
        );
    }

    if (!task) {
        return (
            <PageContainer ghost>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <p>任务不存在或已被删除</p>
                    <Button type="primary" onClick={handleBack}>
                        返回列表
                    </Button>
                </div>
            </PageContainer>
        );
    }

    const status = statusMap[task.status as keyof typeof statusMap];

    // 任务详情标签页内容
    const taskDetailContent = (
        <div>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
                <Descriptions column={2} bordered>
                    <Descriptions.Item label="任务名称">
                        <strong>{task.task_name}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="任务状态">
                        <Tag color={status.color}>{status.text}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="任务描述" span={2}>
                        {task.description || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                        {formatDateTime(task.created_at)}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                        {formatDateTime(task.updated_at)}
                    </Descriptions.Item>
                    <Descriptions.Item label="开始时间">
                        {formatDateTime(task.started_at)}
                    </Descriptions.Item>
                    <Descriptions.Item label="完成时间">
                        {formatDateTime(task.completed_at)}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            <TargetDatabases databases={task.databases} />

            <TaskSQLs taskId={task.id} />
        </div>
    );

    // 查询进度标签页内容
    const queryProgressContent = (
        <div>
            <ExecutionStats task={task} />
            
            <Card title="进度详情" style={{ marginBottom: 16 }}>
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    查询进度详情功能开发中...
                </div>
            </Card>
        </div>
    );

    // 查询结果标签页内容
    const queryResultsContent = (
        <div>
            <Card title="查询结果" style={{ marginBottom: 16 }}>
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    查询结果功能开发中...
                </div>
            </Card>
        </div>
    );

    const tabItems = [
        {
            key: 'detail',
            label: '任务详情',
            children: taskDetailContent,
        },
        {
            key: 'progress',
            label: '查询进度',
            children: queryProgressContent,
        },
        {
            key: 'results',
            label: '查询结果',
            children: queryResultsContent,
        },
    ];

    return (
        <PageContainer
            ghost
            header={{
                title: '任务详情',
                onBack: handleBack,
                extra: [
                    <Button
                        key="refresh"
                        icon={<ReloadOutlined />}
                        onClick={loadTaskDetail}
                    >
                        刷新
                    </Button>,
                ],
            }}
        >
            <Tabs 
                defaultActiveKey="detail" 
                items={tabItems}
                style={{ marginTop: 16 }}
                activeKey={activeTab}
                onChange={handleTabChange}
            />
        </PageContainer>
    );
};

export default QueryTaskDetailPage; 