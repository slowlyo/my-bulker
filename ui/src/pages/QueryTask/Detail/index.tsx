import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, Tag, Space, Button, Spin, message, Tabs, Collapse, Tooltip } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useParams, history, useLocation } from '@umijs/max';
import { getQueryTaskDetail, getQueryTaskSQLExecutions, getQueryTaskSQLs } from '@/services/queryTask/QueryTaskController';
import { QueryTaskInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';
import ExecutionStats from './components/ExecutionStats';
import TargetDatabases from './components/TargetDatabases';
import TaskSQLs from './components/TaskSQLs';
import QueryResultTable from './components/QueryResultTable';
import QueryTaskBaseInfo from './components/QueryTaskBaseInfo';
import QueryProgressPanel from './components/QueryProgressPanel';
import QueryResultsPanel from './components/QueryResultsPanel';

const QueryTaskDetailPage: React.FC = () => {
    // hooks 顶层声明
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<QueryTaskInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(() => {
        const searchParams = new URLSearchParams(location.search);
        const tab = searchParams.get('tab');
        return tab && ['detail', 'progress', 'results'].includes(tab) ? tab : 'detail';
    });
    const [sqlExecutions, setSqlExecutions] = useState<any[]>([]);
    const [loadingExecutions, setLoadingExecutions] = useState(false);
    const [resultData, setResultData] = useState<any[]>([]);
    const [resultLoading, setResultLoading] = useState(false);
    const [activeSQL, setActiveSQL] = useState<any>(null); // 当前选中的SQL
    const [sqlList, setSqlList] = useState<any[]>([]); // 新增，保存带 schema 的 SQL 列表

    // hooks 逻辑
    useEffect(() => {
        setActiveTab(() => {
            const searchParams = new URLSearchParams(location.search);
            const tab = searchParams.get('tab');
            return tab && ['detail', 'progress', 'results'].includes(tab) ? tab : 'detail';
        });
    }, [location.search]);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        // 并行获取任务详情、SQL列表、SQL执行明细
        Promise.all([
            getQueryTaskDetail(parseInt(id!)),
            getQueryTaskSQLs(parseInt(id!)),
            getQueryTaskSQLExecutions(parseInt(id!)),
        ]).then(([detailRes, sqlsRes, execRes]) => {
            if (detailRes.code === 200) {
                setTask(detailRes.data);
            } else {
                message.error(detailRes.message || '获取任务详情失败');
            }
            if (sqlsRes.code === 200) {
                setSqlList(sqlsRes.data?.items || []);
            }
            if (execRes.code === 200) {
                setSqlExecutions(execRes.data || []);
            }
        }).catch(() => {
            message.error('获取任务数据失败');
        }).finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (activeTab === 'progress' && id) {
            setLoadingExecutions(true);
            getQueryTaskSQLExecutions(parseInt(id!)).then(res => {
                if (res.code === 200) {
                    setSqlExecutions(res.data || []);
                }
            }).finally(() => setLoadingExecutions(false));
        }
    }, [activeTab, id]);

    useEffect(() => {
        if (sqlExecutions.length > 0 && !activeSQL) {
            setActiveSQL(sqlExecutions[0]);
            fetchResultData(sqlExecutions[0]);
        }
        // eslint-disable-next-line
    }, [sqlExecutions]);

    // 状态映射
    const statusMap = {
        0: { text: '待执行', color: 'default' },
        1: { text: '执行中', color: 'processing' },
        2: { text: '已完成', color: 'success' },
        3: { text: '失败', color: 'error' },
    };

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

    const statusColor = (status: number) => {
        switch (status) {
            case 0: return '#d9d9d9'; // 待执行
            case 1: return '#1890ff'; // 执行中
            case 2: return '#52c41a'; // 成功
            case 3: return '#ff4d4f'; // 失败
            default: return '#d9d9d9';
        }
    };
    const statusText = (status: number) => {
        switch (status) {
            case 0: return '待执行';
            case 1: return '执行中';
            case 2: return '成功';
            case 3: return '失败';
            default: return '未知';
        }
    };

    // 获取结果数据的函数（需根据实际API调整）
    const fetchResultData = async (sql: any) => {
        setResultLoading(true);
        try {
            // 查找 schema
            const sqlWithSchema = sqlList.find((s) => s.id === sql.id);
            setActiveSQL({
                ...sql,
                result_table_schema: sqlWithSchema?.result_table_schema || '',
            });
            // ...加载数据
            setResultData([]);
        } finally {
            setResultLoading(false);
        }
    };

    const tabItems = [
        {
            key: 'detail',
            label: '任务详情',
            children: (
                <div>
                    <QueryTaskBaseInfo task={task} status={status} />
                    <TargetDatabases databases={task.databases} />
                    <TaskSQLs sqls={sqlList} />
                </div>
            ),
        },
        {
            key: 'progress',
            label: '查询进度',
            children: (
                <>
                    <ExecutionStats task={task} />
                    <QueryProgressPanel
                        task={task}
                        sqlExecutions={sqlExecutions}
                        loadingExecutions={loadingExecutions}
                        statusColor={statusColor}
                        statusText={statusText}
                    />
                </>
            ),
        },
        {
            key: 'results',
            label: '查询结果',
            children: (
                <QueryResultsPanel
                    sqlExecutions={sqlExecutions}
                    activeSQL={activeSQL}
                    setActiveSQL={setActiveSQL}
                    resultData={resultData}
                    resultLoading={resultLoading}
                    fetchResultData={fetchResultData}
                />
            ),
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
                        onClick={() => {
                            setLoading(true);
                            getQueryTaskDetail(parseInt(id!)).then(res => {
                                if (res.code === 200) {
                                    setTask(res.data);
                                } else {
                                    message.error(res.message || '获取任务详情失败');
                                }
                            }).catch(() => {
                                message.error('获取任务详情失败');
                            }).finally(() => setLoading(false));
                        }}
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
                onChange={(key) => {
                    setActiveTab(key);
                    // 更新地址栏参数
                    const searchParams = new URLSearchParams(location.search);
                    searchParams.set('tab', key);
                    history.replace({
                        pathname: location.pathname,
                        search: searchParams.toString(),
                    });
                }}
            />
        </PageContainer>
    );
};

export default QueryTaskDetailPage; 