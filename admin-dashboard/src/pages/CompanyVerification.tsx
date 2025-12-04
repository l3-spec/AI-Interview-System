import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  Steps,
  Result,
  Alert,
  Space,
  Typography,
  Row,
  Col,
  Timeline,
  Image,
  message,
  Modal
} from 'antd';
import {
  SafetyCertificateOutlined,
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  InboxOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { verificationApi, uploadApi } from '../services/api';
import { VerificationApplication } from '../types/interview';
import { useAuth } from '../contexts/AuthContext';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const CompanyVerification: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationApplication | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const { user } = useAuth();

  // 加载认证状态
  const loadVerificationStatus = async () => {
    setLoading(true);
    try {
      const data = await verificationApi.getStatus();
      setVerificationStatus(data);

      const status = data?.status?.toLowerCase();
      if (!status) {
        setCurrentStep(0);
        return;
      }

      switch (status) {
        case 'pending':
          setCurrentStep(1);
          break;
        case 'approved':
          setCurrentStep(2);
          break;
        case 'rejected':
        default:
          setCurrentStep(0);
          break;
      }
    } catch (error) {
      console.error('加载认证状态失败:', error);
      setVerificationStatus(null);
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  // 处理文件上传
  const handleFileUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    
    try {
      const response = await uploadApi.uploadFile(file as File, 'license');
      onSuccess?.(response.data);
    } catch (error) {
      message.error('文件上传失败');
      onError?.(error as Error);
    }
  };

  // 处理文件列表变化
  const handleFileChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // 预览图片
  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File);
    }
    setPreviewImage(file.url || file.preview || '');
    setPreviewVisible(true);
  };

  // 转换为base64
  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });

  // 提交认证申请
  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error('请上传营业执照');
      return;
    }

    setSubmitLoading(true);
    try {
      const businessLicenseFile = fileList[0].originFileObj as File;
      
      await verificationApi.submit({
        businessLicense: businessLicenseFile,
        legalPerson: values.legalPerson,
        registrationNumber: values.registrationNumber
      });

      message.success('认证申请提交成功，请等待审核');
      loadVerificationStatus(); // 重新加载状态
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '提交失败，请稍后重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 重新申请
  const handleReapply = () => {
    setCurrentStep(0);
    setVerificationStatus(null);
    form.resetFields();
    setFileList([]);
  };

  // 渲染认证步骤
  const renderSteps = () => (
    <Steps current={currentStep} style={{ marginBottom: '32px' }}>
      <Step
        title="提交资料"
        description="上传营业执照等认证材料"
        icon={<FileTextOutlined />}
      />
      <Step
        title="审核中"
        description="平台审核您的认证资料"
        icon={<ClockCircleOutlined />}
      />
      <Step
        title="认证完成"
        description="通过审核，获得认证标识"
        icon={<CheckCircleOutlined />}
      />
    </Steps>
  );

  // 渲染申请表单
  const renderApplicationForm = () => (
    <Card title="企业实名认证申请">
      <Alert
        message="认证须知"
        description={
          <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
            <li>请确保营业执照清晰可见，信息完整</li>
            <li>营业执照必须在有效期内</li>
            <li>法人姓名需与营业执照上的法定代表人一致</li>
            <li>统一社会信用代码/注册号需准确填写</li>
            <li>认证审核通常需要1-3个工作日</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="法定代表人姓名"
          name="legalPerson"
          rules={[{ required: true, message: '请输入法定代表人姓名' }]}
        >
          <Input placeholder="请输入法定代表人姓名" />
        </Form.Item>

        <Form.Item
          label="统一社会信用代码/注册号"
          name="registrationNumber"
          rules={[{ required: true, message: '请输入统一社会信用代码或注册号' }]}
        >
          <Input placeholder="请输入统一社会信用代码或注册号" />
        </Form.Item>

        <Form.Item
          label="营业执照"
          required
        >
          <Dragger
            fileList={fileList}
            customRequest={handleFileUpload}
            onChange={handleFileChange}
            onPreview={handlePreview}
            accept="image/*,.pdf"
            maxCount={1}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽上传营业执照</p>
            <p className="ant-upload-hint">
              支持 JPG、PNG、PDF 格式，文件大小不超过 10MB
            </p>
          </Dragger>
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit"
            loading={submitLoading}
            size="large"
            icon={<SafetyCertificateOutlined />}
          >
            提交认证申请
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  // 渲染审核中状态
  const renderPendingStatus = () => (
    <Result
      icon={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
      title="认证审核中"
      subTitle="您的认证申请已提交，我们正在审核您的资料，请耐心等待"
      extra={
        <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
          <Title level={5}>申请信息</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary">法定代表人:</Text>
              <div>{verificationStatus?.legalPerson}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary">注册号:</Text>
              <div>{verificationStatus?.registrationNumber}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary">提交时间:</Text>
              <div>{verificationStatus?.submittedAt ? new Date(verificationStatus.submittedAt).toLocaleString() : '-'}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary">审核状态:</Text>
              <div>审核中</div>
            </Col>
          </Row>

          <div style={{ marginTop: '24px' }}>
            <Text type="secondary">营业执照:</Text>
            <div style={{ marginTop: '8px' }}>
              <Image
                width={200}
                src={verificationStatus?.businessLicense}
                placeholder="加载中..."
              />
            </div>
          </div>

          <Timeline style={{ marginTop: '24px' }}>
            <Timeline.Item 
              dot={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            >
              <div>资料已提交</div>
              <Text type="secondary">
                {verificationStatus?.submittedAt ? new Date(verificationStatus.submittedAt).toLocaleString() : '-'}
              </Text>
            </Timeline.Item>
            <Timeline.Item 
              dot={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            >
              <div>平台审核中</div>
              <Text type="secondary">预计1-3个工作日完成</Text>
            </Timeline.Item>
          </Timeline>
        </div>
      }
    />
  );

  // 渲染认证成功状态
  const renderApprovedStatus = () => (
    <Result
      status="success"
      title="认证成功"
      subTitle="恭喜！您的企业已通过实名认证，现在可以享受更多平台服务"
      extra={
        <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
          <Title level={5}>认证信息</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary">企业名称:</Text>
              <div>{user?.name}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary">法定代表人:</Text>
              <div>{verificationStatus?.legalPerson}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary">注册号:</Text>
              <div>{verificationStatus?.registrationNumber}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary">认证时间:</Text>
              <div>{verificationStatus?.reviewedAt ? new Date(verificationStatus.reviewedAt).toLocaleString() : '-'}</div>
            </Col>
          </Row>

          <Alert
            message="认证权益"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                <li>企业信息展示认证标识</li>
                <li>优先推荐优质候选人</li>
                <li>享受更多平台功能和服务</li>
                <li>提升企业形象和信任度</li>
              </ul>
            }
            type="success"
            showIcon
            style={{ marginTop: '24px' }}
          />
        </div>
      }
    />
  );

  // 渲染认证被拒状态
  const renderRejectedStatus = () => (
    <Result
      status="error"
      title="认证未通过"
      subTitle="很抱歉，您的认证申请未通过审核"
      extra={
        <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
          {verificationStatus?.reviewComments && (
            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>审核意见</Title>
              <Alert
                message={verificationStatus.reviewComments}
                type="error"
                showIcon
              />
            </div>
          )}

          <Title level={5}>申请信息</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary">法定代表人:</Text>
              <div>{verificationStatus?.legalPerson}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary">注册号:</Text>
              <div>{verificationStatus?.registrationNumber}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary">提交时间:</Text>
              <div>{verificationStatus?.submittedAt ? new Date(verificationStatus.submittedAt).toLocaleString() : '-'}</div>
            </Col>
            <Col span={12}>
              <Text type="secondary">审核时间:</Text>
              <div>{verificationStatus?.reviewedAt ? new Date(verificationStatus.reviewedAt).toLocaleString() : '-'}</div>
            </Col>
          </Row>

          <div style={{ marginTop: '24px' }}>
            <Button type="primary" onClick={handleReapply}>
              重新申请认证
            </Button>
          </div>
        </div>
      }
    />
  );

  // 渲染内容
  const renderContent = () => {
    if (loading) {
      return <Card loading />;
    }

    if (!verificationStatus) {
      return renderApplicationForm();
    }

    switch (verificationStatus.status) {
      case 'pending':
        return renderPendingStatus();
      case 'approved':
        return renderApprovedStatus();
      case 'rejected':
        return renderRejectedStatus();
      default:
        return renderApplicationForm();
    }
  };

  return (
    <div>
      {/* 步骤指示器 */}
      {renderSteps()}

      {/* 主要内容 */}
      {renderContent()}

      {/* 图片预览弹窗 */}
      <Modal
        open={previewVisible}
        title="营业执照预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
      >
        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </div>
  );
};

export default CompanyVerification; 
