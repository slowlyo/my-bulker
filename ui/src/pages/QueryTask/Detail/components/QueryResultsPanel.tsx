import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    useImperativeHandle,
    forwardRef,
} from "react";
import { Card, Tabs, Empty, Button, Spin, Space, Typography, Row, Col, Divider, Tooltip, message } from "antd";
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { AG_GRID_LOCALE_CN as AG_GRID_LOCALE_CN_BASE } from '@ag-grid-community/locale';
import { getQueryTaskSQLResult } from "@/services/queryTask/QueryTaskController";
import { DownloadOutlined, CodeOutlined, EyeOutlined, EyeInvisibleOutlined, FullscreenOutlined, FullscreenExitOutlined, FilterOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';

// 注册所有社区版模块
ModuleRegistry.registerModules([AllCommunityModule]);

// 汉化配置
const AG_GRID_LOCALE_CN = {
    ...AG_GRID_LOCALE_CN_BASE,
    pageSizeSelectorLabel: '每页条数：',
    footerTotal: '总计',
};

const { Text } = Typography;

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
        const [rowData, setRowData] = useState<any[]>([]);
        const [loading, setLoading] = useState(false);
        const [total, setTotal] = useState(0);
        const [paginationPageSize, setPaginationPageSize] = useState(50);
        const [currentPage, setCurrentPage] = useState(1);
        const [isSqlExpanded, setIsSqlExpanded] = useState(false);
        const [isFullScreen, setIsFullScreen] = useState(false);
        const gridRef = useRef<AgGridReact>(null);
        const gridContainerRef = useRef<HTMLDivElement>(null);

        // 当前激活tab的sqlId
        const [activeTab, setActiveTab] = useState<string | undefined>(
            sqls.length > 0 ? String(sqls[0].id) : undefined
        );

        // 当前tab对应的SQL对象
        const activeSQL = useMemo(() => {
            return sqls.find((sql) => String(sql.id) === activeTab);
        }, [activeTab, sqls]);

        // 监听全屏退出
        useEffect(() => {
            const handleFullScreenChange = () => {
                if (!document.fullscreenElement) {
                    setIsFullScreen(false);
                }
            };
            document.addEventListener('fullscreenchange', handleFullScreenChange);
            return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
        }, []);

        const toggleFullScreen = () => {
            if (!isFullScreen) {
                if (gridContainerRef.current?.requestFullscreen) {
                    gridContainerRef.current.requestFullscreen();
                    setIsFullScreen(true);
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                    setIsFullScreen(false);
                }
            }
        };

        const resetFilters = () => {
            gridRef.current?.api.setFilterModel(null);
            gridRef.current?.api.applyColumnState({
                defaultState: { sort: null },
            });
            message.success('已重置所有筛选和排序');
        };

        const autoSizeDataColumns = () => {
            const api = gridRef.current?.api;
            if (!api) return;
            const allCols = api.getAllGridColumns();
            const dynamicCols = allCols.filter(c => !c.isPinned());
            api.autoSizeColumns(dynamicCols);
        };

        // 加载数据的函数
        const loadData = async (page = 1, pageSize = paginationPageSize) => {
            if (!activeSQL) return;
            setLoading(true);
            try {
                const res = await getQueryTaskSQLResult(activeSQL.id, {
                    page,
                    page_size: pageSize,
                });
                if (res.code === 200) {
                    setRowData(res.data?.items || []);
                    setTotal(res.data?.total || 0);
                    setCurrentPage(page);
                    // 数据加载后触发列宽自适应
                    setTimeout(autoSizeDataColumns, 50);
                }
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
            if (activeTab) {
                loadData(1);
            }
        }, [activeTab, activeSQL]);

        useImperativeHandle(ref, () => ({
            refresh: () => {
                loadData(currentPage);
            },
        }));

        // 外部sqls变化时，自动切换到第一个tab
        useEffect(() => {
            if (sqls.length > 0 && !activeTab) {
                setActiveTab(String(sqls[0].id));
            } else if (sqls.length === 0) {
                setActiveTab(undefined);
            }
        }, [sqls, activeTab]);

        // 列定义
        const columnDefs: ColDef[] = useMemo(() => {
            try {
                if (!activeSQL?.result_table_schema) return [];
                const parsed: TableSchema = JSON.parse(activeSQL.result_table_schema);
                
                const baseFields = parsed.fields.filter(f => !f.name.startsWith("query_task_execution_"));
                
                const sourceCol: ColDef = {
                    headerName: "来源",
                    pinned: 'left',
                    lockPinned: true,
                    cellClass: 'lock-pinned',
                    valueGetter: (params) => {
                        const instance = params.data.query_task_execution_instance_name || '-';
                        const db = params.data.query_task_execution_database_name || '-';
                        return `${instance} / ${db}`;
                    },
                    width: 200,
                    sortable: true,
                    filter: true,
                    resizable: true,
                };

                const dataCols: ColDef[] = baseFields.map(f => ({
                    headerName: f.name,
                    field: f.name,
                    sortable: true,
                    filter: true,
                    resizable: true,
                    suppressMovable: true,
                }));

                return [sourceCol, ...dataCols];
            } catch {
                return [];
            }
        }, [activeSQL]);

        return (
            <>
                <Card 
                    style={{ marginBottom: 16 }} 
                    bodyStyle={{ padding: '12px 24px' }}
                >
                    {sqls.length > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Tabs
                                activeKey={activeTab}
                                onChange={setActiveTab}
                                style={{ flex: 1, marginBottom: -16 }}
                                items={sqls.map((sql) => ({
                                    key: String(sql.id),
                                    label: `SQL #${sql.sql_order}`,
                                }))}
                            />
                            {activeSQL && (
                                <Space size={16} style={{ marginLeft: 16 }}>
                                    <Text type="secondary">
                                        共 <Text strong>{total}</Text> 条记录
                                    </Text>
                                    <Space size={8}>
                                        <Tooltip title={isSqlExpanded ? "隐藏 SQL" : "查看 SQL"}>
                                            <Button
                                                type="text"
                                                icon={isSqlExpanded ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                                onClick={() => setIsSqlExpanded(!isSqlExpanded)}
                                            />
                                        </Tooltip>
                                        <Tooltip title="全屏查看表格">
                                            <Button
                                                type="text"
                                                icon={<FullscreenOutlined />}
                                                onClick={toggleFullScreen}
                                            />
                                        </Tooltip>
                                        <Tooltip title="重置筛选和排序">
                                            <Button
                                                type="text"
                                                icon={<FilterOutlined />}
                                                onClick={resetFilters}
                                            />
                                        </Tooltip>
                                        <Tooltip title="导出结果">
                                            <Button
                                                type="text"
                                                icon={<DownloadOutlined />}
                                                onClick={() => {
                                                    if (!activeSQL) return;
                                                    const url = `/api/query-tasks/sqls/${activeSQL.id}/export`;
                                                    window.open(url);
                                                }}
                                            />
                                        </Tooltip>
                                    </Space>
                                </Space>
                            )}
                        </div>
                    ) : null}

                    {activeSQL ? (
                        <div style={{ marginTop: 8 }}>
                            {isSqlExpanded && (
                                <div style={{ 
                                    marginBottom: 16,
                                    border: "1px solid #f0f0f0",
                                    borderRadius: 8,
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ 
                                        padding: '8px 16px', 
                                        background: '#fafafa', 
                                        borderBottom: '1px solid #f0f0f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Space>
                                            <CodeOutlined style={{ color: '#8c8c8c' }} />
                                            <Text strong style={{ fontSize: 13 }}>SQL 内容</Text>
                                        </Space>
                                    </div>
                                    <Editor
                                        height={200}
                                        language="sql"
                                        value={activeSQL.sql_content}
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            fontSize: 13,
                                            lineNumbers: 'on',
                                            folding: true,
                                            automaticLayout: true,
                                            wordWrap: 'on',
                                            lineHeight: 20,
                                            padding: { top: 8, bottom: 8 }
                                        }}
                                    />
                                </div>
                            )}

                            <div 
                                ref={gridContainerRef}
                                style={{ 
                                    height: isFullScreen ? '100vh' : (isSqlExpanded ? 500 : 650), 
                                    width: '100%', 
                                    border: isFullScreen ? 'none' : '1px solid #f0f0f0', 
                                    borderRadius: isFullScreen ? 0 : 8, 
                                    overflow: 'hidden',
                                    transition: 'height 0.3s ease',
                                    background: '#fff',
                                    position: 'relative'
                                }}
                            >
                                {isFullScreen && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        right: 16, 
                                        top: 10, 
                                        zIndex: 1000,
                                        display: 'flex',
                                        gap: 8
                                    }}>
                                        <Button 
                                            icon={<FilterOutlined />} 
                                            onClick={resetFilters}
                                            size="small"
                                        >
                                            重置筛选
                                        </Button>
                                        <Button 
                                            icon={<FullscreenExitOutlined />} 
                                            onClick={toggleFullScreen}
                                            size="small"
                                        >
                                            退出全屏
                                        </Button>
                                    </div>
                                )}
                                <Spin spinning={loading}>
                                    <div className="ag-theme-alpine" style={{ height: isFullScreen ? '100vh' : (isSqlExpanded ? 500 : 650), width: '100%' }}>
                                        <AgGridReact
                                            ref={gridRef}
                                            rowData={rowData}
                                            columnDefs={columnDefs}
                                            pagination={true}
                                            paginationPageSize={paginationPageSize}
                                            paginationPageSizeSelector={[50, 100, 500, 1000]}
                                            localeText={AG_GRID_LOCALE_CN}
                                            onPaginationChanged={(params) => {
                                                if (params.newPage || params.keepRenderedRows) {
                                                    const api = gridRef.current?.api;
                                                    if (!api) return;
                                                    
                                                    const newPage = api.paginationGetCurrentPage() + 1;
                                                    const newPageSize = api.paginationGetPageSize();
                                                    
                                                    if (newPage !== currentPage || newPageSize !== paginationPageSize) {
                                                        setPaginationPageSize(newPageSize);
                                                        loadData(newPage, newPageSize);
                                                    }
                                                }
                                            }}
                                            onFirstDataRendered={autoSizeDataColumns}
                                            onRowDataUpdated={autoSizeDataColumns}
                                            enableCellTextSelection={true}
                                            ensureDomOrder={true}
                                            domLayout='normal'
                                            defaultColDef={{
                                                sortable: true,
                                                filter: true,
                                                resizable: true,
                                                flex: 1,
                                                minWidth: 100,
                                            }}
                                        />
                                    </div>
                                </Spin>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: "60px 0" }}>
                            <Empty description="暂无 SQL 执行结果" />
                        </div>
                    )}
                </Card>
            </>
        );
    }
);

export default QueryResultsPanel;
