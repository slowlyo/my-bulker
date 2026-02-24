import React from 'react';
import { Card, Collapse, Tag, Space, Row, Col, Typography, Divider, Spin, Tooltip } from 'antd';
import { CodeOutlined, DatabaseOutlined, ClockCircleOutlined, InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClusterOutlined } from '@ant-design/icons';
import { QueryTaskSQLInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';

const { Panel } = Collapse;
const { Text } = Typography;

interface TaskSQLsProps {
    sqls: QueryTaskSQLInfo[];
    sqlExecutions?: any[];
    loading?: boolean;
    statusColor?: (status: number) => string;
}

const TaskSQLs: React.FC<TaskSQLsProps> = ({ sqls, sqlExecutions, loading, statusColor }) => {
    if (!sqls || sqls.length === 0) {
        return (
            <Card title="SQL语句" style={{ marginBottom: 16 }}>
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    暂无SQL语句
                </div>
            </Card>
        );
    }

    return (
        <Card 
            title={
                <Space>
                    <span>SQL语句</span>
                    <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 'normal' }}>
                        (共 {sqls.length} 条，按执行顺序排列)
                    </span>
                </Space>
            } 
            size="small" 
            style={{ marginBottom: 16 }}
        >
            <Collapse 
                defaultActiveKey={sqls.map((_, idx) => String(idx))} 
                ghost
                style={{ background: 'transparent', padding: 0 }}
                items={sqls.map((sql, index) => ({
                    key: String(index),
                    label: (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                            <Space size="middle">
                                <Space size={4}>
                                    <CodeOutlined style={{ color: '#1890ff' }} />
                                    <span style={{ fontWeight: '500', fontSize: '14px', color: '#1f2937' }}>
                                        #{sql.sql_order}
                                    </span>
                                </Space>
                                <Space size={4} style={{ color: '#4b5563', fontSize: '13px' }}>
                                    <Tag color="blue" style={{ margin: 0, border: 'none' }}>{sql.result_table_name}</Tag>
                                </Space>
                            </Space>
                            <Space size="large">
                                <Space size={4} style={{ fontSize: '13px', color: '#6b7280' }}>
                                    <DatabaseOutlined /> {sql.total_dbs} 个库
                                </Space>
                                <Space size={4} style={{ fontSize: '13px' }}>
                                    <span style={{ color: sql.completed_dbs === sql.total_dbs ? '#10b981' : '#6b7280' }}>✓ {sql.completed_dbs}</span>
                                    {sql.failed_dbs > 0 && <span style={{ color: '#ef4444' }}>✗ {sql.failed_dbs}</span>}
                                </Space>
                                <span style={{ fontSize: '12px', color: '#9ca3af', width: '130px', textAlign: 'right' }}>
                                    {sql.started_at ? formatDateTime(sql.started_at) : '-'}
                                </span>
                            </Space>
                        </div>
                    ),
                    style: {
                        marginBottom: '8px',
                        borderBottom: '1px solid #f3f4f6',
                    },
                    children: (
                        <div style={{ padding: '0 0 12px 24px' }}>
                            <div style={{
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                padding: '8px 12px',
                                fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                                fontSize: '12px',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                maxHeight: '200px',
                                overflow: 'auto',
                                color: '#374151'
                            }}>
                                {sql.sql_content}
                            </div>

                            {/* 追加数据库进度区块，按实例分组 */}
                            {(() => {
                                const execData = sqlExecutions?.find((e: any) => e.id === sql.id);
                                if (loading) return <div style={{ textAlign: 'center', padding: '16px' }}><Spin size="small" /></div>;
                                if (!execData || !execData.executions || execData.executions.length === 0) return null;

                                // 按实例名称分组
                                const groupedExecs = execData.executions.reduce((acc: any, exec: any) => {
                                    const inst = exec.instance_name || '未知实例';
                                    if (!acc[inst]) acc[inst] = [];
                                    acc[inst].push(exec);
                                    return acc;
                                }, {});

                                return (
                                    <div style={{ marginTop: '16px' }}>
                                        {Object.entries(groupedExecs).map(([instanceName, execs]: [string, any]) => (
                                            <div key={instanceName} style={{ marginBottom: '16px' }}>
                                                <div style={{
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    color: '#374151',
                                                    marginBottom: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}>
                                                    <ClusterOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
                                                    {instanceName}
                                                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '6px', fontWeight: 'normal' }}>
                                                        ({execs.length}个库)
                                                    </span>
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                                    gap: '8px'
                                                }}>
                                                    {execs.map((exec: any) => {
                                                        const statusIcon = (status: number) => {
                                                            switch (status) {
                                                                case 2: return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
                                                                case 3: return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
                                                                case 1: return <LoadingOutlined style={{ color: '#1890ff' }} spin />;
                                                                case 0: return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
                                                                default: return null;
                                                            }
                                                        };
                                                        const borderColor = statusColor ? statusColor(exec.status) : (exec.status === 3 ? '#ff4d4f' : exec.status === 2 ? '#b7eb8f' : '#d9d9d9');
                                                        const bgColor = exec.status === 3 ? '#fff1f0' : exec.status === 2 ? '#f6ffed' : '#fff';
                                                        const cardContent = (
                                                            <div
                                                                key={exec.id}
                                                                style={{
                                                                    background: bgColor,
                                                                    border: `1px solid ${borderColor}`,
                                                                    borderRadius: '6px',
                                                                    padding: '6px 8px',
                                                                    fontSize: '11px',
                                                                    position: 'relative',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    overflow: 'hidden'
                                                                }}
                                                            >
                                                                <div style={{ position: 'absolute', top: 6, right: 6 }}>
                                                                    {statusIcon(exec.status)}
                                                                </div>
                                                                <div style={{ fontWeight: 500, fontSize: '12px', color: '#1f2937', paddingRight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {exec.database_name}
                                                                </div>
                                                            </div>
                                                        );
                                                        return exec.status === 3 && exec.error_message ? (
                                                            <Tooltip title={exec.error_message} placement="top" key={exec.id}>
                                                                {cardContent}
                                                            </Tooltip>
                                                        ) : cardContent;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    )
                }))}
            />
        </Card>
    );
};

export default TaskSQLs; 