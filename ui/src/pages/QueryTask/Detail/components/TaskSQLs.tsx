import React from 'react';
import { Card, Collapse, Tag, Space, Row, Col, Typography, Divider } from 'antd';
import { CodeOutlined, DatabaseOutlined, ClockCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { QueryTaskSQLInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';

const { Panel } = Collapse;
const { Text } = Typography;

interface TaskSQLsProps {
    sqls: QueryTaskSQLInfo[];
}

const TaskSQLs: React.FC<TaskSQLsProps> = ({ sqls }) => {
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
        <Card title="SQL语句" style={{ marginBottom: 16 }}>
            <Collapse 
                defaultActiveKey={sqls.map((_, idx) => String(idx))} 
                ghost
                style={{ background: 'transparent' }}
                items={sqls.map((sql, index) => ({
                    key: String(index),
                    label: (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Space>
                                <CodeOutlined style={{ color: '#1890ff' }} />
                                <span style={{ fontWeight: '500' }}>
                                    SQL #{sql.sql_order}
                                </span>
                                <Tag color="blue">{sql.result_table_name}</Tag>
                            </Space>
                            <Space size="small">
                                <span style={{ fontSize: '12px', color: '#666' }}>
                                    <DatabaseOutlined style={{ marginRight: '4px' }} />
                                    {sql.total_dbs} 个数据库
                                </span>
                                <span style={{ fontSize: '12px', color: '#52c41a' }}>
                                    已完成: {sql.completed_dbs}
                                </span>
                                <span style={{ fontSize: '12px', color: '#ff4d4f' }}>
                                    失败: {sql.failed_dbs}
                                </span>
                            </Space>
                        </div>
                    ),
                    style: {
                        marginBottom: '16px',
                        border: '1px solid #e8e8e8',
                        borderRadius: '8px',
                        background: '#fff'
                    },
                    children: (
                        <div style={{ padding: '8px 0' }}>
                            <Row gutter={24}>
                                <Col span={16}>
                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: '#8c8c8c', 
                                        marginBottom: '8px',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        <CodeOutlined style={{ marginRight: '4px' }} />
                                        SQL 内容
                                    </div>
                                    <div style={{
                                        background: '#f5f5f5',
                                        border: '1px solid #f0f0f0',
                                        borderRadius: '6px',
                                        padding: '12px',
                                        fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                                        fontSize: '13px',
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        maxHeight: '300px',
                                        overflow: 'auto',
                                        color: '#1f1f1f'
                                    }}>
                                        {sql.sql_content}
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: '#8c8c8c', 
                                        marginBottom: '8px',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        <InfoCircleOutlined style={{ marginRight: '4px' }} />
                                        执行详情
                                    </div>
                                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                        <div style={{ background: '#fafafa', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                                            <div style={{ color: '#8c8c8c', fontSize: '11px', marginBottom: '4px' }}>结果表名</div>
                                            <Text code style={{ fontSize: '12px' }}>{sql.result_table_name}</Text>
                                        </div>
                                        <div style={{ background: '#fafafa', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                                            <div style={{ color: '#8c8c8c', fontSize: '11px', marginBottom: '4px' }}>开始时间</div>
                                            <div style={{ fontSize: '12px', color: '#262626' }}>{formatDateTime(sql.started_at)}</div>
                                        </div>
                                        <div style={{ background: '#fafafa', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                                            <div style={{ color: '#8c8c8c', fontSize: '11px', marginBottom: '4px' }}>完成时间</div>
                                            <div style={{ fontSize: '12px', color: '#262626' }}>{formatDateTime(sql.completed_at)}</div>
                                        </div>
                                    </Space>
                                </Col>
                            </Row>
                        </div>
                    )
                }))}
            />
            
            <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: '#f8f9fa', 
                borderRadius: '8px',
                fontSize: '12px',
                color: '#666'
            }}>
                <Space>
                    <span>总计: {sqls.length} 条SQL语句</span>
                    <span>•</span>
                    <span>按执行顺序排列</span>
                </Space>
            </div>
        </Card>
    );
};

export default TaskSQLs; 