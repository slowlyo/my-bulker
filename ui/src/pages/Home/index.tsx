import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Card, Col, Row, Statistic, Spin, List, Tag, Button, Space, Typography, Skeleton } from 'antd';
import { PlusOutlined, DatabaseOutlined, SyncOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getDashboardStats } from '@/services/dashboard/DashboardController';
import { DashboardStats } from '@/services/dashboard/typings';
import { formatDateTime } from '@/utils/format';

const HomePage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await getDashboardStats();
                if (res.code === 200) {
                    setStats(res.data);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statusMap: { [key: number]: { text: string; color: string } } = {
        0: { text: '待执行', color: 'default' },
        1: { text: '执行中', color: 'processing' },
        2: { text: '已完成', color: 'success' },
        3: { text: '失败', color: 'error' },
    };

    const renderStatusTag = (status: number) => {
        const statusInfo = statusMap[status] || { text: '未知', color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
    };

    return (
        <PageContainer ghost>
            <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                <Card>
                    <Typography.Title level={2} style={{ marginTop: 0 }}>
                        欢迎使用 MySQL 批量查询工具
                    </Typography.Title>
                    <Typography.Paragraph>
                        在这里，您可以轻松管理数据库实例，并对多个数据库同时执行SQL查询任务，极大地提升工作效率。
                    </Typography.Paragraph>
                    <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => history.push('/query-task?action=create')}>
                            新建查询任务
                        </Button>
                        <Button icon={<DatabaseOutlined />} onClick={() => history.push('/instance')}>
                            管理实例
                        </Button>
                    </Space>
                </Card>

                <Skeleton loading={loading} active paragraph={{ rows: 4 }}>
                    {stats && (
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={6}>
                                <Card>
                                    <Statistic title="实例总数" value={stats.total_instances} prefix={<DatabaseOutlined />} />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card>
                                    <Statistic title="任务总数" value={stats.task_summary.total} />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card>
                                    <Statistic
                                        title="执行中"
                                        value={stats.task_summary.running}
                                        valueStyle={{ color: '#1890ff' }}
                                        prefix={<SyncOutlined spin={stats.task_summary.running > 0} />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card>
                                    <Statistic
                                        title="失败任务"
                                        value={stats.task_summary.failed}
                                        valueStyle={{ color: '#cf1322' }}
                                        prefix={<CloseCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    )}
                </Skeleton>

                <Card title="最近查询任务">
                    <Skeleton loading={loading} active avatar paragraph={{ rows: 5 }}>
                        <List
                            itemLayout="horizontal"
                            dataSource={stats?.recent_tasks}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[<a key="details" onClick={() => history.push(`/query-task/detail/${item.id}`)}>查看详情</a>]}
                                >
                                    <List.Item.Meta
                                        title={<a onClick={() => history.push(`/query-task/detail/${item.id}`)}>{item.task_name}</a>}
                                        description={`创建于: ${formatDateTime(item.created_at)}`}
                                    />
                                    {renderStatusTag(item.status)}
                                </List.Item>
                            )}
                        />
                    </Skeleton>
                </Card>

                <Card title="我的收藏" extra={<a onClick={() => history.push('/query-task?filter=favorites')}>全部收藏</a>}>
                    <Skeleton loading={loading} active avatar paragraph={{ rows: 5 }}>
                        <List
                            itemLayout="horizontal"
                            dataSource={stats?.favorite_tasks}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[<a key="details" onClick={() => history.push(`/query-task/detail/${item.id}`)}>查看详情</a>]}
                                >
                                    <List.Item.Meta
                                        title={<a onClick={() => history.push(`/query-task/detail/${item.id}`)}>{item.task_name}</a>}
                                        description={`创建于: ${formatDateTime(item.created_at)}`}
                                    />
                                    {renderStatusTag(item.status)}
                                </List.Item>
                            )}
                            locale={{ emptyText: '暂无收藏任务' }}
                        />
                    </Skeleton>
                </Card>
            </Space>
        </PageContainer>
    );
};

export default HomePage;
