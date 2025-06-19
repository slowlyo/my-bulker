import React from 'react';
import { Card, Collapse, Space, Spin, Tooltip } from 'antd';

interface QueryProgressPanelProps {
    task: any;
    sqlExecutions: any[];
    loadingExecutions: boolean;
    statusColor: (status: number) => string;
    statusText: (status: number) => string;
}

const QueryProgressPanel: React.FC<QueryProgressPanelProps> = ({
    task,
    sqlExecutions,
    loadingExecutions,
    statusColor,
    statusText,
}) => (
    <div>
        {/* 执行统计卡片 */}
        {/* 复用原有 ExecutionStats 组件 */}
        {/* 这里直接在 index.tsx 里渲染 ExecutionStats，不在此组件内处理 */}
        <Card title="进度详情" style={{ marginBottom: 16 }}>
            {loadingExecutions ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    <Spin />
                </div>
            ) : sqlExecutions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    暂无进度数据
                </div>
            ) : (
                <Collapse 
                    defaultActiveKey={sqlExecutions.map(sql => String(sql.id))}
                    ghost
                    style={{ background: 'transparent' }}
                >
                    {sqlExecutions.map((sql, idx) => (
                        <Collapse.Panel
                            key={sql.id}
                            header={
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Space>
                                        <span style={{ color: '#1890ff', fontSize: 16, display: 'inline-flex', alignItems: 'center' }}>⚡</span>
                                        <span style={{ fontWeight: '500' }}>SQL #{sql.sql_order}</span>
                                    </Space>
                                    <Space size="small">
                                        <span style={{ fontSize: '12px', color: '#666' }}>
                                            共 {sql.executions.length} 个数据库
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#52c41a' }}>
                                            已完成: {sql.executions.filter((e:any)=>e.status===2).length}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#ff4d4f' }}>
                                            失败: {sql.executions.filter((e:any)=>e.status===3).length}
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
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{
                                    fontSize: '12px',
                                    color: '#666',
                                    marginBottom: '6px',
                                    fontWeight: '500'
                                }}>
                                    SQL内容:
                                </div>
                                <div style={{
                                    background: '#f8f9fa',
                                    border: '1px solid #e8e8e8',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                    fontSize: '13px',
                                    lineHeight: '1.5',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    maxHeight: '120px',
                                    overflow: 'auto',
                                    marginBottom: '8px'
                                }}>
                                    {sql.sql_content}
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                            }}>
                                {sql.executions.map((exec: any) => (
                                    <div
                                        key={exec.id}
                                        style={{
                                            width: '160px',
                                            minHeight: '60px',
                                            background: exec.status === 3 ? '#fff1f0' : exec.status === 2 ? '#f6ffed' : '#fff',
                                            border: `1px solid ${statusColor(exec.status)}`,
                                            borderRadius: '8px',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                            padding: '8px 10px',
                                            fontSize: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'flex-start',
                                            position: 'relative',
                                        }}
                                    >
                                        <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{exec.database_name}</div>
                                        <div style={{ fontSize: 11, color: '#888', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{exec.instance_name || '-'}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <span style={{ color: statusColor(exec.status), fontWeight: 500, fontSize: '12px' }}>{statusText(exec.status)}</span>
                                            {exec.status === 3 && exec.error_message && (
                                                <Tooltip title={exec.error_message}>
                                                    <span style={{ color: '#ff4d4f', marginLeft: 4, cursor: 'pointer', fontSize: '13px' }}>❗</span>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Collapse.Panel>
                    ))}
                </Collapse>
            )}
        </Card>
    </div>
);

export default QueryProgressPanel; 