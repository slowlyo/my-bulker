import React from 'react';
import { Card, Space, Button, Tooltip } from 'antd';
import QueryResultTable from './QueryResultTable';

interface QueryResultsPanelProps {
    sqlExecutions: any[];
    activeSQL: any;
    setActiveSQL: (sql: any) => void;
    resultData: any[];
    resultLoading: boolean;
    fetchResultData: (sql: any) => void;
}

const QueryResultsPanel: React.FC<QueryResultsPanelProps> = ({
    sqlExecutions,
    activeSQL,
    setActiveSQL,
    resultData,
    resultLoading,
    fetchResultData,
}) => (
    <Card title="查询结果" style={{ marginBottom: 16 }}>
        {/* SQL选择器，可选：展示所有SQL，点击切换 */}
        <div style={{ marginBottom: 16 }}>
            {sqlExecutions.length > 0 && (
                <Space>
                    <span>选择SQL：</span>
                    {sqlExecutions.map((sql: any) => (
                        <Tooltip key={sql.id} title={<pre style={{margin:0,whiteSpace:'pre-wrap',maxWidth:400}}>{sql.sql_content}</pre>} placement="top">
                            <Button
                                type={activeSQL && activeSQL.id === sql.id ? 'primary' : 'default'}
                                size="small"
                                onClick={() => {
                                    setActiveSQL(sql);
                                    fetchResultData(sql);
                                }}
                                style={{ marginRight: 4 }}
                            >
                                #{sql.sql_order}
                            </Button>
                        </Tooltip>
                    ))}
                </Space>
            )}
        </div>
        {/* 结果表格 */}
        {activeSQL ? (
            <QueryResultTable
                schema={activeSQL?.result_table_schema}
                data={resultData}
                loading={resultLoading}
            />
        ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                请选择要查看结果的SQL
            </div>
        )}
    </Card>
);

export default QueryResultsPanel; 