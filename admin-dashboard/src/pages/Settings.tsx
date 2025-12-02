import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  message,
  Row,
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
import { companyApi } from '../services/api';
import type { Company, CompanyStat, VerificationApplication } from '../types/interview';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

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
  address: company.address,
  website: company.website,
  contact: company.contact,
  logo: company.logo,
  tagline: company.tagline,
  focusArea: company.focusArea,
  promotionPage: company.promotionPage,
  themeColors: company.themeColors?.length ? company.themeColors : [''],
  highlights: company.highlights?.length ? company.highlights : [''],
  culture: company.culture?.length ? company.culture : [''],
  locations: company.locations?.length ? company.locations : [''],
  stats: company.stats?.length
    ? company.stats.map((item) => ({ ...item }))
    : [{ label: '', value: '', accent: '' }]
});

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [verificationForm] = Form.useForm();
  const [verification, setVerification] = useState<VerificationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [profile, verificationInfo] = await Promise.all([
        companyApi.getProfile(),
        companyApi
          .getVerification()
          .catch((error) => {
            if (error?.message) {
              console.warn('加载认证信息失败:', error.message);
            }
            return null;
          })
      ]);
      form.setFieldsValue(mapCompanyToFormValues(profile));
      if (verificationInfo) {
        setVerification(verificationInfo);
        verificationForm.setFieldsValue({
          legalPerson: verificationInfo.legalPerson,
          registrationNumber: verificationInfo.registrationNumber,
          businessLicense: verificationInfo.businessLicense
        });
      }
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '加载设置数据失败');
      form.resetFields();
      verificationForm.resetFields();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: Partial<Company> = {
        name: (values.name || '').trim(),
        description: values.description?.trim(),
        address: values.address?.trim(),
        website: values.website?.trim(),
        contact: values.contact?.trim(),
        logo: values.logo,
        tagline: values.tagline?.trim(),
        focusArea: values.focusArea?.trim(),
        promotionPage: values.promotionPage?.trim(),
        themeColors: normalizeStringList(values.themeColors),
        highlights: normalizeStringList(values.highlights),
        culture: normalizeStringList(values.culture),
        locations: normalizeStringList(values.locations),
        stats: normalizeStatsList(values.stats)
      };

      const updated = await companyApi.updateProfile(payload);
      form.setFieldsValue(mapCompanyToFormValues(updated));
      message.success('企业信息保存成功');
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const beforeUploadLogo = (file: RcFile) => {
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

  const logoUploadProps: UploadProps = useMemo(() => ({
    name: 'logo',
    showUploadList: false,
    beforeUpload: beforeUploadLogo,
    customRequest: async (options) => {
      const { file, onError, onSuccess } = options;
      setLogoUploading(true);
      try {
        const response = await companyApi.uploadLogo(file as File);
        const logoUrl = response?.data?.logoUrl || response?.data?.url || response?.data?.company?.logo;
        if (logoUrl) {
          form.setFieldsValue({ logo: logoUrl });
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

  const beforeUploadLicense = (file: RcFile) => {
    const isValidType =
      file.type === 'application/pdf' ||
      file.type === 'image/png' ||
      file.type === 'image/jpeg';
    if (!isValidType) {
      message.error('仅支持上传 PDF/PNG/JPG 文件');
      return Upload.LIST_IGNORE;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const licenseUploadProps: UploadProps = useMemo(() => ({
    name: 'license',
    showUploadList: false,
    beforeUpload: beforeUploadLicense,
    customRequest: async (options) => {
      const { file, onError, onSuccess } = options;
      setLicenseUploading(true);
      try {
        const response = await companyApi.uploadLicense(file as File);
        const licenseUrl = response?.data?.url || response?.data?.licenseUrl || response?.data?.businessLicense;
        if (licenseUrl) {
          verificationForm.setFieldsValue({ businessLicense: licenseUrl });
        }
        message.success(response?.message || '营业执照上传成功');
        onSuccess?.(response, new XMLHttpRequest());
      } catch (error: any) {
        const errMsg = error?.message || error?.response?.data?.message;
        message.error(errMsg || '营业执照上传失败');
        onError?.(error);
      } finally {
        setLicenseUploading(false);
      }
    }
  }), [verificationForm]);

  const handleSubmitVerification = async () => {
    try {
      const values = await verificationForm.validateFields();
      if (!values.businessLicense) {
        message.error('请先上传营业执照');
        return;
      }
      setVerificationSubmitting(true);
      const data = await companyApi.submitVerification({
        legalPerson: (values.legalPerson || '').trim(),
        registrationNumber: (values.registrationNumber || '').trim(),
        businessLicense: values.businessLicense
      });
      setVerification(data);
      verificationForm.setFieldsValue({
        legalPerson: data.legalPerson,
        registrationNumber: data.registrationNumber,
        businessLicense: data.businessLicense
      });
      message.success('认证申请已提交，待审核');
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '提交认证失败');
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const renderStatusTag = () => {
    if (!verification) {
      return <Tag color="default">未提交</Tag>;
    }
    switch (verification.status.toUpperCase()) {
      case 'APPROVED':
        return <Tag color="success">已认证</Tag>;
      case 'REJECTED':
        return <Tag color="error">已驳回</Tag>;
      case 'PENDING':
      default:
        return <Tag color="gold">审核中</Tag>;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
      </div>
    );
  }

  return (
    <div className="settings-page" style={{ padding: '24px', background: '#fff', minHeight: '100vh' }}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div>
          <Title level={3} style={{ marginBottom: 8, color: '#1f2937' }}>系统设置</Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: '14px' }}>
            维护企业基础资料、品牌宣传信息，并提交实名认证资料，保持企业信息最新可信。
          </Paragraph>
        </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSaveSettings}
        initialValues={{
          themeColors: [''],
          highlights: [''],
          culture: [''],
          locations: [''],
          stats: [{ label: '', value: '', accent: '' }]
        }}
      >
        <Card 
          title="基础信息" 
          style={{ 
            borderRadius: '8px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #f0f0f0'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="企业名称"
                name="name"
                rules={[{ required: true, message: '请输入企业名称' }]}
              >
                <Input placeholder="请输入企业名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="企业官网" name="website">
                <Input placeholder="例如：https://company.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="企业地址" name="address">
                <Input placeholder="请输入企业所在地" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="联系人信息" name="contact">
                <Input placeholder="联系电话或邮箱" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="企业简介" name="description">
            <TextArea rows={4} placeholder="介绍企业业务、愿景等信息" />
          </Form.Item>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Logo 地址" name="logo">
                <Input placeholder="支持输入图片链接或上传" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="上传企业 Logo">
                <Upload {...logoUploadProps}>
                  <Button icon={<UploadOutlined />} loading={logoUploading}>
                    上传图片
                  </Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item shouldUpdate>
            {() => (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" htmlType="submit" loading={saving}>
                  保存基础信息
                </Button>
              </div>
            )}
          </Form.Item>
        </Card>

        <Card 
          title="品牌宣传" 
          style={{ 
            marginTop: 24,
            borderRadius: '8px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #f0f0f0'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="宣传口号" name="tagline">
                <Input placeholder="例如：让招聘更智能" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="业务聚焦" name="focusArea">
                <Input placeholder="主营业务或重点领域" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="宣传页链接" name="promotionPage">
            <Input placeholder="上传或引用企业宣传手册 / H5 页面链接" />
          </Form.Item>

          <Form.Item label="企业亮点" required={false}>
            <Form.List name="highlights">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((field) => (
                    <Space key={field.key} align="baseline">
                      <Form.Item
                        {...field}
                        rules={[{ required: true, message: '请输入企业亮点' }]}
                        style={{ width: 360 }}
                      >
                        <Input placeholder="如：顶尖技术团队" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      )}
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加亮点</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item label="企业文化" required={false}>
            <Form.List name="culture">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((field) => (
                    <Space key={field.key} align="baseline">
                      <Form.Item
                        {...field}
                        rules={[{ required: true, message: '请输入企业文化描述' }]}
                        style={{ width: 360 }}
                      >
                        <Input placeholder="如：开放透明的团队氛围" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      )}
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加文化</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item label="办公地点" required={false}>
            <Form.List name="locations">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((field) => (
                    <Space key={field.key} align="baseline">
                      <Form.Item
                        {...field}
                        rules={[{ required: true, message: '请输入办公地点' }]}
                        style={{ width: 360 }}
                      >
                        <Input placeholder="如：上海市浦东新区" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      )}
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加地点</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item label="品牌色" required={false}>
            <Form.List name="themeColors">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((field) => (
                    <Space key={field.key} align="baseline">
                      <Form.Item
                        {...field}
                        rules={[{ required: true, message: '请输入颜色值' }]}
                        style={{ width: 240 }}
                      >
                        <Input placeholder="如：#1890ff" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      )}
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加颜色</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item label="企业数据亮点" required={false}>
            <Form.List name="stats">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        rules={[{ required: true, message: '请输入指标名称' }]}
                        style={{ width: 200 }}
                      >
                        <Input placeholder="如：服务企业" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '请输入指标数值' }]}
                        style={{ width: 160 }}
                      >
                        <Input placeholder="如：300+" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'accent']}
                        style={{ width: 160 }}
                      >
                        <Input placeholder="例如：年度" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      )}
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add({ label: '', value: '', accent: '' })} icon={<PlusOutlined />}>添加数据</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" onClick={handleSaveSettings} loading={saving}>
              保存宣传信息
            </Button>
          </div>
        </Card>
      </Form>

      <Card 
        title="企业实名认证"
        style={{ 
          marginTop: 24,
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0'
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={24}>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="认证状态">{renderStatusTag()}</Descriptions.Item>
            {verification?.reviewComments && (
              <Descriptions.Item label="审核意见">{verification.reviewComments}</Descriptions.Item>
            )}
          </Descriptions>

          {verification?.status?.toUpperCase() === 'REJECTED' && (
            <Alert
              type="error"
              showIcon
              message="认证被驳回"
              description={verification.reviewComments || '请根据审核意见完善资料后重新提交'}
            />
          )}

          <Form
            form={verificationForm}
            layout="vertical"
            initialValues={{ businessLicense: '' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="企业法人"
                  name="legalPerson"
                  rules={[{ required: true, message: '请输入法人姓名' }]}
                >
                  <Input placeholder="请输入法人全名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="统一社会信用代码"
                  name="registrationNumber"
                  rules={[{ required: true, message: '请输入统一社会信用代码' }]}
                >
                  <Input placeholder="如：9131XXXXXXXXXXXX" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="营业执照" required>
              <Space direction="vertical">
                <Upload {...licenseUploadProps}>
                  <Button icon={<UploadOutlined />} loading={licenseUploading}>
                    上传营业执照
                  </Button>
                </Upload>
                <Form.Item
                  name="businessLicense"
                  noStyle
                  rules={[{ required: true, message: '请上传或填写营业执照链接' }]}
                >
                  <Input placeholder="或粘贴营业执照文件链接" />
                </Form.Item>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const licenseUrl = verificationForm.getFieldValue('businessLicense');
                    return licenseUrl ? (
                      <Text type="secondary">
                        已上传文件：
                        <a
                          href={licenseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ marginLeft: 4 }}
                        >
                          查看执照
                        </a>
                      </Text>
                    ) : null;
                  }}
                </Form.Item>
              </Space>
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" onClick={handleSubmitVerification} loading={verificationSubmitting}>
                提交认证
              </Button>
            </div>
          </Form>
        </Space>
      </Card>
      </Space>
    </div>
  );
};

export default Settings;
