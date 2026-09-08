import React from 'react';
import { Card, Collapse, Tag, Space, Row, Col, Typography, Divider, Spin, Tooltip, Button, message } from 'antd';
import { CodeOutlined, DatabaseOutlined, ClockCircleOutlined, InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClusterOutlined, CopyOutlined } from '@ant-design/icons';
import { QueryTaskSQLInfo } from '@/services/queryTask/typings';
import { formatDateTime } from '@/utils/format';
import Editor from '@monaco-editor/react';

const { Panel } = Collapse;
const { Text } = Typography;

interface TaskSQLsProps {
    sqls: QueryTaskSQLInfo[];
    sqlExecutions?: any[];
    loading?: boolean;
    statusColor?: (status: number) => string;
}

/**
 * 根据 SQL 代码行数自适应计算 Monaco 编辑器展示高度，避免空白过多或过度压缩。
 * @param content SQL 文本内容
 * @returns 像素高度
 */
const getSqlEditorHeight = (content: string): number => {
    // 空内容兜底为 60px
    if (!content) {
        return 60;
    }
    const lineCount = content.split('\n').length;
    // 单行行高 20px 叠加基础内边距，高度区间限制在 64px 至 260px 之间
    return Math.min(Math.max(lineCount * 20 + 16, 64), 260);
};

