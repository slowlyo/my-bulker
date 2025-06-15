import { Button, Drawer, Form, Input, InputNumber, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { InstanceInfo } from '@/services/instance/typings';

interface InstanceFormProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: any) => Promise<void>;
    editingInstance: InstanceInfo | null;
}

const InstanceForm: React.FC<InstanceFormProps> = ({
    visible,
    onClose,
    onSubmit,
    editingInstance,
}) => {
    const [form] = Form.useForm();

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            // 将 extraParams 数组转换为对象格式
            const extraParamsArray = values.extraParams || [];
            const extraParams = extraParamsArray.reduce((acc: Record<string, any>, curr: { key: string; value: string }) => {
                if (curr.key && curr.value) {
                    acc[curr.key] = curr.value;
                }
                return acc;
            }, {});

            const submitData = {
                ...values,
                extraParams,
            };

            await onSubmit(submitData);
            form.resetFields();
        } catch (error) {
            // 错误处理由父组件完成
            throw error;
        }
    };

    return (
        <Drawer
            title={editingInstance ? '编辑实例' : '新建实例'}
            open={visible}
            onClose={onClose}
            width={600}
            extra={
                <Space>
                    <Button onClick={onClose}>
                        取消
                    </Button>
                    <Button type="primary" onClick={handleSubmit}>
                        确定
                    </Button>
                </Space>
            }
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={editingInstance ? {
                    ...editingInstance,
                    extraParams: Object.entries(editingInstance.extraParams || {}).map(([key, value]) => ({
                        key,
                        value: String(value),
                    })),
                } : undefined}
            >
                <Form.Item
                    name="name"
                    label="实例名称"
                    rules={[{ required: true, message: '请输入实例名称' }]}
                >
                    <Input placeholder="请输入实例名称" />
                </Form.Item>
                <Form.Item label="连接信息" required>
                    <Space.Compact style={{ width: '100%' }}>
                        <Form.Item
                            name="host"
                            noStyle
                            rules={[{ required: true, message: '请输入主机地址' }]}
                        >
                            <Input placeholder="请输入主机地址" />
                        </Form.Item>
                        <Form.Item
                            name="port"
                            noStyle
                            rules={[
                                { required: true, message: '请输入端口' },
                                { type: 'number', min: 1, max: 65535, message: '端口范围为1-65535' }
                            ]}
                        >
                            <InputNumber 
                                placeholder="端口" 
                                style={{ width: '120px' }}
                            />
                        </Form.Item>
                    </Space.Compact>
                </Form.Item>
                <Form.Item
                    name="username"
                    label="用户名"
                    rules={[{ required: true, message: '请输入用户名' }]}
                >
                    <Input placeholder="请输入用户名" />
                </Form.Item>
                <Form.Item
                    name="password"
                    label="密码"
                    rules={[{ required: true, message: '请输入密码' }]}
                >
                    <Input.Password placeholder="请输入密码" />
                </Form.Item>
                <Form.List name="extraParams">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'key']}
                                        rules={[{ required: true, message: '请输入参数名' }]}
                                    >
                                        <Input placeholder="参数名" />
                                    </Form.Item>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'value']}
                                        rules={[{ required: true, message: '请输入参数值' }]}
                                    >
                                        <Input placeholder="参数值" />
                                    </Form.Item>
                                    <MinusCircleOutlined onClick={() => remove(name)} />
                                </Space>
                            ))}
                            <Form.Item>
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    添加参数
                                </Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>
                <Form.Item
                    name="remark"
                    label="备注"
                >
                    <Input.TextArea placeholder="请输入备注" />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default InstanceForm; 