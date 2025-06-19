import React from 'react';
import { Card, Collapse, Tag, Space } from 'antd';
import { CodeOutlined, DatabaseOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { QueryTaskSQLInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';

const { Panel } = Collapse;

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
                defaultActiveKey={['0']} 
                ghost
                style={{ background: 'transparent' }}
            >
                {sqls.map((sql, index) => (
                    <Panel
                        key={index}
                        header={
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
                        }
                        style={{ 
                            marginBottom: '8px',
                            border: '1px solid #e8e8e8',
                            borderRadius: '8px',
                            background: '#fff'
                        }}
                    >
                        <div style={{ padding: '16px 0' }}>
                            {/* SQL内容 */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ 
                                    fontSize: '12px', 
                                    color: '#666', 
                                    marginBottom: '8px',
                                    fontWeight: '500'
                                }}>
                                    SQL内容:
                                </div>
                                <div style={{
                                    background: '#f8f9fa',
                                    border: '1px solid #e8e8e8',
                                    borderRadius: '4px',
                                    padding: '12px',
                                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                    fontSize: '13px',
                                    lineHeight: '1.5',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    maxHeight: '200px',
                                    overflow: 'auto'
                                }}>
                                    {sql.sql_content}
                                </div>
                            </div>

                            {/* 执行信息 */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                gap: '12px',
                                fontSize: '12px'
                            }}>
                                <div style={{ 
                                    border: '1px solid #e8e8e8', 
                                    borderRadius: '4px', 
                                    padding: '8px',
                                    background: '#fafafa'
                                }}>
                                    <div style={{ color: '#666', marginBottom: '4px' }}>
                                        <ClockCircleOutlined style={{ marginRight: '4px' }} />
                                        开始时间
                                    </div>
                                    <div style={{ color: '#262626' }}>
                                        {formatDateTime(sql.started_at)}
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    border: '1px solid #e8e8e8', 
                                    borderRadius: '4px', 
                                    padding: '8px',
                                    background: '#fafafa'
                                }}>
                                    <div style={{ color: '#666', marginBottom: '4px' }}>
                                        <ClockCircleOutlined style={{ marginRight: '4px' }} />
                                        完成时间
                                    </div>
                                    <div style={{ color: '#262626' }}>
                                        {formatDateTime(sql.completed_at)}
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    border: '1px solid #e8e8e8', 
                                    borderRadius: '4px', 
                                    padding: '8px',
                                    background: '#fafafa'
                                }}>
                                    <div style={{ color: '#666', marginBottom: '4px' }}>
                                        <DatabaseOutlined style={{ marginRight: '4px' }} />
                                        结果表名
                                    </div>
                                    <div style={{ color: '#262626', fontFamily: 'monospace' }}>
                                        {sql.result_table_name}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Panel>
                ))}
            </Collapse>
            
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