import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    useImperativeHandle,
    forwardRef,
} from "react";
import { Card, Space, Button, Tooltip, Tabs } from "antd";
import { ProTable } from "@ant-design/pro-components";
import type { ActionType, ProColumns } from "@ant-design/pro-components";

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
            if (sqls.length > 0) {
                setActiveTab(String(sqls[0].id));
            } else {
                setActiveTab(undefined);
            }
        }, [sqls]);

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
                            !f.name.includes("query_task_execution_") ||
                            f.name === "query_task_execution_instance_name" ||
                            f.name === "query_task_execution_database_name"
                    )
                    .map((f) => ({
                        title: (
                            <Tooltip
                                title={
                                    f.name ===
                                    "query_task_execution_instance_name"
                                        ? "实例"
                                        : f.name ===
                                          "query_task_execution_database_name"
                                        ? "数据库"
                                        : f.name
                                }
                            >
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
                                    {f.name ===
                                    "query_task_execution_instance_name"
                                        ? "实例"
                                        : f.name ===
                                          "query_task_execution_database_name"
                                        ? "数据库"
                                        : f.name}
                                </span>
                            </Tooltip>
                        ),
                        dataIndex: f.name,
                        search: true,
                        sorter: true,
                    }));
            } catch {
                return [];
            }
        }, [activeSQL?.result_table_schema, activeTab]);

        return (
            <Card title="查询结果" style={{ marginBottom: 16 }}>
                {sqls.length > 0 ? (
                    <div>
                        {sqls.map((sql) => {
                            // 解析表头
                            let columns: ProColumns<any>[] = [];
                            try {
                                if (sql.result_table_schema) {
                                    const parsed: TableSchema = JSON.parse(sql.result_table_schema);
                                    columns = parsed.fields
                                        .filter(
                                            (f) =>
                                                !f.name.includes("query_task_execution_") ||
                                                f.name === "query_task_execution_instance_name" ||
                                                f.name === "query_task_execution_database_name"
                                        )
                                        .map((f) => ({
                                            title: (
                                                <Tooltip
                                                    title={
                                                        f.name ===
                                                        "query_task_execution_instance_name"
                                                            ? "实例"
                                                            : f.name ===
                                                              "query_task_execution_database_name"
                                                            ? "数据库"
                                                            : f.name
                                                    }
                                                >
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
                                                        {f.name ===
                                                        "query_task_execution_instance_name"
                                                            ? "实例"
                                                            : f.name ===
                                                              "query_task_execution_database_name"
                                                            ? "数据库"
                                                            : f.name}
                                                    </span>
                                                </Tooltip>
                                            ),
                                            dataIndex: f.name,
                                            search: true,
                                            sorter: true,
                                        }));
                                }
                            } catch {}
                            return (
                                <div key={sql.id} style={{ marginBottom: 32 }}>
                                    <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 15 }}>
                                        SQL #{sql.sql_order}
                                    </div>
                                    <div style={{
                                        background: '#f8f9fa',
                                        border: '1px solid #e8e8e8',
                                        borderRadius: 4,
                                        padding: 8,
                                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        marginBottom: 12
                                    }}>{sql.sql_content}</div>
                                    <ProTable
                                        columns={columns}
                                        rowKey="query_task_execution_id"
                                        scroll={{ x: columns.length * 160, y: 500 }}
                                        bordered
                                        pagination={{
                                            defaultPageSize: 20,
                                            showSizeChanger: true,
                                        }}
                                        sticky={{ offsetHeader: 0 }}
                                        request={async (
                                            params: any,
                                            sort: any,
                                            filter: any
                                        ) => {
                                            const {
                                                current = 1,
                                                pageSize = 20,
                                                ...rest
                                            } = params;
                                            // 组装模糊查询参数
                                            const query: Record<string, any> = {};
                                            Object.keys(rest).forEach((key) => {
                                                if (
                                                    rest[key] !== undefined &&
                                                    rest[key] !== null &&
                                                    rest[key] !== ""
                                                ) {
                                                    query[key] = rest[key];
                                                }
                                            });
                                            // 排序参数
                                            let orderBy = "";
                                            let order = "";
                                            if (
                                                sort &&
                                                Object.keys(sort).length > 0
                                            ) {
                                                orderBy = Object.keys(sort)[0];
                                                order = sort[orderBy];
                                            }
                                            const searchParams =
                                                new URLSearchParams({
                                                    page: String(current),
                                                    page_size: String(pageSize),
                                                    ...query,
                                                });
                                            if (orderBy) {
                                                searchParams.append(
                                                    "order_by",
                                                    orderBy
                                                );
                                                searchParams.append("order", order);
                                            }
                                            const res = await fetch(
                                                `/api/query-tasks/sqls/${sql.id}/results?${searchParams.toString()}`
                                            );
                                            const data = await res.json();
                                            return {
                                                data: data.data?.items || [],
                                                total: data.data?.total || 0,
                                                success: true,
                                            };
                                        }}
                                        toolBarRender={false}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div
                        style={{
                            textAlign: "center",
                            color: "#999",
                            padding: 40,
                        }}
                    >
                        暂无SQL语句
                    </div>
                )}
            </Card>
        );
    }
);

export default QueryResultsPanel;
