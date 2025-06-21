import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    useImperativeHandle,
    forwardRef,
} from "react";
import { Card, Tooltip, Tabs, Empty, Button } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { getQueryTaskSQLResult } from "@/services/queryTask/QueryTaskController";

interface TableField {
    name: string;
    type: string;
    comment: string;
}

interface TableSchema {
    fields: TableField[];
}

interface QueryResultsPanelProps {
    sqls: any[];
}

const { TabPane } = Tabs;

/**
 * QueryResultsPanel 支持 ref，父组件可通过 ref.current.refresh() 触发表格刷新
 */
const QueryResultsPanel = forwardRef<any, QueryResultsPanelProps>(
    ({ sqls }, ref) => {
        const actionRef = useRef<ActionType>();
        const lastParamsRef = useRef<any>({});
        // 当前激活tab的sqlId
        const [activeTab, setActiveTab] = useState<string | undefined>(
            sqls.length > 0 ? String(sqls[0].id) : undefined
        );

        // 当前tab对应的SQL对象
        const activeSQL = useMemo(() => {
            return sqls.find((sql) => String(sql.id) === activeTab);
        }, [activeTab, sqls]);

        // 外部sqls变化时，自动切换到第一个tab
        useEffect(() => {
            if (sqls.length > 0 && !activeTab) {
                setActiveTab(String(sqls[0].id));
            } else if (sqls.length === 0) {
                setActiveTab(undefined);
            }
        }, [sqls, activeTab]);

        const getColumnName = (name: string) => {
            if (name === "query_task_execution_instance_name") return "实例";
            if (name === "query_task_execution_database_name") return "数据库";
            return name;
        };

        // columns依赖当前activeSQL
        const columns: ProColumns<any>[] = useMemo(() => {
            try {
                if (!activeSQL?.result_table_schema) return [];
                const parsed: TableSchema = JSON.parse(
                    activeSQL.result_table_schema
                );
                return parsed.fields
                    .filter(
                        (f) =>
                            !f.name.startsWith("query_task_execution_") ||
                            f.name === "query_task_execution_instance_name" ||
                            f.name === "query_task_execution_database_name"
                    )
                    .map((f) => ({
                        title: (
                            <Tooltip title={getColumnName(f.name)}>
                                <span
                                    style={{
                                        maxWidth: 120,
                                        display: "inline-block",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        verticalAlign: "bottom",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {getColumnName(f.name)}
                                </span>
                            </Tooltip>
                        ),
                        dataIndex: f.name, // 直接使用原始字段名
                        key: f.name,
                        search: true,
                        sorter: true,
                    }));
            } catch {
                return [];
            }
        }, [activeSQL]);

        useImperativeHandle(ref, () => ({
            refresh: () => {
                actionRef.current?.reload();
            },
        }));

        return (
            <Card style={{ marginBottom: 16 }}>
                {sqls.length > 0 ? (
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={sqls.map((sql) => ({
                            key: String(sql.id),
                            label: `SQL #${sql.sql_order}`,
                        }))}
                    />
                ) : null}

                {activeSQL ? (
                    <div style={{ marginTop: 16 }}>
                        <div
                            style={{
                                background: "#f8f9fa",
                                border: "1px solid #e8e8e8",
                                borderRadius: 4,
                                padding: 12,
                                fontFamily:
                                    'Monaco, Menlo, "Ubuntu Mono", monospace',
                                fontSize: 13,
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                marginBottom: 16,
                            }}
                        >
                            {activeSQL.sql_content}
                        </div>
                        <ProTable
                            key={activeSQL.id}
                            columns={columns}
                            actionRef={actionRef}
                            rowKey="query_task_execution_id"
                            scroll={{ x: columns.length * 160, y: 500 }}
                            bordered
                            pagination={{
                                defaultPageSize: 20,
                                showSizeChanger: true,
                            }}
                            sticky={{ offsetHeader: 0 }}
                            request={async (params, sort) => {
                                const { current = 1, pageSize = 20, ...rest } = params;
                                
                                const queryParams: Record<string, any> = { ...rest };

                                // 处理排序
                                if (sort && Object.keys(sort).length > 0) {
                                    const sortField = Object.keys(sort)[0];
                                    const sortOrder = Object.values(sort)[0];
                                    if (sortOrder) {
                                        queryParams.order_by = sortField;
                                        queryParams.order = sortOrder;
                                    }
                                }

                                // 保存当前查询参数用于导出
                                lastParamsRef.current = queryParams;

                                const res = await getQueryTaskSQLResult(
                                    activeSQL.id,
                                    {
                                        page: current,
                                        page_size: pageSize,
                                        ...queryParams,
                                    }
                                );
                                
                                return {
                                    data: res.data?.items || [],
                                    total: res.data?.total || 0,
                                    success: res.code === 200,
                                };
                            }}
                            toolBarRender={() => [
                                <Button
                                    key="export"
                                    type="primary"
                                    onClick={() => {
                                        if (!activeSQL) return;
                                        const exportQuery: Record<string, string> = {};
                                        for (const key in lastParamsRef.current) {
                                            const value = lastParamsRef.current[key];
                                            if (value !== undefined && value !== null && value !== '') {
                                                exportQuery[key] = value;
                                            }
                                        }
                                        const urlParams = new URLSearchParams(exportQuery);
                                        const url = `/api/query-tasks/sqls/${activeSQL.id}/export?${urlParams.toString()}`;
                                        window.open(url);
                                    }}
                                >
                                    导出CSV
                                </Button>,
                            ]}
                        />
                    </div>
                ) : (
                    <div style={{ padding: "40px 0" }}>
                        <Empty description="暂无SQL语句" />
                    </div>
                )}
            </Card>
        );
    }
);

export default QueryResultsPanel;
