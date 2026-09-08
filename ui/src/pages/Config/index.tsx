import React, { useEffect, useState } from "react";
import { PageContainer } from "@ant-design/pro-components";
import { Alert, Button, Card, Form, InputNumber, List, message, Space, Spin, Tag, Typography } from "antd";
import { request } from "@umijs/max";
import { DownloadOutlined } from "@ant-design/icons";
import { checkForUpdates } from "@/services/update/UpdateController";
import type { UpdateInfo } from "@/services/update/typings";
import { APP_VERSION } from "@/constants";

const CONFIG_KEYS = [
  { key: "max_conn", label: "数据库最大连接数", min: 1, max: 99999, default: 100 },
  { key: "concurrency", label: "查询并发数量", min: 1, max: 99999, default: 50 },
  { key: "query_timeout_sec", label: "查询超时时间(秒)", min: 1, max: 99999, default: 300 },
];

// 将发布资产字节数转换为便于识别的 MB。
const formatAssetSize = (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`;

// ConfigPage 管理运行参数，并展示当前环境可用的应用更新。
const ConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>();
  const [updateError, setUpdateError] = useState("");

  // 批量获取配置，并为缺失或非法值恢复界面默认值。
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

  // 保存配置项，后端按统一字符串格式持久化数值。
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

  // 检查更新；自动检查静默成功，手动检查额外反馈结果。
  const handleCheckUpdate = async (notify: boolean) => {
    setCheckingUpdate(true);
    setUpdateError("");
    try {
      const res = await checkForUpdates();
      // 成功响应必须带版本数据，否则按服务异常处理。
      if (res?.code === 200 && res.data) {
        setUpdateInfo(res.data);
        // 手动检查需要明确反馈，自动检查仅在页面内呈现结果。
        if (notify) {
          message.success(res.data.update_available ? "发现新版本" : "当前已是最新版本");
        }
        return;
      }
      setUpdateError(res?.message || "检查更新失败，请稍后重试");
    } catch (e) {
      // 网络层错误没有统一响应体，使用可直接执行的重试提示。
      setUpdateError("检查更新失败，请确认网络后重试");
    } finally {
      setCheckingUpdate(false);
    }
  };

  // 首次进入配置页时并行读取配置和更新信息，后端缓存会限制 GitHub 请求频率。
  useEffect(() => {
    void fetchConfigs();
    void handleCheckUpdate(false);
    // eslint-disable-next-line
  }, []);

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
      <Card title="版本更新" className="mt-4">
        <Space direction="vertical" size="middle" className="w-full">
          <Space wrap>
            <Typography.Text>
              当前版本：{updateInfo?.current_version || APP_VERSION}
            </Typography.Text>
            {updateInfo && (
              <Tag>{updateInfo.runtime_mode === "desktop" ? "桌面版" : "服务端"}</Tag>
            )}
            {updateInfo && (
              <Typography.Text type="secondary">
                {updateInfo.os}/{updateInfo.arch}
              </Typography.Text>
            )}
          </Space>

          <Button loading={checkingUpdate} onClick={() => void handleCheckUpdate(true)}>
            检查更新
          </Button>

          {updateError && (
            <Alert type="error" showIcon message={updateError} />
          )}

          {updateInfo?.update_available && (
            <Alert
              type="success"
              showIcon
              message={`发现新版本 ${updateInfo.latest_version}`}
              description={
                updateInfo.include_preview
                  ? "当前为预发布版本，已同时检查稳定版和预发布版。"
                  : "当前为稳定版本，仅检查最新稳定版。"
              }
              action={
                updateInfo.recommended_asset ? (
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    href={updateInfo.recommended_asset.download_url}
                    target="_blank"
                  >
                    下载 {formatAssetSize(updateInfo.recommended_asset.size)}
                  </Button>
                ) : (
                  <Button href={updateInfo.release_url} target="_blank">
                    打开发布页
                  </Button>
                )
              }
            />
          )}

          {updateInfo && !updateInfo.update_available && (
            <Alert
              type="success"
              showIcon
              message={`当前已是最新版本（${updateInfo.latest_version}）`}
            />
          )}

          {updateInfo?.update_available && !updateInfo.recommended_asset && (
            <Alert
              type="warning"
              showIcon
              message="未找到完全匹配当前环境的安装包"
              description="请从以下候选包中选择，或打开发布页查看说明。"
            />
          )}

          {updateInfo?.update_available && !updateInfo.recommended_asset && (
            <List
              size="small"
              bordered
              dataSource={updateInfo.assets}
              renderItem={(asset) => (
                <List.Item
                  actions={[
                    <Typography.Link
                      key={asset.name}
                      href={asset.download_url}
                      target="_blank"
                    >
                      下载
                    </Typography.Link>,
                  ]}
                >
                  <Typography.Text>{asset.name}</Typography.Text>
                  <Typography.Text type="secondary">
                    {formatAssetSize(asset.size)}
                  </Typography.Text>
                </List.Item>
              )}
            />
          )}

          {updateInfo && (
            <Typography.Link href={updateInfo.release_url} target="_blank">
              查看 GitHub Release
            </Typography.Link>
          )}
        </Space>
      </Card>
    </PageContainer>
  );
};

export default ConfigPage;