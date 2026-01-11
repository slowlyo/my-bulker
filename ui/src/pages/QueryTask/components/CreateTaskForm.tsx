import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Space, Radio, Alert, Drawer, Modal, message, Row, Col, Divider, Card } from 'antd';
import { CreateQueryTaskRequest } from '@/services/queryTask/typings';
import { getInstanceOptions } from '@/services/instance/InstanceController';
import DatabaseSelector from './DatabaseSelector';
import SQLEditor from './SQLEditor';
import { validateSQL } from '@/services/queryTask/QueryTaskController';
import { QueryTaskTemplate, getQueryTaskTemplates, saveQueryTaskTemplate, deleteQueryTaskTemplate } from '@/utils/queryTaskTemplate';
import { DeleteOutlined } from '@ant-design/icons';

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
    const [templates, setTemplates] = useState<QueryTaskTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined);
    const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

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

    // 加载模板
    useEffect(() => {
        setTemplates(getQueryTaskTemplates());
    }, []);

    // 监听 visible 的变化，重置表单
    useEffect(() => {
        if (visible) {
            form.setFieldsValue({
                database_mode: 'include',
                task_name: generateDefaultTaskName(),
            });
            setSelectedInstanceIds([]);
            setDatabaseMode('include');
            setSelectedTemplate(undefined);
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
            // 新增：先校验SQL合法性
            const sqlContent = values.sql_content;
            const validateRes = await validateSQL(sqlContent);
            if (!validateRes || validateRes.code !== 200 || !validateRes.data?.valid) {
                throw new Error(validateRes?.data?.error || validateRes?.message || 'SQL语句校验失败');
            }
            await onSubmit(values);
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error('表单验证失败:', error);
            if (error.message) {
                form.setFields([{
                    name: 'sql_content',
                    errors: [error.message],
                }]);
            }
        }
    };

    const handleTemplateSelect = (templateName: string) => {
        setSelectedTemplate(templateName);
        if (!templateName) {
            return
        };
    
        const template = templates.find(t => t.name === templateName);
        if (template) {
            form.setFieldsValue(template.values);
            // 手动触发依赖状态更新
            if (template.values.instance_ids) {
                setSelectedInstanceIds(template.values.instance_ids);
            }
            if (template.values.database_mode) {
                setDatabaseMode(template.values.database_mode);
            }
            message.success(`已从模板 "${templateName}" 加载配置`);
        }
    };
    
    const handleShowSaveModal = () => {
        const values = form.getFieldsValue(['instance_ids', 'database_mode', 'selected_dbs', 'sql_content']);
        if (!values.sql_content && !values.instance_ids) {
            message.warning('请至少填写 SQL 内容或选择实例后再保存模板');
            return;
        }
        setNewTemplateName(''); 
        setIsSaveModalVisible(true);
    };

    const handleSaveTemplate = () => {
        if (!newTemplateName) {
            message.error('模板名称不能为空');
            return;
        }
        const valuesToSave = form.getFieldsValue(['instance_ids', 'database_mode', 'selected_dbs', 'sql_content']);
        const newTemplate: QueryTaskTemplate = {
            name: newTemplateName,
            createdAt: new Date().toISOString(),
            values: valuesToSave,
        };
        const newTemplates = saveQueryTaskTemplate(newTemplate);
        setTemplates(newTemplates);
        setSelectedTemplate(newTemplate.name);
        setIsSaveModalVisible(false);
        message.success(`模板 "${newTemplateName}" 已保存`);
    };
    
    const handleDeleteTemplate = () => {
        if (!selectedTemplate) return;
    
        Modal.confirm({
            title: '确认删除',
            content: `您确定要删除模板 "${selectedTemplate}" 吗？此操作无法撤销。`,
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: () => {
                const newTemplates = deleteQueryTaskTemplate(selectedTemplate);
                setTemplates(newTemplates);
                setSelectedTemplate(undefined);
                message.success('模板已删除');
            },
        });
    };

    const modeDesc = getModeDescription();

    return (
        <>
        <Drawer
            title="创建查询任务"
            open={visible}
            onClose={onClose}
            width={800}
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Space>
                        <Button onClick={onClose}>
                            取消
                        </Button>
                        <Button type="primary" onClick={handleSubmit} loading={loading}>
                            创建任务
                        </Button>
                    </Space>
                </div>
            }
        >
            <Form
                form={form}
                layout="vertical"
            >
                <Card size="small" styles={{ body: { padding: 16 } }}>
                    <Form.Item label="查询模板">
                        <Space.Compact style={{ width: '100%' }}>
                            <Select
                                placeholder="从模板加载或选择模板进行管理"
                                value={selectedTemplate}
                                onChange={handleTemplateSelect}
                                allowClear
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={templates.map(t => ({ value: t.name, label: t.name }))}
                            />
                            <Button onClick={handleShowSaveModal}>
                                存为模板
                            </Button>
                            <Button
                                icon={<DeleteOutlined />}
                                danger
                                disabled={!selectedTemplate}
                                onClick={handleDeleteTemplate}
                            />
                        </Space.Compact>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
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
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="description"
                                label="任务描述"
                                rules={[
                                    { max: 500, message: '任务描述不能超过500个字符' },
                                ]}
                            >
                                <Input placeholder="请输入任务描述（可选）" allowClear maxLength={500} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={16}>
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
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                name="database_mode"
                                label="选择模式"
                                rules={[{ required: true, message: '请选择数据库选择模式' }]}
                            >
                                <Radio.Group
                                    optionType="button"
                                    buttonStyle="solid"
                                    onChange={(e) => handleDatabaseModeChange(e.target.value)}
                                >
                                    <Radio value="include">包含</Radio>
                                    <Radio value="exclude">排除</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Alert message={modeDesc.message} type={modeDesc.type} showIcon />
                </Card>

                <Divider style={{ margin: '16px 0' }} />

                <Card size="small" styles={{ body: { padding: 16 } }}>
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
                </Card>
            </Form>
        </Drawer>

        <Modal
            title="保存为模板"
            open={isSaveModalVisible}
            onOk={handleSaveTemplate}
            onCancel={() => setIsSaveModalVisible(false)}
            okText="保存"
            cancelText="取消"
        >
            <Input
                placeholder="请输入模板名称"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
            />
        </Modal>
        </>
    );
};

export default CreateTaskForm; 