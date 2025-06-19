import React from "react";
import { Table } from "antd";

interface TableField {
    name: string;
    type: string;
    comment: string;
}

interface TableSchema {
    fields: TableField[];
}

interface QueryResultTableProps {
    schema: string; // result_table_schema (JSON字符串)
    data: any[];
    loading?: boolean;
}

const QueryResultTable: React.FC<QueryResultTableProps> = ({
    schema,
    data,
    loading,
}) => {
    let columns: any[] = [];
    try {
        const parsed: TableSchema = JSON.parse(schema);
        columns = parsed.fields
            .filter((f) => !f.name.includes("query_task_execution_"))
            .map((f) => ({
                title: f.name,
                dataIndex: window
                    .btoa(unescape(encodeURIComponent(f.name))) // base64 (兼容性好)
                    .replace(/=+$/, "")
                    .replace(/\+/g, "-")
                    .replace(/\//g, "_"),
                ellipsis: true,
                width: 160,
            }));
    } catch {
        columns = [];
    }
    return (
        <Table
            columns={columns}
            dataSource={data}
            loading={loading}
            rowKey={(row) => row[columns[0]?.dataIndex] || Math.random()}
            scroll={{ x: columns.length * 160 }}
            pagination={{ pageSize: 20 }}
            bordered
            size="small"
        />
    );
};

export default QueryResultTable;
