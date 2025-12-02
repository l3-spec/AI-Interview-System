import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  message,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload
} from 'antd';
import {
  LoadingOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  UploadOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { companyApi } from '../../services/api';
import type { Company, CompanyStat } from '../../types/interview';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const industryOptions = [
  '互联网/IT',
  '金融',
  '教育',
  '医疗',
  '制造业',
  '能源',
  '房地产',
  '消费品',
  '其他'
];

const scaleOptions = [
  '1-50人',
  '51-200人',
  '201-500人',
  '501-1000人',
  '1000人以上'
];

const normalizeStringList = (values?: string[]): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((item) => (item || '').trim())
    .filter((item) => item.length > 0);
};

const normalizeStatsList = (values?: CompanyStat[]): CompanyStat[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((item) => ({
      label: (item?.label || '').trim(),
      value: (item?.value || '').trim(),
      accent: item?.accent ? item.accent.trim() : undefined
    }))
    .filter((item) => item.label.length > 0 && item.value.length > 0);
};

const mapCompanyToFormValues = (company: Company) => ({
  name: company.name,
  description: company.description,
  industry: company.industry,
  scale: company.scale,
  address: company.address,
  website: company.website,
  contact: company.contact,
  logo: company.logo,
  tagline: company.tagline,
  focusArea: company.focusArea,
  themeColors: company.themeColors || [],
  highlights: company.highlights || [],
  culture: company.culture || [],
  locations: company.locations || [],
  stats: company.stats || []
});

