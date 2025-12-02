import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Select, InputNumber, Space, message } from 'antd';
import { jobApi } from '../../services/api';
import { Job } from '../../types/interview';

const { TextArea } = Input;
const { Option } = Select;

const JobEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  console.log('JobEdit component rendered with id:', id);

  useEffect(() => {
    const loadJob = async () => {
      if (!id) {
        console.log('No job ID provided');
        setLoading(false);
        return;
      }
      
      console.log('Loading job with ID:', id);
      setLoading(true);
      try {
        const jobData = await jobApi.getById(id);
        console.log('Job data loaded:', jobData);
        
        // 格式化数据以适应表单
        form.setFieldsValue({
          ...jobData,
          requirements: jobData.requirements.join('\n'),
          responsibilities: jobData.responsibilities.join('\n'),
        });
        console.log('Form fields set');
      } catch (error) {
        console.error('加载职位详情失败:', error);
        message.error('加载职位详情失败');
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id, form]);

  const onFinish = async (values: any) => {
    if (!id) return;
    
    setSubmitting(true);
    try {
      // 处理薪资范围
      const salaryData = {
        min: values.salary?.min || 0,
        max: values.salary?.max || 0,
        currency: values.salary?.currency || 'CNY'
      };

      // 处理技能要求（可能是字符串或数组）
      const skillsArray = Array.isArray(values.skills) 
        ? values.skills 
        : [];

      // 处理职责和要求（可能是字符串或数组）
      const responsibilitiesArray = Array.isArray(values.responsibilities)
        ? values.responsibilities
        : (typeof values.responsibilities === 'string' ? values.responsibilities.split('\n').map((s: string) => s.trim()).filter(Boolean) : []);

      const requirementsArray = Array.isArray(values.requirements)
        ? values.requirements
        : (typeof values.requirements === 'string' ? values.requirements.split('\n').map((s: string) => s.trim()).filter(Boolean) : []);

      const benefitsArray = Array.isArray(values.benefits)
        ? values.benefits
        : [];

      // 构建职位数据
      const jobData: Partial<Job> = {
        title: values.title,
        department: values.department,
        location: values.location,
        workType: values.workType as Job['workType'],
        salary: salaryData as Job['salary'],
        experience: values.experience,
        education: values.education,
        skills: skillsArray,
        responsibilities: responsibilitiesArray,
        requirements: requirementsArray,
        benefits: benefitsArray,
        description: values.description,
        status: values.status as Job['status']
      };

      await jobApi.update(id, jobData);
      message.success('更新成功');
      navigate(`/jobs`);
    } catch (error) {
      console.error('更新职位失败:', error);
      message.error('更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        fontSize: '16px'
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card title="编辑职位">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            workType: 'fulltime',
            currency: 'CNY',
          }}
        >
        <Form.Item
          label="职位名称"
          name="title"
          rules={[{ required: true, message: '请输入职位名称' }]}
        >
          <Input placeholder="请输入职位名称" />
        </Form.Item>

        <Form.Item
          label="所属部门"
          name="department"
          rules={[{ required: true, message: '请输入所属部门' }]}
        >
          <Input placeholder="请输入所属部门" />
        </Form.Item>

        <Form.Item
          label="工作地点"
          name="location"
          rules={[{ required: true, message: '请输入工作地点' }]}
        >
          <Input placeholder="请输入工作地点" />
        </Form.Item>

        <Form.Item label="薪资范围" required>
          <Space>
            <Form.Item
              name={['salary', 'min']}
              rules={[{ required: true, message: '请输入最低薪资' }]}
              noStyle
            >
              <InputNumber<number>
                min={1}
                placeholder="最低薪资"
                style={{ width: 150 }}
                formatter={(value) => (value ? `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                parser={(value) => (value ? Number(value.replace(/\¥\s?|(,*)/g, '')) : 0)}
              />
            </Form.Item>
            <span>-</span>
            <Form.Item
              name={['salary', 'max']}
              rules={[{ required: true, message: '请输入最高薪资' }]}
              noStyle
            >
              <InputNumber<number>
                min={1}
                placeholder="最高薪资"
                style={{ width: 150 }}
                formatter={(value) => (value ? `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                parser={(value) => (value ? Number(value.replace(/\¥\s?|(,*)/g, '')) : 0)}
              />
            </Form.Item>
            <Form.Item
              name={['salary', 'currency']}
              noStyle
            >
              <Select style={{ width: 80 }}>
                <Option value="CNY">CNY</Option>
                <Option value="USD">USD</Option>
              </Select>
            </Form.Item>
          </Space>
        </Form.Item>

        <Form.Item
          label="工作类型"
          name="workType"
          rules={[{ required: true, message: '请选择工作类型' }]}
        >
          <Select>
            <Option value="fulltime">全职</Option>
            <Option value="parttime">兼职</Option>
            <Option value="internship">实习</Option>
            <Option value="contract">合同工</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="经验要求"
          name="experience"
          rules={[{ required: true, message: '请输入经验要求' }]}
        >
          <Input placeholder="例如：3-5年" />
        </Form.Item>

        <Form.Item
          label="学历要求"
          name="education"
          rules={[{ required: true, message: '请选择学历要求' }]}
        >
          <Select>
            <Option value="高中">高中</Option>
            <Option value="大专">大专</Option>
            <Option value="本科">本科</Option>
            <Option value="硕士">硕士</Option>
            <Option value="博士">博士</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="技能要求"
          name="skills"
          rules={[{ required: true, message: '请输入技能要求' }]}
        >
          <Select mode="tags" placeholder="请输入技能要求，按回车分隔">
            <Option value="React">React</Option>
            <Option value="Vue">Vue</Option>
            <Option value="Angular">Angular</Option>
            <Option value="Node.js">Node.js</Option>
            <Option value="Python">Python</Option>
            <Option value="Java">Java</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="职位描述"
          name="description"
          rules={[{ required: true, message: '请输入职位描述' }]}
        >
          <TextArea rows={4} placeholder="请输入职位描述" />
        </Form.Item>

        <Form.Item
          label="岗位职责"
          name="responsibilities"
          rules={[{ required: true, message: '请输入岗位职责' }]}
        >
          <TextArea rows={4} placeholder="请输入岗位职责，每行一项" />
        </Form.Item>

        <Form.Item
          label="任职要求"
          name="requirements"
          rules={[{ required: true, message: '请输入任职要求' }]}
        >
          <TextArea rows={4} placeholder="请输入任职要求，每行一项" />
        </Form.Item>

        <Form.Item
          label="福利待遇"
          name="benefits"
        >
          <Select mode="tags" placeholder="请输入福利待遇，按回车分隔">
            <Option value="五险一金">五险一金</Option>
            <Option value="年终奖">年终奖</Option>
            <Option value="带薪休假">带薪休假</Option>
            <Option value="加班补助">加班补助</Option>
            <Option value="餐补">餐补</Option>
            <Option value="交通补助">交通补助</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
          rules={[{ required: true, message: '请选择状态' }]}
        >
          <Select>
            <Option value="published">已发布</Option>
            <Option value="draft">草稿</Option>
            <Option value="paused">已暂停</Option>
            <Option value="closed">已关闭</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存
            </Button>
            <Button onClick={() => navigate(`/jobs`)}>
              取消
            </Button>
          </Space>
        </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default JobEdit; 
