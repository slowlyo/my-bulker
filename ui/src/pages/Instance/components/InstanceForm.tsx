import { Drawer, Form, Input, InputNumber, Space, Button, message, Select, InputRef } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';
import { InstanceInfo, InstanceInfoVO } from '@/services/instance/typings';
import { testConnection } from '@/services/instance/InstanceController';
import FrequencyPicker from '@/components/FrequencyPicker';

interface InstanceFormProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: InstanceInfoVO) => Promise<boolean | void>;
    editingInstance: InstanceInfo | null;
}

const InstanceForm: React.FC<InstanceFormProps> = ({ visible, onClose, onSubmit, editingInstance }) => {
    const [form] = Form.useForm();
    const [testing, setTesting] = useState(false);
    const firstInputRef = useRef<InputRef>(null);

    useEffect(() => {
        if (visible) {
            if (editingInstance) {
                const params = editingInstance.params?.map(param => {
                    const [[key, value]] = Object.entries(param);
                    return { key, value };
                }) || [];
                form.setFieldsValue({ ...editingInstance, params });
            } else {
                form.resetFields();
                form.setFieldsValue({ port: 3306, sync_interval: 0 });
            }
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [visible, editingInstance, form]);

    const handleTestConnection = async () => {
        try {
            await form.validateFields(['host', 'port', 'username', 'password']);
            const values = form.getFieldsValue();

            if (editingInstance && !values.password) {
                message.warning('请输入密码以测试连接');
                return;
            }
            setTesting(true);

            const paramsObject = values.params?.map((item: any) => ({ [item.key]: item.value })) || [];
            const res = await testConnection({
                host: values.host,
                port: values.port,
                username: values.username,
                password: values.password || '',
                params: paramsObject,
            });

            if (res.code === 200) {
                message.success('连接成功');
            } else {
                message.error(res.message || '连接失败');
            }
        } catch (error) {
            // Validation failed
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async () => {
        setTesting(true);
        try {
            const values = await form.validateFields();
            const paramsObject = values.params?.map((item: any) => ({ [item.key]: item.value })) || [];

            if (!editingInstance || values.password) {
                const testRes = await testConnection({
                    host: values.host,
                    port: values.port,
                    username: values.username,
                    password: values.password || '',
                    params: paramsObject,
                });
                if (testRes.code !== 200) {
                    message.error(`连接测试失败: ${testRes.message}`);
                    setTesting(false);
                    return;
                }
            }

            const finalValues = { ...values, params: paramsObject };

            if (editingInstance && !values.password) {
                delete (finalValues as any).password;
            }

            await onSubmit(finalValues);
            onClose();
        } catch (error) {
            // Validation failed
        } finally {
            setTesting(false);
        }
    };

    return (
        <Drawer
            title={editingInstance ? '编辑实例' : '新增实例'}
            width={600}
            onClose={onClose}
            open={visible}
            bodyStyle={{ paddingBottom: 80 }}
            extra={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button onClick={handleSubmit} type="primary" loading={testing}>
                        提交
                    </Button>
                </Space>
            }
        >
            <Form form={form} layout="vertical">
                <Form.Item name="name" label="实例名称" rules={[{ required: true, message: '请输入实例名称' }]}>
                    <Input ref={firstInputRef} placeholder="请输入实例名称" />
                </Form.Item>
                <Form.Item label="连接信息" required>
                    <Space.Compact style={{ width: '100%' }}>
                        <Form.Item name="host" noStyle rules={[{ required: true, message: '请输入主机地址' }]}>
                            <Input placeholder="主机地址" />
                        </Form.Item>
                        <Form.Item name="port" noStyle rules={[{ required: true, message: '请输入端口' }]}>
                            <InputNumber placeholder="端口" style={{ width: '120px' }} />
                        </Form.Item>
                    </Space.Compact>
                </Form.Item>
                <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input placeholder="请输入用户名" />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={[{ required: !editingInstance, message: '请输入密码' }]} tooltip={editingInstance ? "留空则不修改密码" : ""}>
                    <Input.Password placeholder={editingInstance ? "留空则不修改密码" : "请输入密码"} />
                </Form.Item>
                <Form.Item>
                    <Button onClick={handleTestConnection} loading={testing}>测试连接</Button>
                </Form.Item>
                <Form.Item label="额外参数" tooltip="可以添加额外的连接参数">
                    <Form.List name="params">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item {...restField} name={[name, 'key']} rules={[{ required: true, message: '请输入参数名' }]}>
                                            <Input placeholder="参数名" />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true, message: '请输入参数值' }]}>
                                            <Input placeholder="参数值" />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加参数</Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Form.Item>
                <Form.Item name="remark" label="备注">
                    <Input.TextArea rows={3} placeholder="请输入备注" />
                </Form.Item>
                <Form.Item name="sync_interval" label="定时同步频率" help="设置实例下所有数据库的自动同步频率" initialValue={0}>
                    <FrequencyPicker />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default InstanceForm; 