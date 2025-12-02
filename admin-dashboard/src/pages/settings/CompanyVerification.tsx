import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  message,
  Descriptions,
  Tag,
  Spin,
  Alert
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { AUTH_CONSTANTS } from '../../config/constants';

interface VerificationInfo {
  id: string;
  status: string;
  businessLicense: string;
  legalPerson: string;
  registrationNumber: string;
  reviewComments?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const CompanyVerification: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo | null>(null);

  // 获取认证信息
  const fetchVerificationInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
      const response = await fetch('/api/company/verification', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setVerificationInfo(data.data);
        if (data.data) {
          form.setFieldsValue(data.data);
        }
      } else {
        message.error(data.message || '获取认证信息失败');
      }
    } catch (error) {
      console.error('获取认证信息失败:', error);
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationInfo();
  }, []);

  // 提交认证申请
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
      const response = await fetch('/api/company/verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      
      if (data.success) {
        message.success('认证申请提交成功');
        fetchVerificationInfo();
      } else {
        message.error(data.message || '提交失败');
      }
    } catch (error) {
      console.error('提交认证申请失败:', error);
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 上传营业执照
  const handleLicenseUpload = async (info: UploadChangeParam<UploadFile>) => {
    if (info.file.status === 'uploading') {
      setUploading(true);
      return;
    }
    
    if (info.file.status === 'done') {
      setUploading(false);
      if (info.file.response.success) {
        form.setFieldValue('businessLicense', info.file.response.data.url);
        message.success('营业执照上传成功');
      } else {
        message.error(info.file.response.message || '上传失败');
      }
    } else if (info.file.status === 'error') {
      setUploading(false);
      message.error('上传失败');
    }
  };

  // 验证文件类型和大小
  const beforeUpload = (file: RcFile) => {
    const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'application/pdf';
    if (!isImage) {
      message.error('只能上传JPG/PNG图片或PDF文件！');
      return false;
    }
    
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过10MB！');
      return false;
    }
    
    return true;
  };

  if (loading && !verificationInfo) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  const statusMap = {
    'PENDING': { color: 'gold', text: '审核中' },
    'APPROVED': { color: 'success', text: '已认证' },
    'REJECTED': { color: 'error', text: '已驳回' }
  };

  return (
    <div className="company-verification-page">
      <Card title="企业认证">
        {verificationInfo ? (
          <div>
            <Descriptions column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="认证状态">
                <Tag color={statusMap[verificationInfo.status as keyof typeof statusMap]?.color}>
                  {statusMap[verificationInfo.status as keyof typeof statusMap]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="申请时间">
                {dayjs(verificationInfo.createdAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              {verificationInfo.reviewedAt && (
                <Descriptions.Item label="审核时间">
                  {dayjs(verificationInfo.reviewedAt).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {verificationInfo.reviewComments && (
                <Descriptions.Item label="审核意见">
                  {verificationInfo.reviewComments}
                </Descriptions.Item>
              )}
            </Descriptions>

            {verificationInfo.status === 'REJECTED' && (
              <Alert
                message="认证申请被驳回"
                description={verificationInfo.reviewComments}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {verificationInfo.status === 'APPROVED' && (
              <Alert
                message="企业已完成认证"
                type="success"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}
          </div>
        ) : null}

        {(!verificationInfo || verificationInfo.status === 'REJECTED') && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="营业执照"
              name="businessLicense"
              rules={[{ required: true, message: '请上传营业执照' }]}
            >
              <Upload
                name="license"
                action="/api/company/upload-license"
                headers={{
                  Authorization: `Bearer ${localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY)}`
                }}
                showUploadList={false}
                beforeUpload={beforeUpload}
                onChange={handleLicenseUpload}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {form.getFieldValue('businessLicense') ? (
                    <img
                      src={form.getFieldValue('businessLicense')}
                      alt="营业执照"
                      style={{ width: 200, marginRight: 16, objectFit: 'contain' }}
                    />
                  ) : null}
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    {uploading ? '上传中' : '上传营业执照'}
                  </Button>
                </div>
              </Upload>
            </Form.Item>

            <Form.Item
              label="法人代表"
              name="legalPerson"
              rules={[{ required: true, message: '请输入法人代表姓名' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="统一社会信用代码"
              name="registrationNumber"
              rules={[
                { required: true, message: '请输入统一社会信用代码' },
                { pattern: /^[0-9A-Z]{18}$/, message: '请输入18位统一社会信用代码' }
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交认证申请
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default CompanyVerification;
