import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, Tag, Space, Button, Spin, message, Tabs, Collapse, Tooltip, Row, Col } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useParams, history, useLocation } from '@umijs/max';
import { getQueryTaskDetail, getQueryTaskSQLExecutions, getQueryTaskSQLs, runQueryTask, getQueryTaskSQLResult } from '@/services/queryTask/QueryTaskController';
import { QueryTaskInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';
import ExecutionStats from './components/ExecutionStats';
import TaskSQLs from './components/TaskSQLs';
import QueryTaskBaseInfo from './components/QueryTaskBaseInfo';
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
        return tab && ['detail', 'results'].includes(tab) ? tab : 'detail';
    });
    const [sqlExecutions, setSqlExecutions] = useState<any[]>([]);
    const [resultData, setResultData] = useState<any[]>([]);
    const [resultLoading, setResultLoading] = useState(false);
    const [activeSQL, setActiveSQL] = useState<any>(null); // 当前选中的SQL
    const [sqlList, setSqlList] = useState<any[]>([]); // 新增，保存带 schema 的 SQL 列表
    const resultsPanelRef = useRef<any>();
    const [stats, setStats] = useState<any>(null);
    const firstLoading = useRef(true);
    const [runBtnLoading, setRunBtnLoading] = useState(false);

    // hooks 逻辑
    useEffect(() => {
        setActiveTab(() => {
            const searchParams = new URLSearchParams(location.search);
            const tab = searchParams.get('tab');
            return tab && ['detail', 'results'].includes(tab) ? tab : 'detail';
        });
    }, [location.search]);

    // 获取结果数据的函数（对接API）
    const fetchResultData = async (sql: any, page: number = 1, pageSize: number = 20) => {
        setResultLoading(true);
        try {
            // 查找 schema
            const sqlWithSchema = sqlList.find((s) => s.id === sql.id);
            setActiveSQL({
                ...sql,
                result_table_schema: sqlWithSchema?.result_table_schema || '',
            });
            // 查询结果表数据
            const res = await getQueryTaskSQLResult(sql.id, { page, page_size: pageSize });
            if (res.code === 200) {
                setResultData(res.data?.items || []);
            } else {
                setResultData([]);
                message.error(res.message || '查询结果加载失败');
            }
        } catch {
            setResultData([]);
            message.error('查询结果加载失败');
        } finally {
            setResultLoading(false);
        }
    };

    // 公共加载方法
    const loadAllData = async (isFirst = false) => {
        if (isFirst) setLoading(true);
        try {
            const [detailRes, sqlsRes, execRes, statsRes] = await Promise.all([
                getQueryTaskDetail(parseInt(id!)),
                getQueryTaskSQLs(parseInt(id!)),
                getQueryTaskSQLExecutions(parseInt(id!)),
                fetch(`/api/query-tasks/${id}/execution-stats`).then(r => r.json()),
            ]);
            if (detailRes.code === 200) setTask(detailRes.data);
            else message.error(detailRes.message || '获取任务详情失败');
            if (sqlsRes.code === 200) setSqlList(sqlsRes.data?.items || []);
            if (execRes.code === 200) setSqlExecutions(execRes.data || []);
            if (statsRes.code === 200) setStats(statsRes.data);
        } catch {
            message.error('获取任务数据失败');
        } finally {
            if (isFirst) setLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        firstLoading.current = true;
        loadAllData(true).then(() => { firstLoading.current = false; });
    }, [id]);

    // 自动执行：任务处于待执行状态时，自动触发运行，无需用户手动点击。
    const autoRunTriggered = useRef(false);
    useEffect(() => {
        if (!task || task.status !== 0 || autoRunTriggered.current) return;
        autoRunTriggered.current = true;
        runQueryTask(parseInt(id!)).then((res) => {
            if (res.code === 200) {
                loadAllData(false);
            }
        });
    }, [task?.status, id]);

    // 轮询逻辑：查询中每1秒刷新一次
    useEffect(() => {
        if (!task || task.status !== 1) return;
        const timer = setInterval(() => {
            loadAllData(false);
        }, 1000);
        return () => clearInterval(timer);
    }, [task && task.status]);

    // 状态变为已完成时弹出提示
    const prevStatusRef = useRef<number | undefined>();
    useEffect(() => {
        if (prevStatusRef.current === 1 && task && task.status === 2) {
            message.success('任务已完成');
        }
        prevStatusRef.current = task?.status;
    }, [task?.status]);



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

    // 切换到查询结果页签并更新地址栏参数
    const handleSwitchToResults = () => {
        setActiveTab('results');
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('tab', 'results');
        history.replace({
            pathname: location.pathname,
            search: searchParams.toString(),
        });
    };

    const tabItems = [
        {
            key: 'detail',
            label: '任务概览',
            children: (
                <div className="flex flex-col gap-4">
                    <QueryTaskBaseInfo task={task} status={status} />

                    {/* 任务执行完成时提供直达结果表的快捷跳转引导 */}
                    {task.status === 2 && (
                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3 px-4 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-2 text-xs text-emerald-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>查询任务已执行完成，结果数据表已就绪</span>
                            </div>
                            <Button
                                type="link"
                                size="small"
                                onClick={handleSwitchToResults}
                                className="text-xs text-emerald-700 font-medium hover:text-emerald-900 p-0"
                            >
                                前往查看查询结果 →
                            </Button>
                        </div>
                    )}

                    {stats && <ExecutionStats stats={stats} />}

                    <TaskSQLs 
                        sqls={sqlList} 
                        sqlExecutions={sqlExecutions}
                        loading={loading}
                        statusColor={statusColor}
                    />
                </div>
            ),
        },
        {
            key: 'results',
            label: `查询结果${sqlList.length > 0 ? ` (${sqlList.length})` : ''}`,
            children: (
                <QueryResultsPanel sqls={sqlList} ref={resultsPanelRef} />
            ),
        },
    ];

    return (
        <PageContainer
            ghost
            header={{
                title: (
                    <div className="flex items-center gap-3">
                        <span>任务详情</span>
                        <Tag color={status.color} className="m-0 border-none px-2.5 py-0.5 text-xs font-normal">
                            {status.text}
                        </Tag>
                    </div>
                ),
                onBack: handleBack,
                extra: [
                    <Button
                        key="refresh"
                        icon={<ReloadOutlined spin={loading || task.status === 1} />}
                        disabled={loading}
                        onClick={async () => {
                            await loadAllData();
                            // 当前位于结果页签时同步触发表格刷新
                            if (activeTab === 'results') {
                                resultsPanelRef.current?.refresh();
                            }
                        }}
                    >
                        刷新
                    </Button>,
                    <Button
                        key="run"
                        type="primary"
                        disabled={task.status === 1}
                        loading={runBtnLoading}
                        onClick={async () => {
                            // 无有效任务 ID 时拦截
                            if (!id) return;
                            setRunBtnLoading(true);
                            try {
                                const res = await runQueryTask(parseInt(id!));
                                if (res.code === 200) {
                                    message.success(res.message || '任务已开始执行');
                                    setActiveTab('detail');
                                    await loadAllData(false);
                                } else {
                                    message.error(res.message || '任务启动失败');
                                }
                            } catch {
                                message.error('任务启动失败');
                            } finally {
                                setRunBtnLoading(false);
                            }
                        }}
                    >
                        {task.status === 2 ? '再次查询' : task.status === 0 ? '开始查询' : task.status === 3 ? '重新查询' : '查询中...'}
                    </Button>,
                ],
            }}
        >
            <Tabs 
                defaultActiveKey="detail" 
                items={tabItems}
                activeKey={activeTab}
                style={{ marginTop: 4 }}
                tabBarStyle={{ 
                    marginBottom: 16,
                    paddingLeft: 2,
                    borderBottom: '1px solid #f0f0f0' 
                }}
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