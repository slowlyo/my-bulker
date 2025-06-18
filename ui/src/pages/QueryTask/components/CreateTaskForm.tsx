import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Space, Radio, Alert, Drawer } from 'antd';
import { CreateQueryTaskRequest } from '@/services/queryTask/typings';
import { getInstanceOptions } from '@/services/instance/InstanceController';
import DatabaseSelector from './DatabaseSelector';
import SQLEditor from './SQLEditor';

const { TextArea } = Input;
const { Option } = Select;

interface CreateTaskFormProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: CreateQueryTaskRequest) => Promise<void>;
    loading?: boolean;
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ 
    visible, 
    onClose, 
    onSubmit, 
    loading = false 
}) => {
    const [form] = Form.useForm();
    const [instances, setInstances] = useState<{ label: string; value: number }[]>([]);
    const [selectedInstanceIds, setSelectedInstanceIds] = useState<number[]>([]);
    const [databaseMode, setDatabaseMode] = useState<'include' | 'exclude'>('include');

    // 生成默认任务名称
    const generateDefaultTaskName = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        
        return `查询任务_${year}${month}${day}_${hour}${minute}${second}`;
    };

    // 监听 visible 的变化，重置表单
    useEffect(() => {
        if (visible) {
            form.setFieldsValue({
                database_mode: 'include',
                task_name: generateDefaultTaskName(),
            });
            setSelectedInstanceIds([]);
            setDatabaseMode('include');
        } else {
            form.resetFields();
        }
    }, [visible, form]);

    // 加载实例数据
    useEffect(() => {
        const loadInstances = async () => {
            try {
                const res = await getInstanceOptions();
                if (res.code === 200 && res.data) {
                    setInstances(res.data);
                }
            } catch (error) {
                console.error('加载实例数据失败:', error);
            }
        };

        loadInstances();
    }, []);

    // 处理实例选择变化
    const handleInstanceChange = (instanceIds: number[]) => {
        setSelectedInstanceIds(instanceIds);
        // 清空已选择的数据库
        form.setFieldsValue({ selected_dbs: [] });
    };

    // 处理数据库模式变化
    const handleDatabaseModeChange = (mode: 'include' | 'exclude') => {
        setDatabaseMode(mode);
        // 清空已选择的数据库
        form.setFieldsValue({ selected_dbs: [] });
    };

    // 获取模式描述
    const getModeDescription = () => {
        if (databaseMode === 'include') {
            return {
                type: 'info' as const,
                message: '系统将只在您选中的数据库上执行SQL语句。',
            };
        } else {
            return {
                type: 'warning' as const,
                message: '系统将在所选实例的所有数据库中执行SQL语句，但排除您选中的数据库。',
            };
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            await onSubmit(values);
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    };

    const modeDesc = getModeDescription();

    return (
        <Drawer
            title="创建查询任务"
            open={visible}
            onClose={onClose}
            width={800}
            extra={
                <Space>
                    <Button onClick={onClose}>
                        取消
                    </Button>
                    <Button type="primary" onClick={handleSubmit} loading={loading}>
                        创建任务
                    </Button>
                </Space>
            }
        >
            <Form
                form={form}
                layout="vertical"
            >
                <Form.Item
                    name="task_name"
                    label="任务名称"
                    rules={[
                        { required: true, message: '请输入任务名称' },
                        { max: 100, message: '任务名称不能超过100个字符' },
                    ]}
                >
                    <Input placeholder="请输入任务名称" allowClear />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="任务描述"
                    rules={[
                        { max: 500, message: '任务描述不能超过500个字符' },
                    ]}
                >
                    <TextArea
                        rows={2}
                        placeholder="请输入任务描述（可选）"
                        showCount
                        maxLength={500}
                    />
                </Form.Item>

                <Form.Item
                    name="instance_ids"
                    label="选择实例"
                    rules={[{ required: true, message: '请选择实例' }]}
                >
                    <Select
                        mode="multiple"
                        placeholder="请选择实例"
                        onChange={handleInstanceChange}
                        showSearch
                        allowClear
                        filterOption={(input, option) => {
                            if (!option?.children) return false;
                            return String(option.children).toLowerCase().includes(input.toLowerCase());
                        }}
                    >
                        {instances.map(instance => (
                            <Option key={instance.value} value={instance.value}>
                                {instance.label}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="database_mode"
                    label="选择模式"
                    rules={[{ required: true, message: '请选择数据库选择模式' }]}
                >
                    <Radio.Group onChange={(e) => handleDatabaseModeChange(e.target.value)}>
                        <Radio value="include">包含模式</Radio>
                        <Radio value="exclude">排除模式</Radio>
                    </Radio.Group>
                </Form.Item>

                <Alert
                    message={modeDesc.message}
                    type={modeDesc.type}
                    showIcon
                    style={{ marginBottom: 14 }}
                />

                <Form.Item
                    name="selected_dbs"
                    label={databaseMode === 'include' ? '包含的数据库' : '排除的数据库'}
                    rules={[{ required: true, message: '请选择数据库' }]}
                >
                    <DatabaseSelector 
                        instanceIds={selectedInstanceIds}
                        disabled={selectedInstanceIds.length === 0}
                    />
                </Form.Item>

                <Form.Item
                    name="sql_content"
                    label="SQL内容"
                    rules={[
                        { required: true, message: '请输入SQL语句' },
                        { min: 1, message: 'SQL语句不能为空' },
                    ]}
                >
                    <SQLEditor />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default CreateTaskForm; 