/**
 * 任务 SQL 列表与数据库执行进度面板，按 SQL 顺序展开展示各数据库的执行状态与详细信息。
 * @param props 组件属性
 */
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
                    label: (() => {
                        const pendingDbs = sql.total_dbs - sql.completed_dbs - sql.failed_dbs;
                        const allSuccess = sql.failed_dbs === 0 && pendingDbs === 0;
                        return (
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
                                <Space size="middle" align="center">
                                    {/* 进度条 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: '100px' }}>
                                        <div style={{
                                            flex: sql.completed_dbs,
                                            height: 4,
                                            borderRadius: '2px 0 0 2px',
                                            background: allSuccess ? '#52c41a' : '#1890ff',
                                            borderTopRightRadius: sql.failed_dbs > 0 ? 0 : (pendingDbs > 0 ? 0 : 2),
                                            borderBottomRightRadius: sql.failed_dbs > 0 ? 0 : (pendingDbs > 0 ? 0 : 2),
                                        }} />
                                        {sql.failed_dbs > 0 && (
                                            <div style={{
                                                flex: sql.failed_dbs,
                                                height: 4,
                                                background: '#ff4d4f',
                                                borderRadius: sql.completed_dbs === 0 ? (pendingDbs > 0 ? '2px 0 0 2px' : 2) : 0,
                                            }} />
                                        )}
                                        {pendingDbs > 0 && (
                                            <div style={{
                                                flex: pendingDbs,
                                                height: 4,
                                                background: '#e5e7eb',
                                                borderRadius: (sql.completed_dbs === 0 && sql.failed_dbs === 0) ? 2 : '0 2px 2px 0',
                                            }} />
                                        )}
                                    </div>
                                    <Space size={4} style={{ fontSize: '13px', color: '#6b7280' }}>
                                        <DatabaseOutlined /> {sql.total_dbs}
                                    </Space>
                                    <Space size={4} style={{ fontSize: '13px' }}>
                                        <span style={{ color: allSuccess ? '#10b981' : '#1890ff' }}>✓ {sql.completed_dbs}</span>
                                        {sql.failed_dbs > 0 && <span style={{ color: '#ef4444' }}>✗ {sql.failed_dbs}</span>}
                                    </Space>
                                    <span style={{ fontSize: '12px', color: '#9ca3af', width: '130px', textAlign: 'right' }}>
                                        {sql.started_at ? formatDateTime(sql.started_at) : '-'}
                                    </span>
                                </Space>
                            </div>
                        );
                    })(),
                    style: {
                        marginBottom: '8px',
                        borderBottom: '1px solid #f1f5f9',
                    },
                    children: (
                        <div style={{ padding: '0 0 12px 24px' }}>
                            {/* SQL 语法高亮面板，支持一键复制代码 */}
                            <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-2xs mb-4">
                                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/90 border-b border-slate-100 text-xs text-slate-400">
                                    <span className="font-mono text-slate-600 font-medium">SQL 语句 #{sql.sql_order}</span>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={() => {
                                            navigator.clipboard.writeText(sql.sql_content);
                                            message.success('SQL 已复制到剪贴板');
                                        }}
                                        className="h-6 px-1.5 text-xs text-slate-500 hover:text-slate-800"
                                    >
                                        复制
                                    </Button>
                                </div>
                                <Editor
                                    height={getSqlEditorHeight(sql.sql_content)}
                                    language="sql"
                                    value={sql.sql_content}
                                    theme="vs"
                                    options={{
                                        readOnly: true,
                                        domReadOnly: true,
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        fontSize: 12,
                                        lineNumbers: 'on',
                                        lineNumbersMinChars: 3,
                                        folding: false,
                                        automaticLayout: true,
                                        wordWrap: 'on',
                                        lineHeight: 20,
                                        renderLineHighlight: 'none',
                                        scrollbar: {
                                            vertical: 'auto',
                                            horizontal: 'hidden',
                                        },
                                        padding: { top: 6, bottom: 6 },
                                    }}
                                    loading={<div className="p-3 text-xs text-neutral-400">加载代码高亮...</div>}
                                />
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
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                    gap: '8px'
                                                }}>
                                                    {execs.map((exec: any) => {
                                                        // 根据执行状态匹配对应状态图标
                                                        const statusIcon = (status: number) => {
                                                            switch (status) {
                                                                case 2:
                                                                    return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
                                                                case 3:
                                                                    return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
                                                                case 1:
                                                                    return <LoadingOutlined style={{ color: '#1890ff' }} spin />;
                                                                case 0:
                                                                    return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
                                                                default:
                                                                    return null;
                                                            }
                                                        };

                                                        // 获取状态对应的中文标签
                                                        const getStatusText = (status: number): string => {
                                                            switch (status) {
                                                                case 0:
                                                                    return '待执行';
                                                                case 1:
                                                                    return '执行中';
                                                                case 2:
                                                                    return '已完成';
                                                                case 3:
                                                                    return '执行失败';
                                                                default:
                                                                    return '未知状态';
                                                            }
                                                        };

                                                        const borderColor = statusColor ? statusColor(exec.status) : (exec.status === 3 ? '#ff4d4f' : exec.status === 2 ? '#b7eb8f' : '#e5e7eb');
                                                        const bgColor = exec.status === 3 ? '#fff1f0' : exec.status === 2 ? '#f6ffed' : '#ffffff';

                                                        // 卡片主体：采用 Flex 水平排列，左右自然隔离避免重叠
                                                        const cardContent = (
                                                            <div
                                                                key={exec.id}
                                                                style={{
                                                                    background: bgColor,
                                                                    border: `1px solid ${borderColor}`,
                                                                    borderRadius: '6px',
                                                                    padding: '6px 10px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '8px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                }}
                                                            >
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    minWidth: 0,
                                                                    flex: 1
                                                                }}>
                                                                    <DatabaseOutlined style={{ color: '#9ca3af', fontSize: '12px', flexShrink: 0 }} />
                                                                    <span
                                                                        style={{
                                                                            fontWeight: 500,
                                                                            fontSize: '12px',
                                                                            color: '#1f2937',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            fontFamily: 'monospace',
                                                                        }}
                                                                    >
                                                                        {exec.database_name}
                                                                    </span>
                                                                </div>
                                                                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                                                    {statusIcon(exec.status)}
                                                                </div>
                                                            </div>
                                                        );

                                                        // Tooltip 弹出提示：完整展示数据库全名、状态与错误原因
                                                        const tooltipTitle = (
                                                            <div style={{ fontSize: '12px', padding: '2px 0' }}>
                                                                <div style={{ fontWeight: 600, color: '#ffffff', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                                                    {exec.database_name}
                                                                </div>
                                                                <div style={{ color: '#d1d5db', marginTop: '2px' }}>
                                                                    实例: {instanceName} · 状态: {getStatusText(exec.status)}
                                                                </div>
                                                                {exec.status === 3 && exec.error_message && (
                                                                    <div style={{ color: '#fca5a5', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '4px', wordBreak: 'break-all' }}>
                                                                        错误: {exec.error_message}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );

                                                        return (
                                                            <Tooltip title={tooltipTitle} placement="top" key={exec.id}>
                                                                {cardContent}
                                                            </Tooltip>
                                                        );
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