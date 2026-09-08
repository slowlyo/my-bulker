import React, { useState, useEffect, useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Space, Modal, Form, Input, Select, Switch, message, Tag, Popconfirm, Typography } from 'antd';
import { PlusOutlined, PlayCircleOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, RocketOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import dayjs from 'dayjs';
import FrequencyPicker from '@/components/FrequencyPicker';

import { formatFrequency } from '@/utils/format';

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
        output_path: values.output_paths.filter((p: string) => p && p.trim()).join(','),
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

  const handleStatusChange = async (record: DbDocTask, checked: boolean) => {
    try {
      const payload = {
        ...record,
        output_path: record.output_path,
        database: record.database,
        is_enable: checked,
      };
      await request(`/api/db-docs/${record.id}`, { method: 'PUT', data: payload });
      message.success(checked ? '任务已启用' : '任务已禁用');
      actionRef.current?.reload();
    } catch (error) {
      message.error('状态切换失败');
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
      // 实例展示为中性灰徽标，避免使用明亮蓝色
      render: (_, record) => (
        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium border border-slate-200/60">
          {record.instance?.name || record.instance_id}
        </span>
      ),
    },
    { 
      title: '数据库', 
      dataIndex: 'database',
      key: 'database',
      hideInSearch: true,
      render: (text) => <span className="font-semibold text-slate-800 text-xs">{text}</span>,
    },
    { 
      title: '输出路径', 
      dataIndex: 'output_path', 
      key: 'output_path', 
      hideInSearch: true,
      render: (dom: React.ReactNode, record: DbDocTask) => {
        const text = record.output_path;
        if (!text) return <span className="text-slate-300">-</span>;
        const paths = text.split(',').filter(p => p.trim());
        return (
          <Space direction="vertical" size={2}>
            {paths.map((p, index) => (
              <span 
                key={index}
                className="font-mono text-xs text-slate-600 max-w-[220px] truncate block"
                title={p}
              >
                {p}
              </span>
            ))}
          </Space>
        );
      }
    },
    { 
      title: '频率', 
      dataIndex: 'sync_interval', 
      key: 'sync_interval',
      hideInSearch: true,
      // 渲染频率格式化微标
      render: (_, record) => {
        if (!record.sync_interval) {
          return <span className="text-slate-400 text-xs">仅手动</span>;
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
            {formatFrequency(record.sync_interval)}
          </span>
        );
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
        <Switch 
          checked={record.is_enable} 
          onChange={(checked) => handleStatusChange(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          size="small"
        />
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
          {record.last_status === 1 && <CheckCircleOutlined style={{ color: '#10b981' }} />}
          {record.last_status === 2 && (
            <Popconfirm title={record.last_error} showCancel={false}>
              <CloseCircleOutlined style={{ color: '#ef4444', cursor: 'pointer' }} />
            </Popconfirm>
          )}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => [
        <Button 
          key="run" 
          type="text" 
          size="small" 
          icon={<PlayCircleOutlined className="text-slate-500" />} 
          loading={runningTasks[record.id]}
          className="!text-slate-700 hover:!text-slate-900 hover:!bg-slate-100 !px-2 !h-7 !text-xs !rounded-md"
          onClick={() => handleRun(record.id)}
        >
          运行
        </Button>,
        <Button
          key="edit"
          type="text"
          size="small"
          icon={<EditOutlined className="text-slate-500" />}
          className="!text-slate-700 hover:!text-slate-900 hover:!bg-slate-100 !px-2 !h-7 !text-xs !rounded-md"
          onClick={() => {
            setEditingId(record.id);
            const paths = record.output_path ? record.output_path.split(',') : [''];
            form.setFieldsValue({
              ...record,
              output_paths: paths,
              database_name: record.database,
            });
            fetchDatabases(record.instance_id);
            setModalVisible(true);
          }}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确定删除这个文档任务吗？"
          description="删除后无法恢复，请谨慎操作。"
          onConfirm={() => handleDelete(record.id)}
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
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer ghost>
      <ProTable<DbDocTask>
        cardBordered
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
            className="!rounded-md !text-xs !h-8"
          >
            {selectedRowKeys.length > 0 ? `批量运行 (${selectedRowKeys.length})` : '批量运行'}
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
            className="!rounded-md !text-xs !h-8 shadow-xs"
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
          <Form.List
            name="output_paths"
            initialValue={['']}
            rules={[
              {
                validator: async (_, names) => {
                  if (!names || names.length < 1) {
                    return Promise.reject(new Error('至少需要一个输出路径'));
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                <Form.Item
                  label="生成的目标路径"
                  required
                  tooltip="生成的文档将以 Markdown 格式保存到该路径，例如：./docs/db.md"
                  style={{ marginBottom: 0 }}
                >
                  {fields.map((field, index) => (
                    <Form.Item
                      required={false}
                      key={field.key}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Form.Item
                            {...field}
                            validateTrigger={['onChange', 'onBlur']}
                            rules={[
                              {
                                required: true,
                                whitespace: true,
                                message: "请输入输出路径",
                              },
                            ]}
                            noStyle
                          >
                            <Input placeholder="例如: ./docs/db_docs.md" style={{ flex: 1 }} />
                          </Form.Item>
                          <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
                            <MinusCircleOutlined
                              className="dynamic-delete-button"
                              style={{ 
                                color: fields.length > 1 ? '#ff4d4f' : '#d9d9d9', 
                                cursor: fields.length > 1 ? 'pointer' : 'not-allowed' 
                              }}
                              onClick={() => {
                                if (fields.length > 1) {
                                  remove(field.name);
                                }
                              }}
                            />
                          </div>
                        </div>
                    </Form.Item>
                  ))}
                </Form.Item>
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    style={{ width: '100%' }}
                  >
                    添加输出路径
                  </Button>
                  <Form.ErrorList errors={errors} />
                </Form.Item>
              </>
            )}
          </Form.List>
          <Form.Item name="sync_interval" label="同步频率" initialValue={0}>
            <FrequencyPicker />
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
