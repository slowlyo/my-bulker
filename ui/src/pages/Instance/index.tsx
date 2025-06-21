import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, message, Space, Tag, Spin, Upload, Modal } from 'antd';
import { useRef, useState } from 'react';
import { addInstance, deleteInstance, modifyInstance, queryInstanceList, syncDatabases } from '@/services/instance/InstanceController';
import InstanceForm from './components/InstanceForm';
import { InstanceInfo, APIResponse } from '@/services/instance/typings';
import { EditOutlined, DeleteOutlined, PlusOutlined, SyncOutlined, LoadingOutlined, UploadOutlined, DownloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { formatRelativeTime } from '@/utils/format';

const InstancePage: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingInstance, setEditingInstance] = useState<InstanceInfo | null>(null);
    const [selectedRows, setSelectedRows] = useState<InstanceInfo[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [exporting, setExporting] = useState(false);

    const syncIntervalMap: { [key: number]: string } = {
        5: '每 5 分钟',
        10: '每 10 分钟',
        30: '每 30 分钟',
        60: '每小时',
        1440: '每天',
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
            copyable: true,
            ellipsis: true,
        },
        {
            title: '主机地址',
            dataIndex: 'host',
            copyable: true,
            ellipsis: true,
        },
        {
            title: '数据库版本',
            dataIndex: 'version',
            ellipsis: true,
            hideInSearch: true,
            render: (text) => <Tag>{text}</Tag>,
        },
        {
            title: '定时同步',
            dataIndex: 'sync_interval',
            hideInSearch: true,
            render: (text, record) => {
                const interval = record.sync_interval;
                const intervalText = (interval > 0 && syncIntervalMap[interval]) ? syncIntervalMap[interval] : '关闭';

                if (interval > 0) {
                    return (
                        <Tag color="processing" style={{ height: 'auto', padding: '6px 8px', lineHeight: 'normal', border: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ClockCircleOutlined />
                                <div>
                                    <div>{intervalText}</div>
                                    {record.last_sync_at && (
                                        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                                            上次: {formatRelativeTime(record.last_sync_at)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Tag>
                    );
                }
                return <Tag>关闭</Tag>;
            },
        },
        {
            title: '备注',
            dataIndex: 'remark',
            ellipsis: true,
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
            width: 160,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        key="edit"
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
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
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
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
                        onChange={(info) => {
                            if (info.file.status === 'done') {
                                if (info.file.response.code === 200) {
                                    const { succeeded, failed, skipped, errors } = info.file.response.data;
                                    Modal.success({
                                        title: '导入完成',
                                        content: (
                                            <div>
                                                <p>成功: {succeeded}</p>
                                                <p>失败: {failed}</p>
                                                <p>跳过: {skipped}</p>
                                                {errors && errors.length > 0 && (
                                                    <p>错误详情: {errors.join(', ')}</p>
                                                )}
                                            </div>
                                        ),
                                    });
                                    actionRef.current?.reload();
                                } else {
                                    message.error(info.file.response.message || '导入失败');
                                }
                            } else if (info.file.status === 'error') {
                                message.error('导入失败');
                            }
                        }}
                    >
                        <Button icon={<UploadOutlined />}>
                            导入配置
                        </Button>
                    </Upload>,
                    <Button
                        key="export"
                        onClick={handleExport}
                        icon={exporting ? <LoadingOutlined /> : <DownloadOutlined />}
                        disabled={exporting}
                        loading={exporting}
                    >
                        {selectedRows.length > 0 ? '导出选中配置' : '导出全部配置'}
                    </Button>,
                    <Button
                        key="sync"
                        onClick={handleSyncDatabases}
                        icon={syncing ? <LoadingOutlined /> : <SyncOutlined />}
                        disabled={selectedRows.length === 0 || syncing}
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
