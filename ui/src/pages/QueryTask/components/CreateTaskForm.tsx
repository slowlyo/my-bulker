import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Select, Button, Space, Radio, Alert, Modal, message, Row, Col, Card, ColorPicker, Checkbox, Tooltip } from 'antd';
import { CreateQueryTaskRequest } from '@/services/queryTask/typings';
import { getInstanceOptions } from '@/services/instance/InstanceController';
import DatabaseSelector from './DatabaseSelector';
import SQLEditor from './SQLEditor';
import { validateSQL } from '@/services/queryTask/QueryTaskController';
import {
    QueryTaskTemplate,
    getQueryTaskTemplates,
    saveQueryTaskTemplate,
    updateQueryTaskTemplate,
    deleteQueryTaskTemplate,
    DEFAULT_TEMPLATE_COLORS,
    getContrastTextColor,
} from '@/utils/queryTaskTemplate';
import { DeleteOutlined, EditOutlined, ReloadOutlined, ClearOutlined, PlayCircleOutlined } from '@ant-design/icons';

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

    // 新建模态框相关状态
    const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateColor, setNewTemplateColor] = useState<string>(DEFAULT_TEMPLATE_COLORS[0]);

    // 修改模态框相关状态
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingTemplateName, setEditingTemplateName] = useState('');
    const [editingTemplateColor, setEditingTemplateColor] = useState<string>(DEFAULT_TEMPLATE_COLORS[0]);
    const [syncCurrentFormValues, setSyncCurrentFormValues] = useState<boolean>(true);

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
        // 未配置关键查询要素时予以拦截
        if (!hasSQL && !hasInstances) {
            message.warning('请至少填写 SQL 内容或选择实例后再保存模板');
            return;
        }
        setNewTemplateName('');
        setNewTemplateColor(DEFAULT_TEMPLATE_COLORS[0]);
        setIsSaveModalVisible(true);
    };

    // 保存新建模板并将其加入模板列表。
    const handleSaveTemplate = () => {
        const templateName = newTemplateName.trim();
        // 模板名称必填校验
        if (!templateName) {
            message.error('模板名称不能为空');
            return;
        }
        const valuesToSave = form.getFieldsValue(['instance_ids', 'database_mode', 'selected_dbs', 'sql_content']);
        const newTemplate: QueryTaskTemplate = {
            name: templateName,
            createdAt: new Date().toISOString(),
            color: newTemplateColor,
            values: valuesToSave,
        };
        const newTemplates = saveQueryTaskTemplate(newTemplate);
        setTemplates(newTemplates);
        setSelectedTemplate(newTemplate.name);
        setIsSaveModalVisible(false);
        message.success(`模板 "${templateName}" 已保存`);
    };

    // 打开编辑模板弹窗，并回填当前选中模板的名称、颜色和同步选项。
    const handleShowEditModal = () => {
        // 未选中任何模板时无需处理
        if (!selectedTemplate) {
            return;
        }

        const currentTemplate = templates.find(t => t.name === selectedTemplate);
        // 未找到对应的模板缓存数据时提示错误
        if (!currentTemplate) {
            message.error('未找到对应模板数据');
            return;
        }

        setEditingTemplateName(currentTemplate.name);
        setEditingTemplateColor(currentTemplate.color || DEFAULT_TEMPLATE_COLORS[0]);
        setSyncCurrentFormValues(true);
        setIsEditModalVisible(true);
    };

    // 提交模板修改，支持更新名称、背景色以及可选择性覆盖查询配置。
    const handleUpdateTemplate = () => {
        // 未选中模板时直接返回
        if (!selectedTemplate) {
            return;
        }

        const templateName = editingTemplateName.trim();
        // 校验修改后的模板名称非空
        if (!templateName) {
            message.error('模板名称不能为空');
            return;
        }

        const targetTemplate = templates.find(t => t.name === selectedTemplate);
        // 模板丢失时的安全兜底
        if (!targetTemplate) {
            message.error('原模板不存在');
            return;
        }

        // 根据开关决定覆盖当前表单配置还是保留模板已有配置
        const valuesToSave = syncCurrentFormValues
            ? form.getFieldsValue(['instance_ids', 'database_mode', 'selected_dbs', 'sql_content'])
            : targetTemplate.values;

        const updatedTemplate: QueryTaskTemplate = {
            name: templateName,
            createdAt: targetTemplate.createdAt,
            color: editingTemplateColor,
            values: valuesToSave,
        };

        try {
            const newTemplates = updateQueryTaskTemplate(selectedTemplate, updatedTemplate);
            setTemplates(newTemplates);
            // 修改成功后选中项同步更新为新模板名
            setSelectedTemplate(updatedTemplate.name);
            setIsEditModalVisible(false);
            message.success(`模板 "${templateName}" 已修改`);
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error('更新模板失败:', error);
            // 捕获重名等校验异常并友好提示
            message.error(error?.message || '更新模板失败');
        }
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
    const currentSelectedTemplate = templates.find(t => t.name === selectedTemplate);

    // 实时监听关键表单字段，驱动底部执行范围摘要的动态响应
    const watchedInstanceIds = Form.useWatch('instance_ids', form) || [];
    const watchedSelectedDbs = Form.useWatch('selected_dbs', form) || [];
    const watchedMode = Form.useWatch('database_mode', form) || 'include';

    // 生成模板下拉选项，配置背景色和高对比度文本样式
    const templateOptions = templates.map(t => ({
        value: t.name,
        label: t.name,
        color: t.color,
        style: t.color
            ? {
                  backgroundColor: t.color,
                  color: getContrastTextColor(t.color),
                  borderRadius: '4px',
                  margin: '2px 0',
              }
            : {
                  borderRadius: '4px',
                  margin: '2px 0',
              },
    }));

    /**
     * 重新生成默认的任务名称，便于用户快速切换为最新时间戳。
     */
    const handleRefreshTaskName = () => {
        form.setFieldValue('task_name', generateDefaultTaskName());
        message.success('已刷新任务名称');
    };

    /**
     * 快捷清空当前 SQL 编辑器内容。
     */
    const handleClearSQL = () => {
        form.setFieldValue('sql_content', '');
    };

    /**
     * 获取当前执行范围的实时统计文案，在提交前给用户直观预期。
     */
    const getExecutionSummaryText = () => {
        const instanceCount = Array.isArray(watchedInstanceIds) ? watchedInstanceIds.length : 0;
        const dbCount = Array.isArray(watchedSelectedDbs) ? watchedSelectedDbs.length : 0;

        // 未选择任何实例时提示配置前置项
        if (instanceCount === 0) {
            return '未指定执行实例';
        }

        // 包含模式提示精准覆盖的库数量
        if (watchedMode === 'include') {
            return `覆盖 ${instanceCount} 个实例中的 ${dbCount} 个数据库`;
        }
        // 排除模式提示全量并标明排除的库数量
        return `覆盖 ${instanceCount} 个实例的所有库（排除 ${dbCount} 个）`;
    };

    return (
        <>
            <Form
                form={form}
                layout="vertical"
            >
                <div className="flex flex-col gap-4 w-full">
                    {/* 顶部全局模板预设工具条 */}
                    <div className="bg-white p-3.5 px-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                            <span className="text-xs font-semibold text-slate-500 shrink-0">
                                查询模板
                            </span>
                            <div className="w-64 max-w-full">
                                <Select
                                    placeholder="从模板加载配置"
                                    value={selectedTemplate}
                                    onChange={(value) => handleTemplateSelect(value)}
                                    allowClear
                                    showSearch
                                    style={{ width: '100%' }}
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={templateOptions}
                                    optionRender={(option) => {
                                        const itemColor = option.data.color;
                                        const textColor = getContrastTextColor(itemColor);
                                        return (
                                            <div
                                                className="w-full flex items-center justify-between px-1.5 py-0.5"
                                                style={{ color: textColor }}
                                            >
                                                <span className="truncate font-medium">{option.data.label}</span>
                                                {itemColor && (
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0 ml-2"
                                                        style={{ backgroundColor: itemColor }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    }}
                                    styles={
                                        currentSelectedTemplate?.color
                                            ? {
                                                  selector: {
                                                      backgroundColor: currentSelectedTemplate.color,
                                                      color: getContrastTextColor(currentSelectedTemplate.color),
                                                  },
                                              }
                                            : undefined
                                    }
                                />
                            </div>
                            {selectedTemplate && (
                                <span className="text-xs text-slate-400 hidden sm:inline">
                                    当前已载入: <span className="font-medium text-slate-600">{selectedTemplate}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button onClick={handleShowSaveModal}>
                                存为新模板
                            </Button>
                            <Button
                                icon={<EditOutlined />}
                                disabled={!selectedTemplate}
                                onClick={handleShowEditModal}
                            >
                                修改模板
                            </Button>
                            <Button
                                icon={<DeleteOutlined />}
                                danger
                                disabled={!selectedTemplate}
                                onClick={handleDeleteTemplate}
                            />
                        </div>
                    </div>

                    {/* 主体工作台双栏布局 */}
                    <Row gutter={16} align="stretch">
                        {/* 左侧：任务基础信息与执行目标范围 */}
                        <Col xs={24} lg={10} xl={9}>
                            <Card
                                title="任务与执行目标"
                                bordered={false}
                                styles={{ header: { fontWeight: 600, borderBottom: '1px solid #f1f5f9' }, body: { padding: '20px' } }}
                                className="border border-slate-200 rounded-lg shadow-xs h-full"
                            >
                                <Form.Item
                                    name="task_name"
                                    label="任务名称"
                                    rules={[
                                        { required: true, message: '请输入任务名称' },
                                        { max: 100, message: '不能超过100个字符' },
                                    ]}
                                >
                                    <Input
                                        placeholder="请输入任务名称"
                                        allowClear
                                        suffix={
                                            <Tooltip title="重新生成当前时间戳名称">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<ReloadOutlined className="text-neutral-400 hover:text-neutral-700" />}
                                                    onClick={handleRefreshTaskName}
                                                />
                                            </Tooltip>
                                        }
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="description"
                                    label="任务描述"
                                    rules={[
                                        { max: 500, message: '不能超过500个字符' },
                                    ]}
                                >
                                    <Input.TextArea
                                        placeholder="请输入描述说明（可选）"
                                        allowClear
                                        maxLength={500}
                                        autoSize={{ minRows: 2, maxRows: 3 }}
                                    />
                                </Form.Item>

                                <div className="h-px bg-neutral-100 my-4" />

                                <Form.Item
                                    name="instance_ids"
                                    label="选择目标实例"
                                    rules={[{ required: true, message: '请选择实例' }]}
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="请选择目标实例"
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
                                        <Radio value="include">包含模式</Radio>
                                        <Radio value="exclude">排除模式</Radio>
                                    </Radio.Group>
                                </Form.Item>

                                <Alert
                                    message={modeDesc.message}
                                    type={modeDesc.type}
                                    showIcon
                                    className="mb-4 text-xs"
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

                        {/* 右侧：一体化 SQL 查询与提交中心 */}
                        <Col xs={24} lg={14} xl={15}>
                            <Card
                                title="SQL 查询语句"
                                bordered={false}
                                styles={{ header: { fontWeight: 600, borderBottom: '1px solid #f1f5f9' }, body: { padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 56px)' } }}
                                className="border border-slate-200 rounded-lg shadow-xs h-full"
                                extra={
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<ClearOutlined />}
                                        onClick={handleClearSQL}
                                        className="text-slate-400 hover:text-slate-700 text-xs"
                                    >
                                        清空
                                    </Button>
                                }
                            >
                                <Form.Item
                                    name="sql_content"
                                    rules={[
                                        { required: true, message: '请输入SQL语句' },
                                        { min: 1, message: 'SQL语句不能为空' },
                                    ]}
                                    className="mb-4 flex-1"
                                >
                                    <SQLEditor height={420} />
                                </Form.Item>

                                {/* 底部操作栏：与工作台融合，告别割裂的独立卡片 */}
                                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 mt-auto">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className={`w-2 h-2 rounded-full ${watchedInstanceIds.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <span>{getExecutionSummaryText()}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button onClick={resetFormToDefault}>
                                            重置配置
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<PlayCircleOutlined />}
                                            onClick={handleSubmit}
                                            loading={loading}
                                        >
                                            立即执行
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </div>
            </Form>

            {/* 新建模板弹窗 */}
            <Modal
                title="保存为新模板"
                open={isSaveModalVisible}
                onOk={handleSaveTemplate}
                onCancel={() => setIsSaveModalVisible(false)}
                okText="保存"
                cancelText="取消"
                destroyOnClose
            >
                <div className="flex flex-col gap-4 py-2">
                    <div>
                        <div className="text-sm font-medium mb-1.5 text-slate-700">模板名称</div>
                        <Input
                            placeholder="请输入模板名称"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            maxLength={50}
                            allowClear
                        />
                    </div>

                    <div>
                        <div className="text-sm font-medium mb-1.5 text-slate-700">模板颜色</div>
                        <div className="flex items-center gap-3">
                            <ColorPicker
                                value={newTemplateColor}
                                onChange={(color) => setNewTemplateColor(color.toHexString())}
                                presets={[
                                    {
                                        label: '预设背景色',
                                        colors: DEFAULT_TEMPLATE_COLORS,
                                    },
                                ]}
                            />
                            <span className="text-xs text-slate-500 font-mono">{newTemplateColor}</span>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                        <div className="text-xs text-slate-500 mb-2 font-medium">下拉预览效果</div>
                        <div
                            className="px-3 py-1.5 rounded text-sm font-medium inline-flex items-center justify-between gap-3 max-w-full truncate shadow-xs"
                            style={{
                                backgroundColor: newTemplateColor,
                                color: getContrastTextColor(newTemplateColor),
                                border: '1px solid rgba(0, 0, 0, 0.06)',
                            }}
                        >
                            <span className="truncate">{newTemplateName.trim() || '模板名称'}</span>
                            <span
                                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: newTemplateColor }}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* 修改模板弹窗 */}
            <Modal
                title="修改模板"
                open={isEditModalVisible}
                onOk={handleUpdateTemplate}
                onCancel={() => setIsEditModalVisible(false)}
                okText="保存修改"
                cancelText="取消"
                destroyOnClose
            >
                <div className="flex flex-col gap-4 py-2">
                    <div>
                        <div className="text-sm font-medium mb-1.5 text-slate-700">模板名称</div>
                        <Input
                            placeholder="请输入模板名称"
                            value={editingTemplateName}
                            onChange={(e) => setEditingTemplateName(e.target.value)}
                            maxLength={50}
                            allowClear
                        />
                    </div>

                    <div>
                        <div className="text-sm font-medium mb-1.5 text-slate-700">模板颜色</div>
                        <div className="flex items-center gap-3">
                            <ColorPicker
                                value={editingTemplateColor}
                                onChange={(color) => setEditingTemplateColor(color.toHexString())}
                                presets={[
                                    {
                                        label: '预设背景色',
                                        colors: DEFAULT_TEMPLATE_COLORS,
                                    },
                                ]}
                            />
                            <span className="text-xs text-slate-500 font-mono">{editingTemplateColor}</span>
                        </div>
                    </div>

                    <div>
                        <Checkbox
                            checked={syncCurrentFormValues}
                            onChange={(e) => setSyncCurrentFormValues(e.target.checked)}
                        >
                            同步使用当前表单配置覆盖模板内容
                        </Checkbox>
                        <div className="text-xs text-slate-400 mt-1 pl-6">
                            勾选后，当前表单中的 SQL 和数据库选择也将同步更新到该模板中
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                        <div className="text-xs text-slate-500 mb-2 font-medium">下拉预览效果</div>
                        <div
                            className="px-3 py-1.5 rounded text-sm font-medium inline-flex items-center justify-between gap-3 max-w-full truncate shadow-xs"
                            style={{
                                backgroundColor: editingTemplateColor,
                                color: getContrastTextColor(editingTemplateColor),
                                border: '1px solid rgba(0, 0, 0, 0.06)',
                            }}
                        >
                            <span className="truncate">{editingTemplateName.trim() || '模板名称'}</span>
                            <span
                                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: editingTemplateColor }}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default CreateTaskForm;
