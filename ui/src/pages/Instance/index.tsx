import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, message, Space, Tag, Spin, Upload, Modal, Tooltip } from 'antd';
import { useRef, useState } from 'react';
import { addInstance, deleteInstance, batchDeleteInstances, getInstancePassword, modifyInstance, queryInstanceList, syncDatabases } from '@/services/instance/InstanceController';
import InstanceForm from './components/InstanceForm';
import { InstanceInfo, APIResponse } from '@/services/instance/typings';
import { EditOutlined, DeleteOutlined, PlusOutlined, SyncOutlined, LoadingOutlined, UploadOutlined, DownloadOutlined, ClockCircleOutlined, CopyOutlined, KeyOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { formatRelativeTime, formatFrequency } from '@/utils/format';

const InstancePage: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingInstance, setEditingInstance] = useState<InstanceInfo | null>(null);
    const [selectedRows, setSelectedRows] = useState<InstanceInfo[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [batchDeleting, setBatchDeleting] = useState(false);
    const [copyingUsernameId, setCopyingUsernameId] = useState<number | null>(null);
    const [copyingPasswordId, setCopyingPasswordId] = useState<number | null>(null);

    // 显式提供用户名复制按钮，避免自定义渲染后内置复制能力失效。
    const handleCopyUsername = async (record: InstanceInfo) => {
        setCopyingUsernameId(record.id);
        try {
            await navigator.clipboard.writeText(record.username);
            message.success(`已复制 ${record.name} 的用户名`);
        } catch (error: any) {
            message.error(error.message || '复制用户名失败');
        } finally {
            setCopyingUsernameId(null);
        }
    };

    // 仅在用户点击时请求密码，避免列表接口返回敏感字段。
    const handleCopyPassword = async (record: InstanceInfo) => {
        setCopyingPasswordId(record.id);
        try {
            const res = await getInstancePassword({ instanceId: String(record.id) });

            // 接口返回失败时直接中断，避免复制无效内容。
            if (res.code !== 200) {
                message.error(res.message || '获取密码失败');
                return;
            }

            // 密码为空时给出提示，避免用户误以为复制成功。
            if (!res.data?.password) {
                message.warning('该实例未配置密码');
                return;
            }

            await navigator.clipboard.writeText(res.data.password);
            message.success(`已复制 ${record.name} 的密码`);
        } catch (error: any) {
            message.error(error.message || '复制密码失败');
        } finally {
            setCopyingPasswordId(null);
        }
    };

    const columns: ProColumns<InstanceInfo>[] = [
        {
            title: '实例名称',
            dataIndex: 'name',
            copyable: true,
            ellipsis: true,
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: '用户名',
            dataIndex: 'username',
            ellipsis: true,
            render: (_, record) => (
                <Space size={4}>
                    <span>{record.username}</span>
                    <Tooltip title="复制用户名">
                        <Button
                            type="link"
                            size="small"
                            icon={<CopyOutlined />}
                            loading={copyingUsernameId === record.id}
                            onClick={() => handleCopyUsername(record)}
                        />
                    </Tooltip>
                    <Tooltip title="复制密码">
                        <Button
                            type="link"
                            size="small"
                            icon={<KeyOutlined />}
                            loading={copyingPasswordId === record.id}
                            onClick={() => handleCopyPassword(record)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
        {
            title: '主机地址',
            dataIndex: 'host',
            copyable: true,
            ellipsis: true,
            render: (text) => <span className="font-mono text-xs text-slate-700">{text}</span>,
        },
        {
            title: '数据库版本',
            dataIndex: 'version',
            ellipsis: true,
            hideInSearch: true,
            // 数据库版本号采用标准 Tag 组件渲染，保证行高与字体垂直居中对齐
            render: (text) => {
                // 未检测到版本时展示占位符
                if (!text) {
                    return <span className="text-slate-300">-</span>;
                }
                // 使用标准 Tag 组件呈现版本信息
                return <Tag className="font-mono text-xs m-0">{text}</Tag>;
            },
        },
        {
            title: '定时同步',
            dataIndex: 'sync_interval',
            hideInSearch: true,
            // 渲染定时同步频率与上次同步时间
            render: (_, record) => {
                // 未启用自动同步时展示轻量灰色状态标签
                if (record.sync_interval === 0) {
                    return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-slate-400 bg-slate-100">
                            未启用
                        </span>
                    );
                }

                // 开启定时同步时展示中性灰卡片式微标，包含同步频率与上次同步时间
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 bg-slate-50/70 text-slate-700 text-xs">
                        <ClockCircleOutlined className="text-slate-400" />
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-800 leading-tight">
                                {formatFrequency(record.sync_interval)}
                            </span>
                            {record.last_sync_at ? (
                                <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                    上次: {formatRelativeTime(record.last_sync_at)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                );
            },
        },
        {
            title: '备注',
            dataIndex: 'remark',
            ellipsis: true,
            // 备注为空时展示占位符
            render: (text) => {
                if (!text) {
                    return <span className="text-slate-300 text-xs">-</span>;
                }
                return <span className="text-slate-600 text-xs">{text}</span>;
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            valueType: 'dateTime',
            hideInSearch: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            width: 140,
            // 操作列提供编辑抽屉入口与二次确认删除
            render: (_, record) => (
                <Space size={4}>
                    <Button
                        key="edit"
                        type="text"
                        size="small"
                        icon={<EditOutlined className="text-slate-500" />}
                        className="!text-slate-700 hover:!text-slate-900 hover:!bg-slate-100 !px-2 !h-7 !text-xs !rounded-md"
                        onClick={() => {
                            setEditingInstance(record);
                            setDrawerVisible(true);
                        }}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        key="delete"
                        title="确定要删除这个实例吗？"
                        description="删除实例将同步解除关联库配置，请谨慎操作。"
                        onConfirm={async () => {
                            try {
                                await deleteInstance({ instanceId: String(record.id) });
                                message.success('删除成功');
                                actionRef.current?.reload();
                            } catch (error) {
                                message.error('删除失败');
                            }
                        }}
                    >
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            className="!px-2 !h-7 !text-xs !rounded-md"
                        >
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const handleSubmit = async (values: any) => {
        try {
            if (editingInstance) {
                const res = await modifyInstance(
                    { instanceId: String(editingInstance.id) },
                    values
                );
                if (res.code === 200) {
                    message.success(res.message || '更新成功');
                } else {
                    message.error(res.message || '更新失败');
                    return false;
                }
            } else {
                const res = await addInstance(values);
                if (res.code === 200) {
                    message.success(res.message || '创建成功');
                } else {
                    message.error(res.message || '创建失败');
                    return false;
                }
            }
            setDrawerVisible(false);
            setEditingInstance(null);
            actionRef.current?.reload();
            return true;
        } catch (error: any) {
            message.error(error.message || '操作失败');
            return false;
        }
    };

    const handleSyncDatabases = async () => {
        if (selectedRows.length === 0) {
            message.warning('请选择要同步的实例');
            return;
        }

        setSyncing(true);
        try {
            const instanceIds = selectedRows.map(row => row.id);
            const res = await syncDatabases({ instance_ids: instanceIds });
            if (res.code === 200) {
                message.success(res.message || '同步成功');
                actionRef.current?.reload();
            } else {
                message.error(res.message || '同步失败');
            }
        } catch (error: any) {
            message.error(error.message || '同步失败');
        } finally {
            setSyncing(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const instanceIds = selectedRows.map(row => row.id);
            const res = await request<APIResponse<InstanceInfo[]>>('/api/instances/export', {
                method: 'POST',
                data: { instance_ids: instanceIds },
            });
            if (res.code === 200) {
                const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `instances_export_${new Date().toISOString().slice(0, 10)}.json`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                window.URL.revokeObjectURL(url);
                message.success('导出成功');
            } else {
                message.error(res.message || '导出失败');
            }
        } catch (error) {
            message.error('导出失败');
        } finally {
            setExporting(false);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedRows.length === 0) {
            message.warning('请选择要删除的实例');
            return;
        }

        setBatchDeleting(true);
        try {
            const instanceIds = selectedRows.map(row => row.id);
            const res = await batchDeleteInstances({ instance_ids: instanceIds });
            if (res.code === 200) {
                message.success(`成功删除 ${selectedRows.length} 个实例`);
                actionRef.current?.reload();
                setSelectedRows([]);
            } else {
                message.error(res.message || '批量删除失败');
            }
        } catch (error: any) {
            message.error(error.message || '批量删除失败');
        } finally {
            setBatchDeleting(false);
        }
    };

    return (
        <PageContainer ghost>
            <ProTable<InstanceInfo>
                cardBordered
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 120,
                }}
                rowSelection={{
                    onChange: (_, selectedRows) => {
                        setSelectedRows(selectedRows);
                    },
                }}
                toolBarRender={() => [
                    <Upload
                        key="import"
                        name="file"
                        action="/api/instances/import"
                        showUploadList={false}
                        disabled={importing}
                        onChange={(info) => {
                            // 导入处理中设置加载态
                            if (info.file.status === 'uploading') {
                                setImporting(true);
                            } else if (info.file.status === 'done') {
                                setImporting(false);
                                // 导入返回成功时弹出统计信息弹窗
                                if (info.file.response?.code === 200) {
                                    const { succeeded, failed, skipped, errors } = info.file.response.data || {};
                                    Modal.success({
                                        title: '导入完成',
                                        content: (
                                            <div className="space-y-1 text-xs">
                                                <p>成功: {succeeded}</p>
                                                <p>失败: {failed}</p>
                                                <p>跳过: {skipped}</p>
                                                {errors && errors.length > 0 && (
                                                    <p className="text-red-500">错误详情: {errors.join(', ')}</p>
                                                )}
                                            </div>
                                        ),
                                    });
                                    actionRef.current?.reload();
                                } else {
                                    message.error(info.file.response?.message || '导入失败');
                                }
                            } else if (info.file.status === 'error') {
                                setImporting(false);
                                message.error('导入失败');
                            }
                        }}
                    >
                        <Button
                            icon={importing ? <LoadingOutlined /> : <UploadOutlined />}
                            loading={importing}
                            disabled={importing}
                            className="!rounded-md !text-xs !h-8"
                        >
                            {importing ? '导入中...' : '导入配置'}
                        </Button>
                    </Upload>,
                    <Popconfirm
                        key="batch-delete"
                        title={`确定要删除选中的 ${selectedRows.length} 个实例吗？`}
                        description="删除后无法恢复，请谨慎操作！"
                        onConfirm={handleBatchDelete}
                        disabled={selectedRows.length === 0 || batchDeleting}
                    >
                        <Button
                            danger
                            icon={batchDeleting ? <LoadingOutlined /> : <DeleteOutlined />}
                            disabled={selectedRows.length === 0 || batchDeleting}
                            loading={batchDeleting}
                            className="!rounded-md !text-xs !h-8"
                        >
                            {batchDeleting ? '删除中...' : `批量删除 (${selectedRows.length})`}
                        </Button>
                    </Popconfirm>,
                    <Button
                        key="export"
                        onClick={handleExport}
                        icon={exporting ? <LoadingOutlined /> : <DownloadOutlined />}
                        disabled={exporting}
                        loading={exporting}
                        className="!rounded-md !text-xs !h-8"
                    >
                        {selectedRows.length > 0 ? '导出选中配置' : '导出全部配置'}
                    </Button>,
                    <Button
                        key="sync"
                        onClick={handleSyncDatabases}
                        icon={syncing ? <LoadingOutlined /> : <SyncOutlined />}
                        disabled={selectedRows.length === 0 || syncing}
                        className="!rounded-md !text-xs !h-8"
                    >
                        {syncing ? '同步中...' : '同步数据库'}
                    </Button>,
                    <Button
                        key="button"
                        type="primary"
                        onClick={() => {
                            setEditingInstance(null);
                            setDrawerVisible(true);
                        }}
                        icon={<PlusOutlined />}
                        className="!rounded-md !text-xs !h-8 shadow-xs"
                    >
                        新增实例
                    </Button>,
                ]}
                request={async (params) => {
                    const { current, pageSize, ...rest } = params;
                    const res = await queryInstanceList({
                        page: current,
                        pageSize,
                        ...rest,
                    });
                    return {
                        data: res.data?.items || [],
                        success: res.code === 200,
                        total: res.data?.total || 0,
                    };
                }}
                columns={columns}
                pagination={{
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    defaultPageSize: 20,
                    showTotal: (total) => `共 ${total} 条记录`
                }}
            />
            <InstanceForm
                visible={drawerVisible}
                onClose={() => {
                    setDrawerVisible(false);
                    setEditingInstance(null);
                }}
                onSubmit={handleSubmit}
                editingInstance={editingInstance}
            />
        </PageContainer>
    );
};

export default InstancePage;