const CompanyProfile: React.FC = () => {
  const [form] = Form.useForm();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const loadCompanyProfile = async () => {
    setLoading(true);
    try {
      const data = await companyApi.getProfile();
      setCompany(data);
      form.setFieldsValue(mapCompanyToFormValues(data));
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '获取企业信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const payload: Partial<Company> = {
        name: (values.name || '').trim(),
        description: values.description?.trim(),
        industry: values.industry,
        scale: values.scale,
        address: values.address?.trim(),
        website: values.website?.trim(),
        contact: values.contact?.trim(),
        logo: values.logo,
        tagline: values.tagline?.trim(),
        focusArea: values.focusArea?.trim(),
        themeColors: normalizeStringList(values.themeColors),
        highlights: normalizeStringList(values.highlights),
        culture: normalizeStringList(values.culture),
        locations: normalizeStringList(values.locations),
        stats: normalizeStatsList(values.stats)
      };

      const updated = await companyApi.updateProfile(payload);
      message.success('企业信息更新成功');
      setCompany(updated);
      form.setFieldsValue(mapCompanyToFormValues(updated));
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '更新企业信息失败');
    } finally {
      setSaving(false);
    }
  };

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件');
      return Upload.LIST_IGNORE;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过 2MB');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const uploadProps: UploadProps = useMemo(() => ({
    name: 'logo',
    showUploadList: false,
    beforeUpload,
    customRequest: async (options) => {
      const { file, onError, onSuccess } = options;
      setLogoUploading(true);
      try {
        const response = await companyApi.uploadLogo(file as File);
        const logoUrl = response?.data?.logoUrl || response?.data?.company?.logo;
        if (logoUrl) {
          form.setFieldsValue({ logo: logoUrl });
          setCompany((prev) => (prev ? { ...prev, logo: logoUrl } : prev));
        }
        message.success(response?.message || 'Logo 上传成功');
        onSuccess?.(response, new XMLHttpRequest());
      } catch (error: any) {
        const errMsg = error?.message || error?.response?.data?.message;
        message.error(errMsg || 'Logo 上传失败');
        onError?.(error);
      } finally {
        setLogoUploading(false);
      }
    }
  }), [form]);

  if (loading && !company) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space align="center">
              {form.getFieldValue('logo') ? (
                <img
                  src={form.getFieldValue('logo')}
                  alt="企业 Logo"
                  style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'contain', border: '1px solid #f0f0f0' }}
                />
              ) : (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    border: '1px dashed #d9d9d9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999'
                  }}
                >
                  无 Logo
                </div>
              )}
              <Upload {...uploadProps}>
                <Button type="primary" icon={logoUploading ? <LoadingOutlined spin /> : <UploadOutlined />}>
                  {logoUploading ? '上传中' : '上传 Logo'}
                </Button>
              </Upload>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space size="middle">
              <Tag color={company?.isActive ? 'green' : 'red'}>
                {company?.isActive ? '账号正常' : '账号停用'}
              </Tag>
              <Tag color={company?.isVerified ? 'blue' : 'gold'}>
                {company?.isVerified ? '已认证企业' : '待认证'}
              </Tag>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">企业邮箱：{company?.email || '-'}</Text>
            </div>
            <div>
              <Text type="secondary">注册时间：{company ? new Date(company.createdAt).toLocaleString() : '-'}</Text>
            </div>
          </Col>
        </Row>
      </Card>

      <Card title="企业资料" bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={company ? mapCompanyToFormValues(company) : undefined}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="企业名称"
                name="name"
                rules={[{ required: true, message: '请输入企业名称' }]}
              >
                <Input placeholder="请输入企业名称" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="企业标语" name="tagline">
                <Input placeholder="一句话介绍企业" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label="所属行业" name="industry">
                <Select placeholder="请选择所属行业" allowClear>
                  {industryOptions.map((option) => (
                    <Option key={option} value={option}>
                      {option}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="公司规模" name="scale">
                <Select placeholder="请选择公司规模" allowClear>
                  {scaleOptions.map((option) => (
                    <Option key={option} value={option}>
                      {option}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label="公司地址" name="address">
                <Input placeholder="请输入公司地址" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="公司网站"
                name="website"
                rules={[{ type: 'url', message: '请输入有效的网址' }]}
              >
                <Input placeholder="https://example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label="企业联系人" name="contact">
                <Input placeholder="请输入联系人信息" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="业务聚焦领域" name="focusArea">
                <Input placeholder="例如：智能招聘、AI面试" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="企业简介" name="description">
            <TextArea rows={4} placeholder="请输入企业简介，支持多行内容" showCount maxLength={800} />
          </Form.Item>

          <Divider orientation="left">企业亮点</Divider>
          <Form.List name="highlights">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex' }}>
                    <Form.Item {...field} style={{ flex: 1 }}>
                      <Input placeholder="请输入企业亮点" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  添加企业亮点
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider orientation="left">企业文化</Divider>
          <Form.List name="culture">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex' }}>
                    <Form.Item {...field} style={{ flex: 1 }}>
                      <Input placeholder="请输入企业文化价值观" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  添加文化标签
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider orientation="left">办公地点</Divider>
          <Form.List name="locations">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex' }}>
                    <Form.Item {...field} style={{ flex: 1 }}>
                      <Input placeholder="请输入办公地点" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  添加办公地点
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider orientation="left">主题色设置</Divider>
          <Form.List name="themeColors">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Space key={field.key} align="center">
                    <Form.Item
                      {...field}
                      rules={[{
                        pattern: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
                        message: '请输入有效的十六进制颜色值'
                      }]}
                    >
                      <Input placeholder="#1890ff" style={{ width: 160 }} />
                    </Form.Item>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: '1px solid #f0f0f0',
                        background: form.getFieldValue(['themeColors', field.name]) || '#fff'
                      }}
                    />
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add('#1890ff')} icon={<PlusOutlined />}>
                  添加主题色
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider orientation="left">企业数据概览</Divider>
          <Form.List name="stats">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Row gutter={16} key={field.key} align="middle">
                    <Col xs={24} sm={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'label']}
                        fieldKey={[field.fieldKey, 'label']}
                        rules={[{ required: true, message: '请输入指标名称' }]}
                      >
                        <Input placeholder="指标名称" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'value']}
                        fieldKey={[field.fieldKey, 'value']}
                        rules={[{ required: true, message: '请输入指标数值' }]}
                      >
                        <Input placeholder="指标数值" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'accent']}
                        fieldKey={[field.fieldKey, 'accent']}
                        rules={[{
                          pattern: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
                          message: '请输入合法颜色值',
                          validateTrigger: 'onBlur'
                        }]}
                      >
                        <Input placeholder="主题色（可选）" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={2}>
                      <MinusCircleOutlined onClick={() => remove(field.name)} />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  添加指标
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存修改
            </Button>
            <Button onClick={() => form.resetFields()} disabled={saving}>
              重置表单
            </Button>
            <Button onClick={loadCompanyProfile} loading={loading} disabled={saving}>
              重新加载
            </Button>
          </Space>
        </Form>
      </Card>

      {company && (
        <Card title="企业当前数据" bordered={false}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="企业名称">{company.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="行业">{company.industry || '-'}</Descriptions.Item>
            <Descriptions.Item label="规模">{company.scale || '-'}</Descriptions.Item>
            <Descriptions.Item label="官网">{company.website || '-'}</Descriptions.Item>
            <Descriptions.Item label="最近更新">{new Date(company.updatedAt).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Space>
  );
};

export default CompanyProfile;
