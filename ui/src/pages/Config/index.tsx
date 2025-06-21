import React, { useEffect, useState } from "react";
import { PageContainer } from "@ant-design/pro-components";
import { Form, InputNumber, Button, message, Spin, Typography, Card } from "antd";
import { request } from "@umijs/max";

const CONFIG_KEYS = [
  { key: "max_conn", label: "数据库最大连接数", min: 1, max: 99999, default: 100 },
  { key: "concurrency", label: "查询并发数量", min: 1, max: 99999, default: 50 },
  { key: "query_timeout_sec", label: "查询超时时间(秒)", min: 1, max: 99999, default: 300 },
];

const ConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 批量获取配置
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const keys = CONFIG_KEYS.map(item => item.key);
      const res = await request("/api/configs/batch-get", {
        method: "POST",
        data: { keys },
      });
      const values: Record<string, number> = {};
      if (res?.code === 200 && Array.isArray(res.data)) {
        res.data.forEach((item: any) => {
          const def = CONFIG_KEYS.find(k => k.key === item.c_key)?.default ?? 0;
          const val = Number(item.c_value);
          values[item.c_key] = isNaN(val) ? def : val;
        });
      }
      CONFIG_KEYS.forEach(({ key, default: def }) => {
        if (typeof values[key] !== "number") values[key] = def;
      });
      form.setFieldsValue(values);
    } catch (e) {
      message.error("配置读取失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
    // eslint-disable-next-line
  }, []);

  // 保存配置
  const handleSave = async (values: Record<string, any>) => {
    setSaving(true);
    try {
      const payload = CONFIG_KEYS.map(({ key }) => ({ c_key: key, c_value: String(values[key]) }));
      const res = await request("/api/configs/save", { method: "POST", data: payload });
      if (res?.code === 200) {
        message.success("保存成功");
      } else {
        message.error(res?.message || "保存失败");
      }
    } catch (e) {
      message.error("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer ghost>
      <Card title="系统配置">
        <Spin spinning={loading}>
          <Form
            form={form}
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 18 }}
            onFinish={handleSave}
          >
            {CONFIG_KEYS.map((item) => (
              <Form.Item
                key={item.key}
                label={item.label}
                name={item.key}
                rules={[{ required: true, message: `请输入${item.label}` }]}
              >
                <InputNumber min={item.min} max={item.max} className="w-full" />
              </Form.Item>
            ))}
            <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
              <Button type="primary" htmlType="submit" loading={saving}>
                保存
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </PageContainer>
  );
};

export default ConfigPage;