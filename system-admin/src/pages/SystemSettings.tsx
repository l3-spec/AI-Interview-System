import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { platformAiSettingsApi, PlatformAiSettingsDTO } from '../services/api';

const { Title, Paragraph, Text } = Typography;

type FormValues = {
  dashscopeApiKey?: string;
  deepseekApiKey?: string;
  dashscopeWsUrl?: string;
  qwenAsrModel?: string;
  qwenTtsModel?: string;
  ttsVoice?: string;
  ttsLanguage?: string;
  deepseekModel?: string;
  deepseekApiUrl?: string;
};

const SystemSettings: React.FC = () => {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<PlatformAiSettingsDTO | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await platformAiSettingsApi.get();
      if (!res.success || !res.data) {
        message.error((res as any).message || '加载失败（需超级管理员权限）');
        return;
      }
      setMeta(res.data);
      form.setFieldsValue({
        dashscopeWsUrl: res.data.dashscopeWsUrl,
        qwenAsrModel: res.data.qwenAsrModel,
        qwenTtsModel: res.data.qwenTtsModel,
        ttsVoice: res.data.ttsVoice,
        ttsLanguage: res.data.ttsLanguage,
        deepseekModel: res.data.deepseekModel,
        deepseekApiUrl: res.data.deepseekApiUrl,
      });
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFinish = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        dashscopeWsUrl: (values.dashscopeWsUrl || '').trim(),
        qwenAsrModel: (values.qwenAsrModel || '').trim(),
        qwenTtsModel: (values.qwenTtsModel || '').trim(),
        ttsVoice: (values.ttsVoice || '').trim(),
        ttsLanguage: (values.ttsLanguage || '').trim(),
        deepseekModel: (values.deepseekModel || '').trim(),
        deepseekApiUrl: (values.deepseekApiUrl || '').trim(),
      };
      const dk = (values.dashscopeApiKey || '').trim();
      if (dk) payload.dashscopeApiKey = dk;
      const lk = (values.deepseekApiKey || '').trim();
      if (lk) payload.deepseekApiKey = lk;

      const res = await platformAiSettingsApi.update(payload);
      if (!res.success) {
        message.error((res as any).message || '保存失败');
        return;
      }
      message.success(res.message || '已保存');
      form.setFieldsValue({ dashscopeApiKey: undefined, deepseekApiKey: undefined });
      await load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          系统设置 · 平台 AI 配置
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          配置百炼 DashScope（实时 ASR/TTS）、DeepSeek 大模型等。数据库中的值会覆盖 <Text code>.env</Text>；
          保存后通过 Redis 通知 ASR/TTS 微服务更新环境变量（新会话生效）。
        </Paragraph>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="权限与密钥"
        description={
          <span>
            仅 <Text strong>超级管理员（SUPER_ADMIN）</Text> 可访问此接口。
            API Key 不会在列表中明文返回；若不想修改已有密钥，请保持下方密码框为空。
            文本类字段若清空后保存，将删除数据库中的覆盖项并回退到环境变量默认值。
          </span>
        }
      />

      <Card>
        {loading ? (
          <Spin />
        ) : (
          <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 720 }}>
            {meta && (
              <Alert
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前密钥状态（脱敏）"
                description={
                  <Space direction="vertical" size={0}>
                    <Text>DashScope: {meta.dashscopeApiKeyMasked || '（未配置）'}</Text>
                    <Text>DeepSeek: {meta.deepseekApiKeyMasked || '（未配置）'}</Text>
                  </Space>
                }
              />
            )}

            <Title level={5}>DashScope 实时语音（Qwen3 ASR/TTS）</Title>
            <Form.Item
              label="DashScope API Key"
              name="dashscopeApiKey"
              extra="仅在新密钥需要写入数据库时填写"
            >
              <Input.Password placeholder="留空表示不修改" autoComplete="off" />
            </Form.Item>
            <Form.Item label="DashScope WebSocket 地址" name="dashscopeWsUrl">
              <Input placeholder="wss://dashscope.aliyuncs.com/api-ws/v1/realtime" />
            </Form.Item>
            <Form.Item label="ASR 模型" name="qwenAsrModel">
              <Input placeholder="qwen3-asr-flash-realtime" />
            </Form.Item>
            <Form.Item label="TTS 模型" name="qwenTtsModel">
              <Input placeholder="qwen3-tts-instruct-flash-realtime" />
            </Form.Item>
            <Form.Item
              label="TTS 音色（voice）"
              name="ttsVoice"
              extra="实时 TTS 须填 Qwen3 文档中的英文名（如 Cherry），不要用阿里云 NLS/CosyVoice 的 siqi 等。管理台或 .env 填错会导致 Invalid voice。"
            >
              <Input placeholder="Cherry" />
            </Form.Item>
            <Form.Item label="TTS language_type" name="ttsLanguage">
              <Input placeholder="Auto" />
            </Form.Item>

            <Title level={5} style={{ marginTop: 24 }}>
              DeepSeek / LLM
            </Title>
            <Form.Item label="DeepSeek API Key" name="deepseekApiKey" extra="对应环境变量 DEEPSEEK_API_KEY / LLM_API_KEY">
              <Input.Password placeholder="留空表示不修改" autoComplete="off" />
            </Form.Item>
            <Form.Item label="模型名" name="deepseekModel">
              <Input placeholder="deepseek-chat" />
            </Form.Item>
            <Form.Item label="Chat Completions URL" name="deepseekApiUrl">
              <Input placeholder="https://api.deepseek.com/v1/chat/completions" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                保存配置
              </Button>
              <Button style={{ marginLeft: 8 }} onClick={load} disabled={loading || saving}>
                重新加载
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default SystemSettings;
