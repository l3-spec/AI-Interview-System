import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Image,
  Upload,
  message,
  Popconfirm,
  Select,
  Row,
  Col,
  Typography,
  Badge,
  Tooltip,
  DatePicker,
  Radio
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  SearchOutlined,
  ReloadOutlined,
  UpOutlined,
  DownOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { HomeBanner, PromotedJobRecord, homeContentApi, uploadApi } from '../services/api';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

type BannerLinkTargetType = 'none' | 'app' | 'web';

interface BannerFormState {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  linkTargetType: BannerLinkTargetType;
  appLinkType: string;
  customAppLinkType?: string;
  appLinkTarget: string;
  webUrl: string;
  sortOrder: number;
  isActive: boolean;
}

interface PromotionFormState {
  jobId: string;
  promotionType: 'NORMAL' | 'PREMIUM' | 'FEATURED';
  displayFrequency: number;
  priority: number;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  isActive: boolean;
}

const defaultBannerForm: BannerFormState = {
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  linkTargetType: 'app',
  appLinkType: 'job',
  customAppLinkType: '',
  appLinkTarget: '',
  webUrl: '',
  sortOrder: 0,
  isActive: true,
};

const appLinkOptions = [
  { value: 'job', label: '职位详情（job）' },
  { value: 'assessment', label: '测评详情（assessment）' },
  { value: 'post', label: '帖子详情（post）' },
  { value: 'company', label: '企业主页（company）' },
  { value: 'custom', label: '自定义跳转类型' },
];

const builtInAppLinkTypes = appLinkOptions
  .filter((option) => option.value !== 'custom')
  .map((option) => option.value);

const defaultPromotionForm: PromotionFormState = {
  jobId: '',
  promotionType: 'NORMAL',
  displayFrequency: 10,
  priority: 0,
  startDate: null,
  endDate: null,
  isActive: true,
};

