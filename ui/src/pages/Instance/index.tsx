import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, message, Space, Tag } from 'antd';
import { useRef, useState } from 'react';
import { addInstance, deleteInstance, modifyInstance, queryInstanceList } from '@/services/instance/InstanceController';
import InstanceForm from './components/InstanceForm';
import { InstanceInfo } from '@/services/instance/typings';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

const InstancePage: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [editingInstance, setEditingInstance] = useState<InstanceInfo | null>(null);

    const columns: ProColumns<InstanceInfo>[] = [
        {
            title: '实例名称',
            dataIndex: 'name',
            copyable: true,
            ellipsis: true,
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: '主机地址',
            dataIndex: 'host',
            copyable: true,
            ellipsis: true,
        },
        {
            title: '用户名',
            dataIndex: 'username',
            copyable: true,
            ellipsis: true,
        },
        {
            title: '数据库版本',
            dataIndex: 'version',
            ellipsis: true,
            hideInSearch: true,
            render: (text) => <Tag color="blue">{text}</Tag>,
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
                    setDrawerVisible(false);
                    setEditingInstance(null);
                    actionRef.current?.reload();
                } else {
                    message.error(res.message || '更新失败');
                }
            } else {
                const res = await addInstance(values);
                if (res.code === 200) {
                    message.success(res.message || '创建成功');
                    setDrawerVisible(false);
                    setEditingInstance(null);
                    actionRef.current?.reload();
                } else {
                    message.error(res.message || '创建失败');
                }
            }
        } catch (error: any) {
            message.error(error.message || '操作失败');
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
                toolBarRender={() => [
                    <Button
                        key="button"
                        type="primary"
                        onClick={() => {
                            setEditingInstance(null);
                            setDrawerVisible(true);
                        }}
                    >
                        新建
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
