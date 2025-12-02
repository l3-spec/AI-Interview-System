import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Tag, Space, Divider, List, Typography, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Job } from '../../types/interview';
import { jobApi } from '../../services/api';

const { Title, Text } = Typography;

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJob = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const jobData = await jobApi.getById(id);
        setJob(jobData);
      } catch (error) {
        console.error('加载职位详情失败:', error);
        message.error('加载职位详情失败');
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await jobApi.delete(id);
      message.success('删除职位成功');
      navigate('/jobs');
    } catch (error) {
      console.error('删除职位失败:', error);
      message.error('删除职位失败');
    }
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!job) {
    return <div>职位不存在</div>;
  }

  const workTypeMap = {
    fulltime: '全职',
    parttime: '兼职',
    internship: '实习',
    contract: '合同工'
  };

  const statusMap = {
    published: { color: 'green', text: '已发布' },
    draft: { color: 'gray', text: '草稿' },
    paused: { color: 'orange', text: '已暂停' },
    closed: { color: 'red', text: '已关闭' }
  };

  return (
    <Card
      title={
        <Space size="large">
          <Title level={4} style={{ margin: 0 }}>{job.title}</Title>
          <Tag color={statusMap[job.status as keyof typeof statusMap].color}>
            {statusMap[job.status as keyof typeof statusMap].text}
          </Tag>
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/jobs/edit/${id}`)}
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            删除
          </Button>
        </Space>
      }
    >
      <Descriptions column={2}>
        <Descriptions.Item label="所属部门">{job.department}</Descriptions.Item>
        <Descriptions.Item label="工作地点">{job.location}</Descriptions.Item>
        <Descriptions.Item label="薪资范围">
          {`${job.salary.min}k-${job.salary.max}k`}
        </Descriptions.Item>
        <Descriptions.Item label="工作类型">
          {workTypeMap[job.workType as keyof typeof workTypeMap]}
        </Descriptions.Item>
        <Descriptions.Item label="经验要求">{job.experience}</Descriptions.Item>
        <Descriptions.Item label="学历要求">{job.education}</Descriptions.Item>
      </Descriptions>

      <Divider />

      <Title level={5}>技能要求</Title>
      <Space wrap>
        {job.skills.map(skill => (
          <Tag key={skill}>{skill}</Tag>
        ))}
      </Space>

      <Divider />

      <Title level={5}>职位描述</Title>
      <Text>{job.description}</Text>

      <Divider />

      <Title level={5}>岗位职责</Title>
      <List
        dataSource={job.responsibilities}
        renderItem={item => (
          <List.Item>
            <Text>{item}</Text>
          </List.Item>
        )}
      />

      <Divider />

      <Title level={5}>任职要求</Title>
      <List
        dataSource={job.requirements}
        renderItem={item => (
          <List.Item>
            <Text>{item}</Text>
          </List.Item>
        )}
      />

      <Divider />

      <Title level={5}>福利待遇</Title>
      <Space wrap>
        {job.benefits.map(benefit => (
          <Tag key={benefit} color="blue">{benefit}</Tag>
        ))}
      </Space>

      <Divider />

      <Descriptions column={2}>
        <Descriptions.Item label="应聘人数">{job.applicantCount}</Descriptions.Item>
        <Descriptions.Item label="面试人数">{job.interviewCount}</Descriptions.Item>
        <Descriptions.Item label="录用人数">{job.hireCount}</Descriptions.Item>
        <Descriptions.Item label="发布时间">
          {new Date(job.createdAt).toLocaleDateString()}
        </Descriptions.Item>
        <Descriptions.Item label="最后更新">
          {new Date(job.updatedAt).toLocaleDateString()}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default JobDetail; 