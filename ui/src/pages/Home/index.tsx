import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Card, Col, Row, Tag, Button, Skeleton, Empty, Tooltip } from 'antd';
import {
    PlusOutlined,
    DatabaseOutlined,
    SyncOutlined,
    CloseCircleOutlined,
    StarFilled,
    ArrowRightOutlined,
    HistoryOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { getDashboardStats } from '@/services/dashboard/DashboardController';
import { DashboardStats, RecentTask } from '@/services/dashboard/typings';
import { formatDateTime } from '@/utils/format';

/**
 * 首页仪表盘页面，提供系统概览、快捷执行入口、任务状态指标及最近任务/收藏任务列表。
 */
const HomePage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * 异步拉取仪表盘汇总统计数据。
     */
    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await getDashboardStats();
                // 接口响应成功且存在数据时更新状态
                if (res.code === 200 && res.data) {
                    setStats(res.data);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('获取仪表盘统计数据失败:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    /**
     * 根据任务状态码返回对应的状态标签组件。
     * @param status 状态码
     */
    const renderStatusTag = (status: number) => {
        switch (status) {
            case 0:
                return (
                    <Tag icon={<ClockCircleOutlined />} className="m-0 text-xs px-2 py-0.5 border-none bg-neutral-100 text-neutral-600">
                        待执行
                    </Tag>
                );
            case 1:
                return (
                    <Tag icon={<SyncOutlined spin />} color="processing" className="m-0 text-xs px-2 py-0.5 border-none">
                        执行中
                    </Tag>
                );
            case 2:
                return (
                    <Tag icon={<CheckCircleOutlined />} color="success" className="m-0 text-xs px-2 py-0.5 border-none">
                        已完成
                    </Tag>
                );
            case 3:
                return (
                    <Tag icon={<CloseCircleOutlined />} color="error" className="m-0 text-xs px-2 py-0.5 border-none">
                        失败
                    </Tag>
                );
            default:
                return (
                    <Tag className="m-0 text-xs px-2 py-0.5 border-none bg-neutral-100 text-neutral-500">
                        未知
                    </Tag>
                );
        }
    };

    /**
     * 渲染任务列表项，支持整行悬浮高亮与点击直达任务详情。
     * @param task 任务简要信息
     */
    const renderTaskItem = (task: RecentTask) => (
        <div
            key={task.id}
            onClick={() => history.push(`/query-task/detail/${task.id}`)}
            className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all cursor-pointer"
        >
            <div className="flex flex-col gap-1 min-w-0 flex-1 pr-3">
                <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900 truncate">
                    {task.task_name}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                    创建时间: {formatDateTime(task.created_at)}
                </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {renderStatusTag(task.status)}
                <ArrowRightOutlined className="text-xs text-slate-300 group-hover:text-slate-600 transition-colors" />
            </div>
        </div>
    );

    return (
        <PageContainer ghost>
            <div className="flex flex-col gap-5 w-full">
                {/* 顶部欢迎与快捷操作横幅 */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1.5 max-w-xl">
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight m-0">
                            MySQL 批量查询工具
                        </h1>
                        <p className="text-xs text-slate-500 m-0 leading-relaxed">
                            统一纳管数据库实例，支持多实例、多库批量下发 SQL 查询，快速汇聚结果与排查业务数据。
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => history.push('/query-task?action=create')}
                        >
                            新建查询任务
                        </Button>
                        <Button
                            icon={<DatabaseOutlined />}
                            onClick={() => history.push('/instance')}
                        >
                            管理实例
                        </Button>
                    </div>
                </div>

                {/* 核心指标看板卡片 */}
                <Skeleton loading={loading} active paragraph={{ rows: 2 }}>
                    {stats && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* 实例指标 */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                                    <DatabaseOutlined className="text-base" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs text-slate-400 font-medium">实例总数</span>
                                    <span className="text-xl font-bold text-slate-800 font-mono tracking-tight">
                                        {stats.total_instances}
                                    </span>
                                </div>
                            </div>

                            {/* 任务指标 */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                                    <HistoryOutlined className="text-base" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs text-slate-400 font-medium">任务总数</span>
                                    <span className="text-xl font-bold text-slate-800 font-mono tracking-tight">
                                        {stats.task_summary.total}
                                    </span>
                                </div>
                            </div>

                            {/* 运行中指标 */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                                    <SyncOutlined spin={stats.task_summary.running > 0} className="text-base" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs text-slate-400 font-medium">执行中任务</span>
                                    <span className={`text-xl font-bold font-mono tracking-tight ${stats.task_summary.running > 0 ? 'text-blue-600' : 'text-slate-800'}`}>
                                        {stats.task_summary.running}
                                    </span>
                                </div>
                            </div>

                            {/* 失败任务指标 */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                                    <CloseCircleOutlined className="text-base" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs text-slate-400 font-medium">失败任务</span>
                                    <span className={`text-xl font-bold font-mono tracking-tight ${stats.task_summary.failed > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {stats.task_summary.failed}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </Skeleton>

                {/* 下半部分：双栏对齐展示最近任务与我的收藏 */}
                <Row gutter={16}>
                    {/* 左侧：最近查询任务 */}
                    <Col xs={24} lg={12}>
                        <Card
                            title="最近查询任务"
                            bordered={false}
                            styles={{ header: { fontWeight: 600, borderBottom: '1px solid #f1f5f9' }, body: { padding: '16px' } }}
                            className="border border-slate-200 rounded-xl shadow-xs h-full"
                            extra={
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => history.push('/query-task')}
                                    className="text-xs text-slate-500 hover:text-slate-800 p-0"
                                >
                                    查看全部
                                </Button>
                            }
                        >
                            <Skeleton loading={loading} active paragraph={{ rows: 4 }}>
                                {stats?.recent_tasks && stats.recent_tasks.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {stats.recent_tasks.map(renderTaskItem)}
                                    </div>
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无最近查询任务" />
                                )}
                            </Skeleton>
                        </Card>
                    </Col>

                    {/* 右侧：我的收藏 */}
                    <Col xs={24} lg={12}>
                        <Card
                            title={
                                <div className="flex items-center gap-1.5">
                                    <StarFilled className="text-amber-400 text-xs" />
                                    <span>我的收藏</span>
                                </div>
                            }
                            bordered={false}
                            styles={{ header: { fontWeight: 600, borderBottom: '1px solid #f1f5f9' }, body: { padding: '16px' } }}
                            className="border border-slate-200 rounded-xl shadow-xs h-full"
                            extra={
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => history.push('/query-task?filter=favorites')}
                                    className="text-xs text-slate-500 hover:text-slate-800 p-0"
                                >
                                    全部收藏
                                </Button>
                            }
                        >
                            <Skeleton loading={loading} active paragraph={{ rows: 4 }}>
                                {stats?.favorite_tasks && stats.favorite_tasks.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {stats.favorite_tasks.map(renderTaskItem)}
                                    </div>
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无收藏任务" />
                                )}
                            </Skeleton>
                        </Card>
                    </Col>
                </Row>
            </div>
        </PageContainer>
    );
};

export default HomePage;
