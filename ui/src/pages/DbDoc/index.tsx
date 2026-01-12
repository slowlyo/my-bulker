import React, { useState, useEffect, useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Modal, Form, Input, Select, Switch, message, Tag, Popconfirm, Typography } from 'antd';
import { PlusOutlined, PlayCircleOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, RocketOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import dayjs from 'dayjs';

const { Text } = Typography;

interface DbDocTask {
  id: number;
  task_name: string;
  instance_id: number;
  database_id: number;
  database: string;
  output_path: string;
  sync_interval: number;
  is_enable: boolean;
  last_run_at: string;
  last_status: number;
  last_error: string;
  instance?: {
    name: string;
  };
}

const DbDoc: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [instances, setInstances] = useState<any[]>([]);
  const [databases, setDatabases] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [runningTasks, setRunningTasks] = useState<Record<number, boolean>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchInstances = async () => {
    try {
      const res = await request('/api/instances/options');
      setInstances(res.data || []);
    } catch (error) {
      message.error('获取实例列表失败');
    }
  };

  const fetchDatabases = async (instanceId: number) => {
    try {
      const res = await request('/api/databases/batch-list', {
        method: 'POST',
        data: { instance_ids: [instanceId] }
      });
      const dbOptions = (res.data || []).map((item: any) => ({
        label: item.database_name,
        value: item.database_name,
      }));
      setDatabases(dbOptions);
    } catch (error) {
      message.error('获取数据库列表失败');
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleCreateOrUpdate = async (values: any) => {
    try {
      const payload = {
        ...values,
        database: values.database_name,
        database_id: 0,
      };

      if (editingId) {
        await request(`/api/db-docs/${editingId}`, { method: 'PUT', data: payload });
        message.success('更新成功');
      } else {
        await request('/api/db-docs', { method: 'POST', data: payload });
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingId(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/db-docs/${id}`, { method: 'DELETE' });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleRun = async (id: number) => {
    try {
      setRunningTasks(prev => ({ ...prev, [id]: true }));
      await request(`/api/db-docs/${id}/run`, { method: 'POST' });
      message.success('执行成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('启动失败');
    } finally {
      setRunningTasks(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleBatchRun = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      // 同时开始所有选中的任务
      const hide = message.loading(`正在执行 ${selectedRowKeys.length} 个任务...`);
      const promises = selectedRowKeys.map(async (key) => {
        const id = key as number;
        setRunningTasks(prev => ({ ...prev, [id]: true }));
        try {
          await request(`/api/db-docs/${id}/run`, { method: 'POST' });
        } catch (error) {
          console.error(`任务 ${id} 执行失败:`, error);
        } finally {
          setRunningTasks(prev => ({ ...prev, [id]: false }));
        }
      });
      await Promise.all(promises);
      hide();
      message.success('批量执行完成');
      setSelectedRowKeys([]);
      actionRef.current?.reload();
    } catch (error) {
      message.error('批量执行失败');
    }
  };

  const columns: ProColumns<DbDocTask>[] = [
    { 
      title: '任务名称', 
      dataIndex: 'task_name', 
      key: 'task_name' 
    },
    { 
      title: '实例', 
      dataIndex: 'instance_id',
      key: 'instance_id',
      valueType: 'select',
      fieldProps: {
        options: instances,
        showSearch: true,
      },
      render: (_, record) => <Tag color="blue">{record.instance?.name || record.instance_id}</Tag>
    },
    { 
      title: '数据库', 
      dataIndex: 'database',
      key: 'database',
      hideInSearch: true,
    },
    { 
      title: '输出路径', 
      dataIndex: 'output_path', 
      key: 'output_path', 
      hideInSearch: true,
      render: (dom: React.ReactNode, record: DbDocTask) => {
        const text = record.output_path;
        if (!text) return '-';
        return (
          <Typography.Text 
            style={{ maxWidth: 200 }} 
            ellipsis={{ tooltip: text }}
          >
            {text}
          </Typography.Text>
        );
      }
    },
    { 
      title: '频率', 
      dataIndex: 'sync_interval', 
      key: 'sync_interval',
      hideInSearch: true,
      render: (dom: any, record: DbDocTask) => {
        const val = record.sync_interval;
        const syncIntervalMap: { [key: number]: string } = {
          5: '5 分钟',
          10: '10 分钟',
          30: '30 分钟',
          60: '每小时',
          1440: '每天',
        };
        return val > 0 ? (syncIntervalMap[val] || `${val} 分钟`) : <Text type="secondary">关闭</Text>;
      } 
    },
    { 
      title: '状态', 
      dataIndex: 'is_enable', 
      key: 'is_enable',
      valueType: 'select',
      valueEnum: {
        true: { text: '启用', status: 'Success' },
        false: { text: '禁用', status: 'Default' },
      },
      render: (dom: any, record: DbDocTask) => (
        <Tag color={record.is_enable ? 'green' : 'default'}>{record.is_enable ? '启用' : '禁用'}</Tag>
      )
    },
    {
      title: '最后运行',
      key: 'last_run',
      hideInSearch: true,
      render: (_, record) => (
        <Space size={8}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.last_run_at ? dayjs(record.last_run_at).format('YYYY-MM-DD HH:mm:ss') : '从未使用'}
          </Text>
          {record.last_status === 1 && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          {record.last_status === 2 && (
            <Popconfirm title={record.last_error} showCancel={false}>
              <CloseCircleOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} />
            </Popconfirm>
          )}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => [
        <Button 
          key="run" 
          type="link" 
          size="small" 
          icon={<PlayCircleOutlined />} 
          loading={runningTasks[record.id]}
          onClick={() => handleRun(record.id)}
        >
          运行
        </Button>,
        <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={() => {
          setEditingId(record.id);
          form.setFieldsValue({
            ...record,
            database_name: record.database,
          });
          fetchDatabases(record.instance_id);
          setModalVisible(true);
        }}>编辑</Button>,
        <Popconfirm key="delete" title="确定删除吗？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer ghost>
      <ProTable<DbDocTask>
        actionRef={actionRef}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        search={{
          labelWidth: 'auto',
        }}
        toolBarRender={() => [
          <Button
            key="batch-run"
            icon={<RocketOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchRun}
          >
            批量运行
          </Button>,
          <Button 
            key="create" 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            创建任务
          </Button>,
        ]}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        request={async (params) => {
          const res = await request('/api/db-docs', {
            params: {
              page: params.current,
              pageSize: params.pageSize,
              task_name: params.task_name,
              instance_id: params.instance_id,
              is_enable: params.is_enable,
            },
          });
          return {
            data: res.data?.items || [],
            success: res.code === 200,
            total: res.data?.total || 0,
          };
        }}
        columns={columns}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
        }}
      />

      <Modal
        title={editingId ? "编辑任务" : "创建任务"}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          setEditingId(null);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Form.Item name="task_name" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item name="instance_id" label="选择实例" rules={[{ required: true }]}>
            <Select 
              showSearch
              optionFilterProp="label"
              options={instances} 
              onChange={(val) => {
                form.setFieldValue('database_name', undefined);
                fetchDatabases(val);
              }}
              placeholder="请选择实例"
            />
          </Form.Item>
          <Form.Item name="database_name" label="选择数据库" rules={[{ required: true }]}>
            <Select 
              showSearch
              optionFilterProp="label"
              options={databases} 
              placeholder="请选择数据库"
            />
          </Form.Item>
          <Form.Item 
            name="output_path" 
            label="生成的目标路径" 
            rules={[{ required: true }]}
            tooltip="生成的文档将以 Markdown 格式保存到该路径，例如：./docs/db.md"
          >
            <Input placeholder="例如: ./docs/db_docs.md" />
          </Form.Item>
          <Form.Item name="sync_interval" label="同步频率" initialValue={0}>
            <Select>
              <Select.Option value={0}>关闭</Select.Option>
              <Select.Option value={5}>每 5 分钟</Select.Option>
              <Select.Option value={10}>每 10 分钟</Select.Option>
              <Select.Option value={30}>每 30 分钟</Select.Option>
              <Select.Option value={60}>每小时</Select.Option>
              <Select.Option value={1440}>每天</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_enable" label="启用定时任务" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default DbDoc;
