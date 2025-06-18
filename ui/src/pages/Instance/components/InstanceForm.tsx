import { Button, Drawer, Form, Input, InputNumber, Space, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { InstanceInfo } from '@/services/instance/typings';
import { useEffect, useState } from 'react';
import { testConnection } from '@/services/instance/InstanceController';

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
    const [testing, setTesting] = useState(false);

    // 监听 visible 和 editingInstance 的变化，重置表单
    useEffect(() => {
        if (visible) {
            form.setFieldsValue(editingInstance ? {
                name: editingInstance.name,
                host: editingInstance.host,
                port: editingInstance.port,
                username: editingInstance.username,
                params: editingInstance.params.map(param => {
                    const [[key, value]] = Object.entries(param);
                    return { key, value };
                }),
                remark: editingInstance.remark
            } : {
                port: 3306,
                params: []
            });
        } else {
            form.resetFields();
        }
    }, [visible, editingInstance, form]);

    const handleTestConnection = async () => {
        try {
            const values = await form.validateFields(['host', 'port', 'username', 'password']);
            
            // 在编辑模式下，如果密码为空，提示用户需要输入密码
            if (editingInstance && !values.password) {
                message.warning('请输入密码以测试连接');
                return;
            }
            
            setTesting(true);
            const res = await testConnection(values);
            if (res.code === 200) {
                message.success('连接测试成功');
            } else {
                message.error(res.message || '连接测试失败');
            }
        } catch (error: any) {
            message.error(error.message || '连接测试失败');
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            
            // 在编辑模式下，如果密码为空，则跳过连接测试
            if (!editingInstance || values.password) {
                // 先测试连接
                setTesting(true);
                const testRes = await testConnection({
                    host: values.host,
                    port: values.port,
                    username: values.username,
                    password: values.password,
                });
                if (testRes.code !== 200) {
                    message.error(testRes.message || '连接测试失败');
                    return;
                }
                setTesting(false);
            }

            // 将 params 数组转换为对象格式
            const paramsArray = values.params || [];
            const params = paramsArray.map((item: { key: string; value: string }) => ({
                [item.key]: item.value
            }));

            // 在编辑模式下，如果密码为空，则不包含密码字段
            const submitData = {
                ...values,
                params,
            };
            
            // 在编辑模式下，如果密码为空，则删除密码字段
            if (editingInstance && !values.password) {
                delete submitData.password;
            }

            await onSubmit(submitData);
        } catch (error: any) {
            message.error(error.message || '操作失败');
        } finally {
            setTesting(false);
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
                    <Button type="primary" onClick={handleSubmit} loading={testing}>
                        确定
                    </Button>
                </Space>
            }
        >
            <Form
                form={form}
                layout="vertical"
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
                    rules={[
                        { 
                            required: !editingInstance, 
                            message: '请输入密码' 
                        }
                    ]}
                    tooltip={editingInstance ? "留空则不修改密码" : undefined}
                >
                    <Input.Password placeholder={editingInstance ? "留空则不修改密码" : "请输入密码"} />
                </Form.Item>
                <Form.Item>
                    <Button 
                        onClick={handleTestConnection} 
                        loading={testing}
                    >
                        测试连接
                    </Button>
                </Form.Item>
                <Form.Item
                    label="额外参数"
                    tooltip="可以添加额外的连接参数"
                >
                    <Form.List name="params">
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
                </Form.Item>
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