const HomeContentManagement: React.FC = () => {
  // Banner 相关状态
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerPage, setBannerPage] = useState(1);
  const [bannerPageSize] = useState(10);
  const [bannerTotal, setBannerTotal] = useState(0);
  const [bannerFormVisible, setBannerFormVisible] = useState(false);
  const [bannerForm] = Form.useForm<BannerFormState>();
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [selectedBannerIds, setSelectedBannerIds] = useState<string[]>([]);
  const [bannerSearchKeyword, setBannerSearchKeyword] = useState('');
  const [bannerStatusFilter, setBannerStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [previewImage, setPreviewImage] = useState<{ visible: boolean; url: string }>({ visible: false, url: '' });
  const [uploading, setUploading] = useState(false);

  // Promotion 相关状态
  const [promotions, setPromotions] = useState<PromotedJobRecord[]>([]);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionPage, setPromotionPage] = useState(1);
  const [promotionPageSize] = useState(10);
  const [promotionTotal, setPromotionTotal] = useState(0);
  const [promotionFormVisible, setPromotionFormVisible] = useState(false);
  const [promotionForm] = Form.useForm<PromotionFormState>();
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);

  const isValidHttpUrl = (value?: string | null) => {
    if (!value) {
      return false;
    }
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  };

  const resolveBannerLinkTarget = (banner: HomeBanner): BannerLinkTargetType => {
    if ((banner.linkType === 'external' && banner.linkId) || isValidHttpUrl(banner.linkId)) {
      return 'web';
    }
    if (banner.linkType || banner.linkId) {
      return 'app';
    }
    return 'none';
  };

  const getAppTargetPlaceholder = (linkType?: string) => {
    switch (linkType) {
      case 'job':
        return '请输入职位ID或编码，如 job-senior-fe';
      case 'assessment':
        return '请输入测评ID';
      case 'post':
        return '请输入帖子ID';
      case 'company':
        return '请输入企业ID';
      default:
        return '例如 /path 或自定义参数';
    }
  };

  const bannerTotalPages = useMemo(() => Math.max(Math.ceil(bannerTotal / bannerPageSize), 1), [bannerTotal, bannerPageSize]);
  const promotionTotalPages = useMemo(() => Math.max(Math.ceil(promotionTotal / promotionPageSize), 1), [promotionTotal, promotionPageSize]);

  // 加载 Banner 列表
  const loadBanners = async () => {
    setBannerLoading(true);
    try {
      const params: Record<string, any> = {
        page: bannerPage,
        pageSize: bannerPageSize,
      };
      
      // 搜索关键词
      if (bannerSearchKeyword.trim()) {
        params.keyword = bannerSearchKeyword.trim();
      }
      
      // 状态筛选
      if (bannerStatusFilter === 'active') {
        params.isActive = true;
      } else if (bannerStatusFilter === 'inactive') {
        params.isActive = false;
      }

      const response = await homeContentApi.getBanners(params);
      if (response.success && response.data) {
        setBanners(response.data.list || []);
        setBannerTotal(response.data.total || 0);
      } else {
        message.error(response.message || '获取首页Banner失败');
      }
    } catch (error: any) {
      console.error('loadBanners error:', error);
      message.error('网络错误，无法获取Banner数据');
    } finally {
      setBannerLoading(false);
    }
  };

  // 加载推广职位列表
  const loadPromotions = async () => {
    setPromotionLoading(true);
    try {
      const response = await homeContentApi.getPromotedJobs({
        page: promotionPage,
        pageSize: promotionPageSize,
      });
      if (response.success && response.data) {
        setPromotions(response.data.list || []);
        setPromotionTotal(response.data.total || 0);
      } else {
        message.error(response.message || '获取推广职位失败');
      }
    } catch (error: any) {
      console.error('loadPromotions error:', error);
      message.error('网络错误，无法获取推广职位数据');
    } finally {
      setPromotionLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, [bannerPage, bannerSearchKeyword, bannerStatusFilter]);

  useEffect(() => {
    loadPromotions();
  }, [promotionPage]);

  // Banner 表单提交
  const handleBannerSubmit = async () => {
    try {
      const values = await bannerForm.validateFields();
      const selectedAppLinkType = values.appLinkType === 'custom'
        ? values.customAppLinkType?.trim()
        : values.appLinkType?.trim();

      let linkType: string | null = null;
      let linkId: string | null = null;

      if (values.linkTargetType === 'app') {
        linkType = selectedAppLinkType || null;
        linkId = values.appLinkTarget?.trim() || null;
      } else if (values.linkTargetType === 'web') {
        linkType = 'external';
        linkId = values.webUrl?.trim() || null;
      }
      
      const payload = {
        title: values.title.trim(),
        subtitle: values.subtitle.trim(),
        description: values.description?.trim() || undefined,
        imageUrl: values.imageUrl.trim(),
        linkType: linkType ?? null,
        linkId: linkId ?? null,
        sortOrder: Number(values.sortOrder) || 0,
        isActive: values.isActive,
      };

      if (editingBannerId) {
        const response = await homeContentApi.updateBanner(editingBannerId, payload);
        if (!response.success) {
          message.error(response.message || '更新Banner失败');
          return;
        }
        message.success('Banner更新成功');
      } else {
        const response = await homeContentApi.createBanner(payload);
        if (!response.success) {
          message.error(response.message || '创建Banner失败');
          return;
        }
        message.success('Banner创建成功');
      }
      
      setBannerFormVisible(false);
      bannerForm.resetFields();
      setEditingBannerId(null);
      loadBanners();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      console.error('handleBannerSubmit error:', error);
      message.error('操作失败，请稍后再试');
    }
  };

  // 编辑 Banner
  const handleEditBanner = (banner: HomeBanner) => {
    setEditingBannerId(banner.id);

    const linkTargetType = resolveBannerLinkTarget(banner);
    const isCustomType = Boolean(banner.linkType && !builtInAppLinkTypes.includes(banner.linkType));

    bannerForm.setFieldsValue({
      title: banner.title,
      subtitle: banner.subtitle,
      description: banner.description || '',
      imageUrl: banner.imageUrl,
      linkTargetType,
      appLinkType: linkTargetType === 'app'
        ? (isCustomType ? 'custom' : banner.linkType || defaultBannerForm.appLinkType)
        : defaultBannerForm.appLinkType,
      customAppLinkType: linkTargetType === 'app' && isCustomType ? banner.linkType : '',
      appLinkTarget: linkTargetType === 'app' ? banner.linkId || '' : '',
      webUrl: linkTargetType === 'web' ? banner.linkId || '' : '',
      sortOrder: banner.sortOrder ?? 0,
      isActive: banner.isActive,
    });
    setBannerFormVisible(true);
  };

  // 创建 Banner
  const handleCreateBanner = () => {
    setEditingBannerId(null);
    bannerForm.resetFields();
    bannerForm.setFieldsValue(defaultBannerForm);
    setBannerFormVisible(true);
  };

  // 切换 Banner 状态
  const handleToggleBanner = async (banner: HomeBanner) => {
    try {
      const response = await homeContentApi.updateBannerStatus(banner.id, !banner.isActive);
      if (!response.success) {
        message.error(response.message || '更新状态失败');
        return;
      }
      message.success(`Banner已${!banner.isActive ? '上线' : '下线'}`);
      loadBanners();
    } catch (error: any) {
      console.error('handleToggleBanner error:', error);
      message.error('更新状态失败，请稍后重试');
    }
  };

  // 删除 Banner
  const handleDeleteBanner = async (banner: HomeBanner) => {
    try {
      const response = await homeContentApi.deleteBanner(banner.id);
      if (!response.success) {
        message.error(response.message || '删除失败');
        return;
      }
      message.success('删除成功');
      loadBanners();
    } catch (error: any) {
      console.error('handleDeleteBanner error:', error);
      message.error('删除失败，请稍后再试');
    }
  };

  // 批量更新状态
  const handleBatchUpdateStatus = async (isActive: boolean) => {
    if (selectedBannerIds.length === 0) {
      message.warning('请先选择要操作的Banner');
      return;
    }
    
    try {
      const response = await homeContentApi.batchUpdateBannerStatus(selectedBannerIds, isActive);
      if (!response.success) {
        message.error(response.message || '批量更新失败');
        return;
      }
      message.success(`已${isActive ? '上线' : '下线'} ${selectedBannerIds.length} 个Banner`);
      setSelectedBannerIds([]);
      loadBanners();
    } catch (error: any) {
      console.error('handleBatchUpdateStatus error:', error);
      message.error('批量更新失败，请稍后重试');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedBannerIds.length === 0) {
      message.warning('请先选择要删除的Banner');
      return;
    }
    
    try {
      const response = await homeContentApi.batchDeleteBanners(selectedBannerIds);
      if (!response.success) {
        message.error(response.message || '批量删除失败');
        return;
      }
      message.success(`已删除 ${selectedBannerIds.length} 个Banner`);
      setSelectedBannerIds([]);
      loadBanners();
    } catch (error: any) {
      console.error('handleBatchDelete error:', error);
      message.error('批量删除失败，请稍后重试');
    }
  };

  // 保存全部排序
  const handleSaveAllSort = async () => {
    try {
      const orders = banners.map((banner) => ({
        id: banner.id,
        sortOrder: banner.sortOrder ?? 0,
      }));
      const response = await homeContentApi.reorderBanners(orders);
      if (!response.success) {
        message.error(response.message || '排序更新失败');
        return;
      }
      message.success('排序已更新');
      loadBanners();
    } catch (error: any) {
      console.error('handleSaveAllSort error:', error);
      message.error('排序更新失败，请稍后重试');
    }
  };

  // 图片上传处理
  const handleImageUpload = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const response = await uploadApi.uploadFile(file, 'banner');
      if (response.success && response.data) {
        message.success('图片上传成功');
        return response.data.url;
      }
      throw new Error(response.message || '上传失败');
    } catch (error: any) {
      console.error('图片上传失败:', error);
      message.error(error?.message || '图片上传失败');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // Banner 表格列定义
  const bannerColumns: ColumnsType<HomeBanner> = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      sorter: (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      render: (_, record) => (
        <InputNumber
          size="small"
          value={record.sortOrder ?? 0}
          min={0}
          max={1000}
          onChange={(value) => {
            const updatedBanners = banners.map((b) =>
              b.id === record.id ? { ...b, sortOrder: value ?? 0 } : b
            );
            setBanners(updatedBanners);
          }}
          style={{ width: 70 }}
        />
      ),
    },
    {
      title: '图片预览',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 120,
      render: (url: string) => (
        <Image
          src={url}
          alt="Banner"
          width={80}
          height={50}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          preview={{
            src: url,
          }}
        />
      ),
    },
    {
      title: '标题信息',
      key: 'title',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{record.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.subtitle}</Text>
          {record.description && (
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              {record.description.length > 50
                ? `${record.description.substring(0, 50)}...`
                : record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '跳转',
      key: 'link',
      width: 200,
      render: (_, record) => {
        const targetType = resolveBannerLinkTarget(record);

        if (targetType === 'none') {
          return <Text type="secondary">-</Text>;
        }

        if (targetType === 'web') {
          return (
            <div>
              <Tag color="purple">网页链接</Tag>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4, wordBreak: 'break-all' }}>
                {record.linkId || '-'}
              </div>
            </div>
          );
        }

        return (
          <div>
            <Tag color="blue">App · {record.linkType || '跳转'}</Tag>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4, wordBreak: 'break-all' }}>
              {record.linkId || '-'}
            </div>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      filters: [
        { text: '展示中', value: true },
        { text: '已下线', value: false },
      ],
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'default'}
          text={isActive ? '展示中' : '已下线'}
        />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditBanner(record)}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? '下线' : '上线'}>
            <Button
              type="link"
              icon={record.isActive ? <DownOutlined /> : <UpOutlined />}
              onClick={() => handleToggleBanner(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个Banner吗？"
            onConfirm={() => handleDeleteBanner(record)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Promotion 表单提交
  const handlePromotionSubmit = async () => {
    try {
      const values = await promotionForm.validateFields();
      
      if (!values.startDate || !values.endDate) {
        message.error('请选择开始时间和结束时间');
        return;
      }
      
      const payload = {
        promotionType: values.promotionType,
        displayFrequency: Number(values.displayFrequency) || 10,
        priority: Number(values.priority) || 0,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
        isActive: values.isActive,
      };

      if (editingPromotionId) {
        const response = await homeContentApi.updatePromotedJob(editingPromotionId, payload);
        if (!response.success) {
          message.error(response.message || '更新推广职位失败');
          return;
        }
        message.success('推广职位更新成功');
      } else {
        const response = await homeContentApi.createPromotedJob({
          ...payload,
          jobId: values.jobId.trim(),
        });
        if (!response.success) {
          message.error(response.message || '创建推广职位失败');
          return;
        }
        message.success('推广职位创建成功');
      }
      
      setPromotionFormVisible(false);
      promotionForm.resetFields();
      setEditingPromotionId(null);
      loadPromotions();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      console.error('handlePromotionSubmit error:', error);
      message.error('操作失败，请稍后再试');
    }
  };

  // 编辑推广职位
  const handleEditPromotion = (promotion: PromotedJobRecord) => {
    setEditingPromotionId(promotion.id);
    promotionForm.setFieldsValue({
      jobId: promotion.jobId,
      promotionType: promotion.promotionType,
      displayFrequency: promotion.displayFrequency,
      priority: promotion.priority,
      startDate: promotion.startDate ? dayjs(promotion.startDate) : null,
      endDate: promotion.endDate ? dayjs(promotion.endDate) : null,
      isActive: promotion.isActive,
    });
    setPromotionFormVisible(true);
  };

  // 创建推广职位
  const handleCreatePromotion = () => {
    setEditingPromotionId(null);
    promotionForm.resetFields();
    promotionForm.setFieldsValue(defaultPromotionForm);
    setPromotionFormVisible(true);
  };

  // 切换推广职位状态
  const handleTogglePromotion = async (promotion: PromotedJobRecord) => {
    try {
      const response = await homeContentApi.updatePromotedJob(promotion.id, {
        isActive: !promotion.isActive,
      });
      if (!response.success) {
        message.error(response.message || '更新状态失败');
        return;
      }
      message.success(`推广职位已${!promotion.isActive ? '启用' : '暂停'}`);
      loadPromotions();
    } catch (error: any) {
      console.error('handleTogglePromotion error:', error);
      message.error('更新状态失败，请稍后重试');
    }
  };

  // 删除推广职位
  const handleDeletePromotion = async (promotion: PromotedJobRecord) => {
    try {
      const response = await homeContentApi.deletePromotedJob(promotion.id);
      if (!response.success) {
        message.error(response.message || '删除失败');
        return;
      }
      message.success('删除成功');
      loadPromotions();
    } catch (error: any) {
      console.error('handleDeletePromotion error:', error);
      message.error('删除失败，请稍后再试');
    }
  };

  // 推广职位表格列定义
  const promotionColumns: ColumnsType<PromotedJobRecord> = [
    {
      title: '职位信息',
      key: 'job',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.job?.title || '未找到职位'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.job?.company?.name || '-'}
          </Text>
          <div style={{ fontSize: 12, color: '#bfbfbf', marginTop: 4 }}>
            ID: {record.jobId}
          </div>
        </div>
      ),
    },
    {
      title: '推广类型',
      dataIndex: 'promotionType',
      key: 'promotionType',
      width: 150,
      render: (type: string, record) => (
        <div>
          <Tag color="blue">{type}</Tag>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
            曝光频率：每 {record.displayFrequency} 个内容显示一次
          </div>
        </div>
      ),
    },
    {
      title: '时间范围',
      key: 'dateRange',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 12 }}>开始：{dayjs(record.startDate).format('YYYY-MM-DD HH:mm')}</div>
          <div style={{ fontSize: 12 }}>结束：{dayjs(record.endDate).format('YYYY-MM-DD HH:mm')}</div>
        </div>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a, b) => a.priority - b.priority,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'default'}
          text={isActive ? '投放中' : '已暂停'}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditPromotion(record)}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? '暂停' : '启用'}>
            <Button
              type="link"
              icon={record.isActive ? <DownOutlined /> : <UpOutlined />}
              onClick={() => handleTogglePromotion(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个推广职位吗？"
            onConfirm={() => handleDeletePromotion(record)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Banner 管理区域 */}
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>首页 Banner 管理</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              维护 App 首页轮播广告，支持排序、上下线控制
            </Text>
          </div>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadBanners}
              loading={bannerLoading}
            >
              刷新
            </Button>
            <Button
              onClick={handleSaveAllSort}
              disabled={bannerLoading}
            >
              保存全部排序
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateBanner}
            >
              新建Banner
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {/* 搜索和筛选 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input
              placeholder="搜索标题、副标题..."
              prefix={<SearchOutlined />}
              value={bannerSearchKeyword}
              onChange={(e) => setBannerSearchKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={bannerStatusFilter}
              onChange={setBannerStatusFilter}
            >
              <Option value="all">全部状态</Option>
              <Option value="active">展示中</Option>
              <Option value="inactive">已下线</Option>
            </Select>
          </Col>
          {selectedBannerIds.length > 0 && (
            <Col span={12}>
              <Space>
                <Text type="secondary">已选择 {selectedBannerIds.length} 项</Text>
                <Button
                  size="small"
                  onClick={() => handleBatchUpdateStatus(true)}
                >
                  批量上线
                </Button>
                <Button
                  size="small"
                  onClick={() => handleBatchUpdateStatus(false)}
                >
                  批量下线
                </Button>
                <Popconfirm
                  title={`确定要删除选中的 ${selectedBannerIds.length} 个Banner吗？`}
                  onConfirm={handleBatchDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button size="small" danger>
                    批量删除
                  </Button>
                </Popconfirm>
                <Button size="small" onClick={() => setSelectedBannerIds([])}>
                  取消选择
                </Button>
              </Space>
            </Col>
          )}
        </Row>

        {/* Banner 表格 */}
        <Table
          columns={bannerColumns}
          dataSource={banners}
          rowKey="id"
          loading={bannerLoading}
          pagination={{
            current: bannerPage,
            pageSize: bannerPageSize,
            total: bannerTotal,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page) => setBannerPage(page),
          }}
          rowSelection={{
            selectedRowKeys: selectedBannerIds,
            onChange: (keys) => setSelectedBannerIds(keys as string[]),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 推广职位管理区域 */}
      <Card
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>推广职位管理</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              控制首页推荐位的职位曝光，支持设置展示频率、优先级和投放时间
            </Text>
          </div>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadPromotions}
              loading={promotionLoading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreatePromotion}
            >
              新建推广职位
            </Button>
          </Space>
        }
      >
        <Table
          columns={promotionColumns}
          dataSource={promotions}
          rowKey="id"
          loading={promotionLoading}
          pagination={{
            current: promotionPage,
            pageSize: promotionPageSize,
            total: promotionTotal,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page) => setPromotionPage(page),
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Banner 表单弹窗 */}
      <Modal
        title={editingBannerId ? '编辑Banner' : '新建Banner'}
        open={bannerFormVisible}
        onOk={handleBannerSubmit}
        onCancel={() => {
          setBannerFormVisible(false);
          bannerForm.resetFields();
          setEditingBannerId(null);
        }}
        width={700}
        okText="保存"
        cancelText="取消"
        confirmLoading={uploading}
      >
        <Form
          form={bannerForm}
          layout="vertical"
          initialValues={defaultBannerForm}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[
              { required: true, message: '请输入标题' },
              { max: 100, message: '标题不超过100字符' },
            ]}
          >
            <Input placeholder="请输入Banner标题" />
          </Form.Item>

          <Form.Item
            name="subtitle"
            label="副标题"
            rules={[
              { required: true, message: '请输入副标题' },
              { max: 150, message: '副标题不超过150字符' },
            ]}
          >
            <Input placeholder="请输入Banner副标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ max: 500, message: '描述不超过500字符' }]}
          >
            <TextArea
              rows={3}
              placeholder="请输入Banner描述（可选）"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="imageUrl"
            label="图片链接"
            rules={[
              { required: true, message: '请输入图片链接或上传图片' },
              { type: 'url', message: '请输入有效的URL地址' },
            ]}
            extra="支持输入图片URL或点击上传按钮上传图片"
          >
            <Input.Group compact>
              <Input
                style={{ width: 'calc(100% - 100px)' }}
                placeholder="https://example.com/banner.png"
                value={bannerForm.getFieldValue('imageUrl')}
                onChange={(e) => bannerForm.setFieldsValue({ imageUrl: e.target.value })}
              />
              <Upload
                showUploadList={false}
                beforeUpload={async (file) => {
                  try {
                    const url = await handleImageUpload(file);
                    bannerForm.setFieldsValue({ imageUrl: url });
                    return false; // 阻止自动上传
                  } catch (error) {
                    return false;
                  }
                }}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  上传
                </Button>
              </Upload>
            </Input.Group>
          </Form.Item>

          {bannerForm.getFieldValue('imageUrl') && (
            <Form.Item label="图片预览">
              <Image
                src={bannerForm.getFieldValue('imageUrl')}
                alt="Banner预览"
                width={200}
                style={{ borderRadius: 4 }}
                preview={{
                  src: bannerForm.getFieldValue('imageUrl'),
                }}
              />
            </Form.Item>
          )}

          <Form.Item
            name="linkTargetType"
            label="跳转配置"
            rules={[{ required: true, message: '请选择跳转方式' }]}
          >
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="app">App 内跳转</Radio.Button>
              <Radio.Button value="web">网页链接</Radio.Button>
              <Radio.Button value="none">不跳转</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item shouldUpdate={(prev, next) => prev.linkTargetType !== next.linkTargetType || prev.appLinkType !== next.appLinkType}>
            {({ getFieldValue }) => {
              const targetType = getFieldValue('linkTargetType');
              const appLinkType = getFieldValue('appLinkType');
              const showCustomType = targetType === 'app' && appLinkType === 'custom';

              if (targetType === 'app') {
                return (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="appLinkType"
                          label="App 内位置"
                          rules={[{ required: true, message: '请选择跳转位置' }]}
                          extra="选择 App 内的落地页面类型"
                        >
                          <Select
                            options={appLinkOptions}
                            placeholder="请选择落地页"
                          />
                        </Form.Item>
                      </Col>
                      {showCustomType && (
                        <Col span={12}>
                          <Form.Item
                            name="customAppLinkType"
                            label="自定义跳转类型"
                            rules={[
                              { required: true, message: '请输入跳转类型' },
                              { max: 50, message: '跳转类型不超过50字符' },
                            ]}
                          >
                            <Input placeholder="例如: custom-page" />
                          </Form.Item>
                        </Col>
                      )}
                    </Row>
                    <Form.Item
                      name="appLinkTarget"
                      label="跳转参数"
                      rules={[
                        { required: true, message: '请输入跳转参数' },
                        { max: 200, message: '跳转参数不超过200字符' },
                      ]}
                      extra="例如职位ID、帖子ID或自定义路径参数，App 内将按类型解析跳转"
                    >
                      <Input placeholder={getAppTargetPlaceholder(showCustomType ? '' : appLinkType)} />
                    </Form.Item>
                  </>
                );
              }

              if (targetType === 'web') {
                return (
                  <Form.Item
                    name="webUrl"
                    label="网页 URL"
                    rules={[
                      { required: true, message: '请输入网页链接' },
                      { type: 'url', message: '请输入有效的URL地址' },
                    ]}
                    extra="H5/外部页面链接，例如活动落地页"
                  >
                    <Input placeholder="https://example.com/landing" />
                  </Form.Item>
                );
              }

              return null;
            }}
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sortOrder"
                label="排序权重"
                rules={[
                  { type: 'number', min: 0, max: 1000, message: '排序值必须在0-1000之间' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={1000}
                  placeholder="数字越大越靠前"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="状态"
                valuePropName="checked"
              >
                <Switch checkedChildren="上线" unCheckedChildren="下线" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 推广职位表单弹窗 */}
      <Modal
        title={editingPromotionId ? '编辑推广职位' : '新建推广职位'}
        open={promotionFormVisible}
        onOk={handlePromotionSubmit}
        onCancel={() => {
          setPromotionFormVisible(false);
          promotionForm.resetFields();
          setEditingPromotionId(null);
        }}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={promotionForm}
          layout="vertical"
          initialValues={defaultPromotionForm}
        >
          <Form.Item
            name="jobId"
            label="职位 ID"
            rules={[{ required: true, message: '请输入职位ID' }]}
          >
            <Input
              placeholder="请输入要推广的职位ID"
              disabled={Boolean(editingPromotionId)}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="promotionType"
                label="推广类型"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="NORMAL">NORMAL - 常规曝光</Option>
                  <Option value="PREMIUM">PREMIUM - 加强曝光</Option>
                  <Option value="FEATURED">FEATURED - 重点推荐</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="displayFrequency"
                label="展示频率"
                rules={[
                  { required: true, message: '请输入展示频率' },
                  { type: 'number', min: 1, message: '展示频率必须大于0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="每N个内容显示一次"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ type: 'number', min: 0, message: '优先级必须大于等于0' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="数字越大优先级越高"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="状态"
                valuePropName="checked"
              >
                <Switch checkedChildren="立即投放" unCheckedChildren="暂不投放" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  style={{ width: '100%' }}
                  placeholder="选择开始时间"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="结束时间"
                rules={[
                  { required: true, message: '请选择结束时间' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const startDate = getFieldValue('startDate');
                      if (!value || !startDate || value.isAfter(startDate)) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('结束时间必须晚于开始时间'));
                    },
                  }),
                ]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  style={{ width: '100%' }}
                  placeholder="选择结束时间"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default HomeContentManagement;
