import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Image,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  message
} from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AdminCompanySummary, AdminCompanyDetail } from '../services/api';
import { companyApi, homeContentApi, verificationApi } from '../services/api';
import { buildAssetUrl } from '../utils/url';

type StatusFilter = 'all' | 'active' | 'inactive';
type VerificationFilter = 'all' | 'verified' | 'unverified';

interface FiltersState {
  keyword: string;
  status: StatusFilter;
  verification: VerificationFilter;
}

const defaultFilters: FiltersState = {
  keyword: '',
  status: 'all',
  verification: 'all'
};

const { Option } = Select;

const CompanyManagement: React.FC = () => {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [companies, setCompanies] = useState<AdminCompanySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [actionState, setActionState] = useState<{ id: string | null; type?: 'active' | 'verified' | 'showcase' | 'remove-showcase' | 'verification-review' }>({ id: null });
  const [detailDrawer, setDetailDrawer] = useState<{ open: boolean; loading: boolean; data?: AdminCompanyDetail | null }>({ open: false, loading: false });
  const [selectedCompany, setSelectedCompany] = useState<AdminCompanySummary | null>(null);
  const [showcaseModalOpen, setShowcaseModalOpen] = useState(false);
  const [showcaseForm] = Form.useForm();

  const renderVerificationStatusTag = (verification?: AdminCompanyDetail['verification'], isVerified?: boolean) => {
    const status = (verification?.status || (isVerified ? 'APPROVED' : 'PENDING')).toString().toUpperCase();
    switch (status) {
      case 'APPROVED':
        return <Tag color="blue">已认证</Tag>;
      case 'REJECTED':
        return <Tag color="red">已驳回</Tag>;
      default:
        return <Tag color="gold">待认证</Tag>;
    }
  };

  const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : '-');

  const fetchCompanies = async (
    page: number = pagination.page,
    pageSize: number = pagination.pageSize,
    nextFilters: FiltersState = filters
  ) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, pageSize };
      if (nextFilters.keyword.trim().length > 0) {
        params.search = nextFilters.keyword.trim();
      }
      if (nextFilters.status === 'active') {
        params.isActive = true;
      } else if (nextFilters.status === 'inactive') {
        params.isActive = false;
      }
      if (nextFilters.verification === 'verified') {
        params.isVerified = true;
      } else if (nextFilters.verification === 'unverified') {
        params.isVerified = false;
      }

      const response = await companyApi.getList(params);
      if (response.success && response.data) {
        setCompanies(response.data.companies);
        setPagination({
          page: response.data.pagination.page,
          pageSize: response.data.pagination.pageSize,
          total: response.data.pagination.total
        });
      } else {
        message.error(response.message || '获取企业列表失败');
      }
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '获取企业列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    fetchCompanies(1, pagination.pageSize, filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    fetchCompanies(1, pagination.pageSize, defaultFilters);
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    const next = { ...filters, status: value };
    setFilters(next);
    fetchCompanies(1, pagination.pageSize, next);
  };

  const handleVerificationFilterChange = (value: VerificationFilter) => {
    const next = { ...filters, verification: value };
    setFilters(next);
    fetchCompanies(1, pagination.pageSize, next);
  };

  const handleActiveToggle = async (record: AdminCompanySummary, checked: boolean) => {
    setActionState({ id: record.id, type: 'active' });
    try {
      await companyApi.updateStatus(record.id, { isActive: checked });
      message.success(checked ? '已启用企业账号' : '已禁用企业账号');
      fetchCompanies(pagination.page, pagination.pageSize);
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '更新企业状态失败');
    } finally {
      setActionState({ id: null });
    }
  };

  const handleVerifyToggle = async (record: AdminCompanySummary, checked: boolean) => {
    setActionState({ id: record.id, type: 'verified' });
    try {
      await companyApi.updateStatus(record.id, { isVerified: checked });
      message.success(checked ? '已通过企业认证' : '已取消企业认证');
      fetchCompanies(pagination.page, pagination.pageSize);
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '更新认证状态失败');
    } finally {
      setActionState({ id: null });
    }
  };

  const openShowcaseModal = (record: AdminCompanySummary) => {
    setSelectedCompany(record);
    showcaseForm.setFieldsValue({
      role: record.showcase?.role || '',
      hiringCount: record.showcase?.hiringCount ?? 0,
      sortOrder: record.showcase?.sortOrder ?? 0
    });
    setShowcaseModalOpen(true);
  };

  const closeShowcaseModal = () => {
    setShowcaseModalOpen(false);
    setSelectedCompany(null);
    showcaseForm.resetFields();
  };

  const handleShowcaseSubmit = async () => {
    try {
      const values = await showcaseForm.validateFields();
      if (!selectedCompany) {
        return;
      }
      setActionState({ id: selectedCompany.id, type: 'showcase' });
      await homeContentApi.upsertCompanyShowcase({
        companyId: selectedCompany.id,
        role: values.role || undefined,
        hiringCount: values.hiringCount ?? 0,
        sortOrder: values.sortOrder ?? 0
      });
      message.success('精选企业已更新');
      closeShowcaseModal();
      fetchCompanies(pagination.page, pagination.pageSize);
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '更新精选企业失败');
    } finally {
      setActionState({ id: null });
    }
  };

  const handleRemoveShowcase = async (record: AdminCompanySummary) => {
    setActionState({ id: record.id, type: 'remove-showcase' });
    try {
      await homeContentApi.deleteCompanyShowcase(record.id);
      message.success('已取消精选企业');
      fetchCompanies(pagination.page, pagination.pageSize);
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '取消精选失败');
    } finally {
      setActionState({ id: null });
    }
  };

  const refreshCompanyDetail = async (companyId: string) => {
    try {
      const response = await companyApi.getDetail(companyId);
      if (response.success && response.data) {
        setDetailDrawer({ open: true, loading: false, data: response.data });
      }
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '刷新企业详情失败');
    }
  };

  const handleReviewVerification = async (status: 'approved' | 'rejected', comments?: string) => {
    if (!detailDrawer.data?.verification?.id || !detailDrawer.data?.id) {
      message.error('暂无可审核的认证申请');
      return;
    }

    const verificationId = detailDrawer.data.verification.id;
    const companyId = detailDrawer.data.id;
    setActionState({ id: verificationId, type: 'verification-review' });

    try {
      await verificationApi.review(verificationId, status, comments);
      message.success(status === 'approved' ? '认证已通过' : '认证已拒绝');
      await Promise.all([
        fetchCompanies(pagination.page, pagination.pageSize),
        refreshCompanyDetail(companyId)
      ]);
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '审核失败，请稍后再试');
    } finally {
      setActionState({ id: null });
    }
  };

  const handleRejectVerification = () => {
    if (!detailDrawer.data?.verification) {
      message.error('暂无认证申请');
      return;
    }
    let reason = '';
    Modal.confirm({
      title: '拒绝认证申请',
      okText: '拒绝',
      cancelText: '取消',
      okButtonProps: { danger: true },
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>请填写拒绝原因，方便企业修改后再次提交。</p>
          <Input.TextArea
            rows={3}
            maxLength={200}
            placeholder="请输入拒绝原因"
            onChange={(event) => {
              reason = event.target.value;
            }}
          />
        </div>
      ),
      onOk: async () => {
        await handleReviewVerification('rejected', reason || undefined);
      }
    });
  };

  const handleApproveVerification = () => {
    if (!detailDrawer.data?.verification) {
      message.error('暂无认证申请');
      return;
    }
    Modal.confirm({
      title: '通过认证申请',
      content: '确认通过该企业的实名认证申请？',
      okText: '通过',
      cancelText: '取消',
      onOk: async () => {
        await handleReviewVerification('approved');
      }
    });
  };

  const handleViewDetail = async (record: AdminCompanySummary) => {
    setDetailDrawer({ open: true, loading: true });
    try {
      const response = await companyApi.getDetail(record.id);
      if (response.success && response.data) {
        setDetailDrawer({ open: true, loading: false, data: response.data });
      } else {
        message.error(response.message || '获取企业详情失败');
        setDetailDrawer({ open: false, loading: false });
      }
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.message;
      message.error(errMsg || '获取企业详情失败');
      setDetailDrawer({ open: false, loading: false });
    }
  };

  const closeDetailDrawer = () => {
    setDetailDrawer({ open: false, loading: false, data: undefined });
  };

  const columns: ColumnsType<AdminCompanySummary> = [
    {
      title: '序号',
      width: 80,
      render: (_: any, __: AdminCompanySummary, index: number) => (pagination.page - 1) * pagination.pageSize + index + 1
    },
    {
      title: '企业',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (_: string, record: AdminCompanySummary) => (
        <Space align="start">
          <Avatar
            shape="square"
            size={48}
            src={record.logo || undefined}
            style={{ backgroundColor: '#f0f2f5' }}
          >
            {record.name?.slice(0, 1) || '?'}
          </Avatar>
          <div>
            <Space size="small" align="center">
              <span style={{ fontWeight: 600 }}>{record.name || '未命名企业'}</span>
              {record.showcase ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined style={{ color: '#d9d9d9' }} />}
            </Space>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record.email}</div>
            {record.focusArea && <div style={{ color: '#8c8c8c', fontSize: 12 }}>聚焦：{record.focusArea}</div>}
          </div>
        </Space>
      )
    },
    {
      title: '行业/规模',
      key: 'industry',
      width: 180,
      render: (_: any, record: AdminCompanySummary) => (
        <Space direction="vertical" size={2}>
          <span>{record.industry || '未填写'}</span>
          <span style={{ color: '#8c8c8c' }}>{record.scale || '-'}</span>
        </Space>
      )
    },
    {
      title: '职位/面试',
      key: 'stats',
      width: 180,
      render: (_: any, record: AdminCompanySummary) => (
        <Space>
          <Badge count={record.jobCount} color="#2f54eb" showZero />
          <span style={{ color: '#8c8c8c' }}>职位</span>
          <Badge count={record.interviewCount} color="#52c41a" showZero />
          <span style={{ color: '#8c8c8c' }}>面试</span>
        </Space>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 200,
      render: (_: any, record: AdminCompanySummary) => (
        <Space size="small">
          <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? '已启用' : '已禁用'}</Tag>
          {renderVerificationStatusTag(record.verification, record.isVerified)}
          {record.showcase && <Tag color="purple">精选</Tag>}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 320,
      render: (_: any, record: AdminCompanySummary) => (
        <Space size="small" wrap>
          <Button type="link" onClick={() => handleViewDetail(record)}>
            查看详情
          </Button>
          <Switch
            checked={record.isVerified}
            loading={actionState.id === record.id && actionState.type === 'verified'}
            checkedChildren="已认证"
            unCheckedChildren="未认证"
            onChange={(checked) => handleVerifyToggle(record, checked)}
          />
          <Switch
            checked={record.isActive}
            loading={actionState.id === record.id && actionState.type === 'active'}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={(checked) => handleActiveToggle(record, checked)}
          />
          <Button
            size="small"
            icon={record.showcase ? <StarFilled /> : <StarOutlined />}
            loading={actionState.id === record.id && actionState.type === 'showcase'}
            onClick={() => openShowcaseModal(record)}
          >
            {record.showcase ? '编辑精选' : '设为精选'}
          </Button>
          {record.showcase && (
            <Popconfirm
              title="确定取消精选吗？"
              okText="确认"
              cancelText="取消"
              onConfirm={() => handleRemoveShowcase(record)}
            >
              <Button
                size="small"
                danger
                loading={actionState.id === record.id && actionState.type === 'remove-showcase'}
              >
                取消精选
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space size="large" wrap align="center">
          <Input
            placeholder="搜索企业名称或邮箱"
            allowClear
            style={{ width: 260 }}
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
            onPressEnter={handleSearch}
          />
          <Select
            style={{ width: 160 }}
            value={filters.status}
            onChange={handleStatusFilterChange}
          >
            <Option value="all">全部状态</Option>
            <Option value="active">仅启用</Option>
            <Option value="inactive">仅禁用</Option>
          </Select>
          <Select
            style={{ width: 160 }}
            value={filters.verification}
            onChange={handleVerificationFilterChange}
          >
            <Option value="all">全部认证</Option>
            <Option value="verified">已认证</Option>
            <Option value="unverified">待认证</Option>
          </Select>
          <Space>
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Space>
      </Card>

      <Card title="企业列表" bodyStyle={{ padding: 0 }}>
        <Table<AdminCompanySummary>
          columns={columns}
          dataSource={companies}
          rowKey={(record) => record.id}
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 家企业`,
            onChange: (page, pageSize) => fetchCompanies(page, pageSize)
          }}
        />
      </Card>

      <Drawer
        width={560}
        title={detailDrawer.data?.name || '企业详情'}
        open={detailDrawer.open}
        onClose={closeDetailDrawer}
      >
        {detailDrawer.loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin />
          </div>
        ) : detailDrawer.data ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="企业名称">{detailDrawer.data.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="企业邮箱">{detailDrawer.data.email}</Descriptions.Item>
              <Descriptions.Item label="行业">{detailDrawer.data.industry || '-'}</Descriptions.Item>
              <Descriptions.Item label="规模">{detailDrawer.data.scale || '-'}</Descriptions.Item>
              <Descriptions.Item label="官网">{detailDrawer.data.website || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系信息">{detailDrawer.data.contact || '-'}</Descriptions.Item>
              <Descriptions.Item label="公司地址">{detailDrawer.data.address || '-'}</Descriptions.Item>
              <Descriptions.Item label="业务聚焦">{detailDrawer.data.focusArea || '-'}</Descriptions.Item>
              <Descriptions.Item label="企业标语">{detailDrawer.data.tagline || '-'}</Descriptions.Item>
            </Descriptions>

            <div>
              <Divider orientation="left">实名认证</Divider>
              {detailDrawer.data.verification ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space align="center">
                    <span>当前状态：</span>
                    {renderVerificationStatusTag(detailDrawer.data.verification, detailDrawer.data.isVerified)}
                  </Space>
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="法人姓名">{detailDrawer.data.verification.legalPerson || '-'}</Descriptions.Item>
                    <Descriptions.Item label="注册号 / 统一社会信用代码">
                      {detailDrawer.data.verification.registrationNumber || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="提交时间">
                      {formatDateTime(detailDrawer.data.verification.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="审核时间">
                      {formatDateTime(detailDrawer.data.verification.reviewedAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="审核意见" span={2}>
                      {detailDrawer.data.verification.reviewComments || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                  <Space align="start" size="large" wrap>
                    <div>
                      <div style={{ marginBottom: 8 }}>营业执照</div>
                      {detailDrawer.data.verification.businessLicense ? (
                        <Image
                          width={220}
                          src={buildAssetUrl(detailDrawer.data.verification.businessLicense)}
                          style={{ borderRadius: 6, border: '1px solid #f0f0f0' }}
                        />
                      ) : (
                        <Empty description="未上传营业执照" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      )}
                    </div>
                    <Space direction="vertical">
                      {detailDrawer.data.verification.businessLicense && (
                        <Button
                          type="link"
                          href={buildAssetUrl(detailDrawer.data.verification.businessLicense)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          新窗口查看原图
                        </Button>
                      )}
                      {detailDrawer.data.verification.status !== 'APPROVED' && (
                        <Space>
                          <Button
                            type="primary"
                            onClick={handleApproveVerification}
                            loading={actionState.id === detailDrawer.data.verification.id && actionState.type === 'verification-review'}
                          >
                            通过认证
                          </Button>
                          <Button
                            danger
                            onClick={handleRejectVerification}
                            loading={actionState.id === detailDrawer.data.verification.id && actionState.type === 'verification-review'}
                          >
                            拒绝
                          </Button>
                        </Space>
                      )}
                    </Space>
                  </Space>
                </Space>
              ) : (
                <Empty description="暂无认证申请" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>

            <div>
              <Divider orientation="left">主题色</Divider>
              {detailDrawer.data.themeColors.length > 0 ? (
                <Space size="middle" wrap>
                  {detailDrawer.data.themeColors.map((color) => (
                    <div
                      key={color}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: '1px solid #f0f0f0',
                        background: color
                      }}
                    />
                  ))}
                </Space>
              ) : (
                <Empty description="暂无主题色" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>

            <div>
              <Divider orientation="left">企业亮点</Divider>
              {detailDrawer.data.highlights.length > 0 ? (
                <Space wrap>
                  {detailDrawer.data.highlights.map((item) => (
                    <Tag key={item}>{item}</Tag>
                  ))}
                </Space>
              ) : (
                <Empty description="暂无亮点信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>

            <div>
              <Divider orientation="left">企业文化</Divider>
              {detailDrawer.data.culture.length > 0 ? (
                <Space wrap>
                  {detailDrawer.data.culture.map((item) => (
                    <Tag key={item} color="blue">
                      {item}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Empty description="暂无文化标签" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>

            <div>
              <Divider orientation="left">办公地点</Divider>
              {detailDrawer.data.locations.length > 0 ? (
                <Space wrap>
                  {detailDrawer.data.locations.map((item) => (
                    <Tag key={item} color="geekblue">
                      {item}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Empty description="暂无办公地点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>

            <div>
              <Divider orientation="left">企业数据</Divider>
              {detailDrawer.data.stats.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {detailDrawer.data.stats.map((item) => (
                    <Card key={item.label} size="small" bordered style={{ background: '#fafafa' }}>
                      <Space align="center" size="large">
                        <span style={{ fontWeight: 500 }}>{item.label}</span>
                        <Tag color={item.accent || 'blue'}>{item.value}</Tag>
                      </Space>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Empty description="暂无数据指标" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Space>
        ) : (
          <Empty description="暂无企业信息" />
        )}
      </Drawer>

      <Modal
        title={selectedCompany ? `设置精选企业 - ${selectedCompany.name}` : '设置精选企业'}
        open={showcaseModalOpen}
        onCancel={closeShowcaseModal}
        onOk={handleShowcaseSubmit}
        confirmLoading={selectedCompany ? actionState.id === selectedCompany.id && actionState.type === 'showcase' : false}
      >
        <Form layout="vertical" form={showcaseForm}>
          <Form.Item label="展示角色" name="role" rules={[{ max: 100, message: '不超过100个字符' }]}>
            <Input placeholder="例如：AI技术团队" />
          </Form.Item>
          <Form.Item
            label="计划招聘人数"
            name="hiringCount"
            rules={[{ type: 'number', min: 0, max: 9999, message: '请输入 0-9999 的数字' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} max={9999} />
          </Form.Item>
          <Form.Item
            label="展示排序"
            name="sortOrder"
            rules={[{ type: 'number', min: 0, max: 1000, message: '请输入 0-1000 的排序值' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} max={1000} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default CompanyManagement;
