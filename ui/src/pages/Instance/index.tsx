import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, message } from 'antd';
import { useRef, useState } from 'react';
import { addInstance, deleteInstance, modifyInstance, queryInstanceList } from '@/services/instance/InstanceController';
import InstanceForm from './components/InstanceForm';
import { InstanceInfo } from '@/services/instance/typings';

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
            title: '备注',
            dataIndex: 'remark',
            ellipsis: true,
        },
        {
            title: '创建时间',
            dataIndex: 'createTime',
            valueType: 'dateTime',
            hideInSearch: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (_, record) => [
                <a
                    key="edit"
                    onClick={() => {
                        setEditingInstance(record);
                        setDrawerVisible(true);
                    }}
                >
                    编辑
                </a>,
                <Popconfirm
                    key="delete"
                    title="确定要删除这个实例吗？"
                    onConfirm={async () => {
                        try {
                            await deleteInstance({ instanceId: record.id });
                            message.success('删除成功');
                            actionRef.current?.reload();
                        } catch (error) {
                            message.error('删除失败');
                        }
                    }}
                >
                    <a>删除</a>
                </Popconfirm>,
            ],
        },
    ];

    const handleSubmit = async (values: any) => {
        try {
            if (editingInstance) {
                await modifyInstance(
                    { instanceId: editingInstance.id },
                    values
                );
                message.success('更新成功');
            } else {
                await addInstance(values);
                message.success('创建成功');
            }
            setDrawerVisible(false);
            setEditingInstance(null);
            actionRef.current?.reload();
        } catch (error) {
            message.error('操作失败');
        }
    };

    return (
        <PageContainer>
            <ProTable<InstanceInfo>
                headerTitle="实例列表"
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
                        current,
                        pageSize,
                        ...rest,
                    });
                    return {
                        data: res.data?.list || [],
                        success: res.success,
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
