import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Select, Button, Space, Radio, Alert, Modal, message, Row, Col, Card } from 'antd';
import { CreateQueryTaskRequest } from '@/services/queryTask/typings';
import { getInstanceOptions } from '@/services/instance/InstanceController';
import DatabaseSelector from './DatabaseSelector';
import SQLEditor from './SQLEditor';
import { validateSQL } from '@/services/queryTask/QueryTaskController';
import { QueryTaskTemplate, getQueryTaskTemplates, saveQueryTaskTemplate, deleteQueryTaskTemplate } from '@/utils/queryTaskTemplate';
import { DeleteOutlined } from '@ant-design/icons';

const { Option } = Select;

interface CreateTaskFormProps {
    onSubmit: (values: CreateQueryTaskRequest) => Promise<void>;
    loading?: boolean;
}

/**
 * 生成默认任务名称，避免用户每次手动命名。
 */
const generateDefaultTaskName = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');

    return `查询任务_${year}${month}${day}_${hour}${minute}${second}`;
};

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({
    onSubmit,
    loading = false,
}) => {
    const [form] = Form.useForm();
    const [instances, setInstances] = useState<{ label: string; value: number }[]>([]);
    const [selectedInstanceIds, setSelectedInstanceIds] = useState<number[]>([]);
    const [databaseMode, setDatabaseMode] = useState<'include' | 'exclude'>('include');
    const [templates, setTemplates] = useState<QueryTaskTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined);
    const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    /**
     * 重置表单，保证快速开启下一次查询配置。
     */
    const resetFormToDefault = useCallback(() => {
        form.setFieldsValue({
            task_name: generateDefaultTaskName(),
            description: '',
            instance_ids: [],
            database_mode: 'include',
            selected_dbs: [],
            sql_content: '',
        });
        setSelectedInstanceIds([]);
        setDatabaseMode('include');
        setSelectedTemplate(undefined);
    }, [form]);

    /**
     * 初始化模板与默认值，页面打开即可开始填写。
     */
    useEffect(() => {
        setTemplates(getQueryTaskTemplates());
        resetFormToDefault();
    }, [resetFormToDefault]);

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

    // 处理实例选择变化，实例变化后数据库列表需要重新选择。
    const handleInstanceChange = (instanceIds: number[]) => {
        setSelectedInstanceIds(instanceIds);
        // 实例变化时强制清空数据库，避免跨实例脏数据。
        form.setFieldsValue({ selected_dbs: [] });
    };

    // 处理数据库模式变化，模式切换后数据库选择语义会变化。
    const handleDatabaseModeChange = (mode: 'include' | 'exclude') => {
        setDatabaseMode(mode);
        // 模式变化时清空数据库，避免包含/排除语义混淆。
        form.setFieldsValue({ selected_dbs: [] });
    };

    // 获取模式说明，帮助用户理解当前执行范围。
    const getModeDescription = () => {
        // 包含模式只命中选中的数据库，适合精准查询。
        if (databaseMode === 'include') {
            return {
                type: 'info' as const,
                message: '系统将只在您选中的数据库上执行SQL语句。',
            };
        } else {
            // 排除模式会在实例全库执行，适合大范围排查。
            return {
                type: 'warning' as const,
                message: '系统将在所选实例的所有数据库中执行SQL语句，但排除您选中的数据库。',
            };
        }
    };

    // 提交前先做表单与 SQL 合法性双重校验。
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const sqlContent = values.sql_content;
            const validateRes = await validateSQL(sqlContent);
            if (!validateRes || validateRes.code !== 200 || !validateRes.data?.valid) {
                throw new Error(validateRes?.data?.error || validateRes?.message || 'SQL语句校验失败');
            }
            await onSubmit(values);
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error('表单验证失败:', error);
            // 只有 SQL 校验失败时才写入 SQL 字段错误提示。
            if (error?.message && !error?.errorFields) {
                form.setFields([{
                    name: 'sql_content',
                    errors: [error.message],
                }]);
            }
        }
    };

    // 模板选择后直接回填，减少重复配置。
    const handleTemplateSelect = (templateName?: string) => {
        setSelectedTemplate(templateName);
        if (!templateName) {
            return;
        }

        const template = templates.find(t => t.name === templateName);
        if (template) {
            form.setFieldsValue(template.values);
            // 模板中带实例时，需要同步更新数据库加载条件。
            if (template.values.instance_ids) {
                setSelectedInstanceIds(template.values.instance_ids);
            }
            // 模板中带模式时，需要同步更新模式说明与字段标签。
            if (template.values.database_mode) {
                setDatabaseMode(template.values.database_mode);
            }
            message.success(`已从模板 "${templateName}" 加载配置`);
        }
    };

    // 保存模板前先检查核心字段，避免保存空模板。
    const handleShowSaveModal = () => {
        const values = form.getFieldsValue(['instance_ids', 'database_mode', 'selected_dbs', 'sql_content']);
        const hasSQL = Boolean(String(values.sql_content || '').trim());
        const hasInstances = Array.isArray(values.instance_ids) && values.instance_ids.length > 0;
        if (!hasSQL && !hasInstances) {
            message.warning('请至少填写 SQL 内容或选择实例后再保存模板');
            return;
        }
        setNewTemplateName('');
        setIsSaveModalVisible(true);
    };

    // 保存模板并刷新模板列表。
    const handleSaveTemplate = () => {
        const templateName = newTemplateName.trim();
        if (!templateName) {
            message.error('模板名称不能为空');
            return;
        }
        const valuesToSave = form.getFieldsValue(['instance_ids', 'database_mode', 'selected_dbs', 'sql_content']);
        const newTemplate: QueryTaskTemplate = {
            name: templateName,
            createdAt: new Date().toISOString(),
            values: valuesToSave,
        };
        const newTemplates = saveQueryTaskTemplate(newTemplate);
        setTemplates(newTemplates);
        setSelectedTemplate(newTemplate.name);
        setIsSaveModalVisible(false);
        message.success(`模板 "${templateName}" 已保存`);
    };

    // 删除当前模板，避免历史模板堆积造成干扰。
    const handleDeleteTemplate = () => {
        if (!selectedTemplate) {
            return;
        }

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
            <Form
                form={form}
                layout="vertical"
            >
                <Space direction="vertical" size={24} style={{ display: 'flex', width: '100%' }}>
                    {/* 顶部部分：基础配置，横向铺开 */}
                    <Card
                        title="基础任务配置"
                        bordered={false}
                        styles={{ header: { fontWeight: 'bold' }, body: { paddingBottom: 0 } }}
                    >
                        <Row gutter={24}>
                            <Col xs={24} md={8}>
                                <Form.Item label="查询模板">
                                    <Space.Compact style={{ width: '100%' }}>
                                        <Select
                                            placeholder="从模板加载"
                                            value={selectedTemplate}
                                            onChange={(value) => handleTemplateSelect(value)}
                                            allowClear
                                            showSearch
                                            filterOption={(input, option) =>
                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            options={templates.map(t => ({ value: t.name, label: t.name }))}
                                        />
                                        <Button onClick={handleShowSaveModal}>保存</Button>
                                        <Button
                                            icon={<DeleteOutlined />}
                                            danger
                                            disabled={!selectedTemplate}
                                            onClick={handleDeleteTemplate}
                                        />
                                    </Space.Compact>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="task_name"
                                    label="任务名称"
                                    rules={[
                                        { required: true, message: '请输入任务名称' },
                                        { max: 100, message: '不能超过100个字符' },
                                    ]}
                                >
                                    <Input placeholder="请输入任务名称" allowClear />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="description"
                                    label="任务描述"
                                    rules={[
                                        { max: 500, message: '不能超过500个字符' },
                                    ]}
                                >
                                    <Input placeholder="请输入描述（可选）" allowClear maxLength={500} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    <Row gutter={24} align="stretch">
                        {/* 左边：展示范围选择 */}
                        <Col xs={24} xl={10}>
                            <Card
                                title="设置执行范围"
                                bordered={false}
                                styles={{ header: { fontWeight: 'bold' }, body: { height: '100%' } }}
                                style={{ height: '100%' }}
                            >
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
                                    label="匹配模式"
                                    rules={[{ required: true, message: '请选择模式' }]}
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

                                <Alert
                                    message={modeDesc.message}
                                    type={modeDesc.type}
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                />

                                <Form.Item
                                    name="selected_dbs"
                                    label={databaseMode === 'include' ? '包含的数据库' : '排除的数据库'}
                                    rules={[{ required: true, message: '请选择数据库' }]}
                                    style={{ marginBottom: 0 }}
                                >
                                    <DatabaseSelector
                                        instanceIds={selectedInstanceIds}
                                        disabled={selectedInstanceIds.length === 0}
                                    />
                                </Form.Item>
                            </Card>
                        </Col>

                        {/* 右边：SQL输入区及操作按钮 */}
                        <Col xs={24} xl={14}>
                            <Space direction="vertical" size={24} style={{ display: 'flex', width: '100%', height: '100%' }}>
                                <Card
                                    title="SQL 查询"
                                    bordered={false}
                                    styles={{ header: { fontWeight: 'bold' } }}
                                >
                                    <Form.Item
                                        name="sql_content"
                                        rules={[
                                            { required: true, message: '请输入SQL语句' },
                                            { min: 1, message: 'SQL语句不能为空' },
                                        ]}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <SQLEditor height={320} />
                                    </Form.Item>
                                </Card>

                                <Card bordered={false}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                                        <Button onClick={resetFormToDefault}>
                                            重置所有配置
                                        </Button>
                                        <Button
                                            type="primary"
                                            onClick={handleSubmit}
                                            loading={loading}
                                        >
                                            创建任务并查看详情
                                        </Button>
                                    </div>
                                </Card>
                            </Space>
                        </Col>
                    </Row>
                </Space>
            </Form>

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
