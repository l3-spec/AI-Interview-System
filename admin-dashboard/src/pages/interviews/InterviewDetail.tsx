import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Typography,
  message
} from 'antd';
import {
  AudioMutedOutlined,
  AudioOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  TrophyOutlined,
  VideoCameraAddOutlined,
  VideoCameraOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { interviewApi } from '../../services/api';
import { InterviewDetailResponse } from '../../types/interview';
import { AIRI_WEB_URL } from '../../config/constants';
import './InterviewDetail.css';

type CallStatus = 'initializing' | 'connected' | 'error';

const InterviewDetail: React.FC = () => {
  const { id } = useParams();
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const airiFrameRef = useRef<HTMLIFrameElement | null>(null);
  const airiTimeoutRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('initializing');
  const [airiError, setAiriError] = useState<string | null>(null);
  const [airiReady, setAiriReady] = useState(false);
  const [airiReloadKey, setAiriReloadKey] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<InterviewDetailResponse | null>(null);

  const qaList = detailData?.qaList ?? [];
  const interview = detailData?.interview;
  const assessment = detailData?.assessment;

  const totalQuestions = qaList.length;
  const answeredCount = qaList.filter(item => !!item.answer).length;
  const nextQuestion = qaList.find(item => !item.answer);

  const statusConfig: Record<string, { color: string; text: string }> = {
    pending: { color: 'gold', text: '待面试' },
    scheduled: { color: 'blue', text: '已安排' },
    completed: { color: 'green', text: '已完成' },
    cancelled: { color: 'red', text: '已取消' }
  };

  const resultConfig: Record<string, { color: string; text: string }> = {
    pending: { color: 'default', text: '待评估' },
    reviewing: { color: 'processing', text: '评估中' },
    passed: { color: 'success', text: '通过' },
    failed: { color: 'error', text: '未通过' }
  };

  const categoryConfig: Record<string, { color: string; text: string }> = {
    technical: { color: 'geekblue', text: '技术问题' },
    behavioral: { color: 'purple', text: '行为问题' },
    situational: { color: 'cyan', text: '情景问题' },
    general: { color: 'default', text: '通用问题' }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) {
      return '--';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) {
      return `${remainingSeconds}秒`;
    }
    return `${minutes}分${remainingSeconds.toString().padStart(2, '0')}秒`;
  };

  const airiUrl = useMemo(() => {
    const base = (AIRI_WEB_URL || '').trim();
    if (!base) {
      return '';
    }

    const sanitizedBase = base.startsWith('http://') || base.startsWith('https://')
      ? base
      : `http://${base}`;

    try {
      const target = new URL(sanitizedBase);
      if (id) {
        target.searchParams.set('sessionId', id);
      }
      if (interview?.jobTitle) {
        target.searchParams.set('position', interview.jobTitle);
      }
      if (interview?.candidate?.name) {
        target.searchParams.set('candidate', interview.candidate.name);
      }

      const nextPendingQuestion = nextQuestion?.question || qaList[0]?.question;
      if (nextPendingQuestion) {
        target.searchParams.set('question', nextPendingQuestion);
      }

      const total = totalQuestions || qaList.length || 1;
      const current = Math.min(answeredCount + 1, total);
      target.searchParams.set('totalQuestions', String(total));
      target.searchParams.set('currentQuestion', String(current));

      if (interview?.duration) {
        target.searchParams.set('durationMinutes', String(interview.duration));
        target.searchParams.set('countdownSeconds', String(interview.duration * 60));
      } else {
        target.searchParams.set('countdownSeconds', String(180));
      }

      return target.toString();
    } catch (error) {
      console.error('[InterviewDetail] Failed to build AIRI url', error);
      return '';
    }
  }, [AIRI_WEB_URL, id, interview, nextQuestion, qaList, answeredCount, totalQuestions]);



  const fetchInterviewDetail = useCallback(async () => {
    if (!id) {
      return;
    }

    setDetailLoading(true);
    try {
      const data = await interviewApi.getDetail(id);
      setDetailData(data);
    } catch (error) {
      message.error('获取面试详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCallStatus('error');
        message.error('当前浏览器不支持摄像头或麦克风访问');
        return;
      }

      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          media.getTracks().forEach(track => track.stop());
          return;
        }

        mediaStreamRef.current = media;

        if (userVideoRef.current) {
          userVideoRef.current.srcObject = media;
          userVideoRef.current.play().catch(() => undefined);
        }

        setMicMuted(false);
        setCameraOff(false);
        setCallStatus('connected');
      } catch (err) {
        setCallStatus('error');
        message.error('未能获取摄像头或麦克风权限');
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchInterviewDetail();
  }, [fetchInterviewDetail]);

  useEffect(() => {
    if (airiTimeoutRef.current) {
      window.clearTimeout(airiTimeoutRef.current);
      airiTimeoutRef.current = null;
    }

    setAiriReady(false);
    setAiriError(null);

    if (!airiUrl) {
      return;
    }

    airiTimeoutRef.current = window.setTimeout(() => {
      setAiriError('数字人加载超时，请稍后重试');
    }, 8000);

    return () => {
      if (airiTimeoutRef.current) {
        window.clearTimeout(airiTimeoutRef.current);
        airiTimeoutRef.current = null;
      }
    };
  }, [airiUrl, airiReloadKey]);

  useEffect(() => {
    if (!airiUrl) {
      setAiriError('未配置 AIRI_WEB_URL，无法加载数字人');
      return;
    }
  }, [airiUrl]);

  const toggleMicrophone = () => {
    if (!mediaStreamRef.current) {
      return;
    }
    const nextMuted = !micMuted;
    mediaStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !nextMuted;
    });
    setMicMuted(nextMuted);
  };

  const toggleCamera = () => {
    if (!mediaStreamRef.current) {
      return;
    }
    const nextOff = !cameraOff;
    mediaStreamRef.current.getVideoTracks().forEach(track => {
      track.enabled = !nextOff;
    });
    setCameraOff(nextOff);
  };

  const endCall = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setMicMuted(true);
    setCameraOff(true);
    setCallStatus('initializing');
    message.info('已结束通话');
  };

  const refreshDigitalHuman = () => {
    setAiriReady(false);
    setAiriError(null);
    setAiriReloadKey(key => key + 1);
  };



  return (
    <div className="interview-room">
      <div className="interview-room__header">
        <div>
          <Typography.Title level={4} className="interview-room__title">
            数字人面试
          </Typography.Title>
          <Typography.Text className="interview-room__subtitle">
            会话编号 {id || '未指定'}
            {interview && ` · ${interview.jobTitle}`}
          </Typography.Text>
        </div>

        <Space size="middle" align="center" wrap>
          <div className={`interview-room__status interview-room__status--${callStatus}`}>
            {callStatus === 'initializing' && '准备中'}
            {callStatus === 'connected' && '通话进行中'}
            {callStatus === 'error' && '设备未就绪'}
          </div>
          {interview && (
            <>
              <Tag color={statusConfig[interview.status]?.color || 'default'}>
                {statusConfig[interview.status]?.text || interview.status}
              </Tag>
              <Tag color={resultConfig[interview.result]?.color || 'default'}>
                {resultConfig[interview.result]?.text || interview.result}
              </Tag>
            </>
          )}
        </Space>
      </div>

      <div className="interview-room__body">
        <div className="interview-room__main">
          <div className="interview-stage">
            <div className="interview-stage__airi">
              {airiUrl && (
                <iframe
                  key={airiReloadKey}
                  ref={airiFrameRef}
                  src={airiUrl}
                  title="AIRI 数字人"
                  allow="microphone; camera; autoplay"
                  onLoad={() => {
                    if (airiTimeoutRef.current) {
                      window.clearTimeout(airiTimeoutRef.current);
                      airiTimeoutRef.current = null;
                    }
                    setAiriReady(true);
                    setAiriError(null);
                  }}
                />
              )}

              {!airiUrl && (
                <div className="interview-stage__error">
                  未配置数字人地址，请设置 VITE_AIRI_WEB_URL
                </div>
              )}

              {airiUrl && !airiReady && !airiError && (
                <div className="interview-stage__placeholder">
                  <span>数字人加载中...</span>
                </div>
              )}

              {airiError && (
                <div className="interview-stage__error">
                  <span>{airiError}</span>
                  <Button
                    size="small"
                    type="primary"
                    style={{ marginTop: 12 }}
                    onClick={refreshDigitalHuman}
                  >
                    重试加载
                  </Button>
                </div>
              )}

              {airiUrl && airiReady && (
                <div className="interview-stage__airi-actions">
                  <Button size="small" ghost onClick={refreshDigitalHuman}>
                    刷新数字人
                  </Button>
                </div>
              )}
            </div>

            <div className="interview-stage__user-feed">
              <video ref={userVideoRef} muted className="interview-stage__user-video" />
              {!mediaStreamRef.current && (
                <div className="interview-stage__user-placeholder">等待摄像头</div>
              )}
              {cameraOff && (
                <div className="interview-stage__user-placeholder">摄像头已关闭</div>
              )}
            </div>
          </div>

          <div className="interview-room__controls">
            <Space size="large">
              <Button
                shape="circle"
                size="large"
                icon={micMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
                onClick={toggleMicrophone}
              />
              <Button
                shape="circle"
                size="large"
                icon={cameraOff ? <VideoCameraAddOutlined /> : <VideoCameraOutlined />}
                onClick={toggleCamera}
              />
              <Button
                shape="circle"
                size="large"
                danger
                type="primary"
                icon={<PhoneOutlined />}
                onClick={endCall}
              />
            </Space>
          </div>

          <Card
            bordered={false}
            className="interview-room__card interview-room__panel"
            title="实时问答记录"
            extra={
              totalQuestions > 0 && (
                <Typography.Text className="interview-room__panel-extra">
                  已完成 {answeredCount}/{totalQuestions}
                </Typography.Text>
              )
            }
          >
            <Spin spinning={detailLoading && !detailData}>
              {qaList.length === 0 ? (
                <Empty description="暂无问答记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div className="interview-transcript">
                  {qaList.map((item, index) => (
                    <div className="interview-transcript__item" key={item.id}>
                      <div className="interview-transcript__question">
                        <span className="interview-transcript__badge">Q{index + 1}</span>
                        <Typography.Paragraph className="interview-transcript__text">{item.question}</Typography.Paragraph>
                      </div>
                      {item.answer && (
                        <div className="interview-transcript__answer">
                          <span className="interview-transcript__badge interview-transcript__badge--answer">A</span>
                          <Typography.Paragraph className="interview-transcript__text">{item.answer}</Typography.Paragraph>
                        </div>
                      )}
                      {item.feedback && (
                        <Typography.Paragraph className="interview-transcript__feedback">
                          AI反馈：{item.feedback}
                        </Typography.Paragraph>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Spin>
          </Card>
        </div>

        <div className="interview-room__sidebar">
          <Card bordered={false} className="interview-room__card" title="候选人信息">
            <Spin spinning={detailLoading && !detailData}>
              {interview ? (
                <Space direction="vertical" size={20} className="interview-sidebar__content">
                  <Space align="start" size={16}>
                    <Avatar size={64} src={interview.candidate.avatar} icon={<UserOutlined />} />
                    <div>
                      <div className="interview-sidebar__name">{interview.candidate.name}</div>
                      <div className="interview-sidebar__role">
                        {interview.jobTitle} · {interview.department}
                      </div>
                      <Space size={8} style={{ marginTop: 8 }}>
                        <Tag color={statusConfig[interview.status]?.color || 'default'}>
                          {statusConfig[interview.status]?.text || interview.status}
                        </Tag>
                        <Tag color={resultConfig[interview.result]?.color || 'default'}>
                          {resultConfig[interview.result]?.text || interview.result}
                        </Tag>
                      </Space>
                    </div>
                  </Space>

                  <Space direction="vertical" size={12} className="interview-sidebar__meta">
                    <div>
                      <MailOutlined />
                      <span>{interview.candidate.email}</span>
                    </div>
                    <div>
                      <PhoneOutlined />
                      <span>{interview.candidate.phone}</span>
                    </div>
                    <div>
                      <CalendarOutlined />
                      <span>{dayjs(interview.interviewDate).format('YYYY-MM-DD HH:mm')}</span>
                    </div>
                    <div>
                      <ClockCircleOutlined />
                      <span>预计 {interview.duration} 分钟</span>
                    </div>
                  </Space>

                  {interview.candidate.skills?.length > 0 && (
                    <div className="interview-sidebar__skills">
                      <Typography.Text>技能标签</Typography.Text>
                      <div className="interview-sidebar__skill-list">
                        {interview.candidate.skills.slice(0, 8).map(skill => (
                          <Tag key={skill}>{skill}</Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </Space>
              ) : (
                <Empty description="暂无候选人信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Spin>
          </Card>

          <Card bordered={false} className="interview-room__card" title="AI能力评估">
            <Spin spinning={detailLoading && !detailData}>
              {assessment ? (
                <Space direction="vertical" size={16} className="interview-assessment">
                  <div className="interview-assessment__score">
                    <TrophyOutlined />
                    <div>
                      <div className="interview-assessment__score-value">{assessment.overallScore.toFixed(1)}</div>
                      <div className="interview-assessment__score-label">综合得分 / 10</div>
                    </div>
                  </div>
                  {assessment.feedback && (
                    <Typography.Paragraph className="interview-assessment__feedback">
                      {assessment.feedback}
                    </Typography.Paragraph>
                  )}
                  {assessment.strengths?.length > 0 && (
                    <div className="interview-assessment__chips">
                      <Typography.Text>优势亮点</Typography.Text>
                      <div className="interview-assessment__chip-list">
                        {assessment.strengths.map(item => (
                          <Tag color="cyan" key={item}>
                            {item}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  {assessment.improvements?.length > 0 && (
                    <div className="interview-assessment__chips">
                      <Typography.Text>改进建议</Typography.Text>
                      <div className="interview-assessment__chip-list">
                        {assessment.improvements.map(item => (
                          <Tag color="orange" key={item}>
                            {item}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </Space>
              ) : (
                <Empty description="评估数据生成中" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Spin>
          </Card>

          <Card
            bordered={false}
            className="interview-room__card"
            title="面试题目"
            extra={
              nextQuestion ? (
                <Typography.Text className="interview-room__panel-extra">
                  下一题：{nextQuestion.question}
                </Typography.Text>
              ) : (
                <Typography.Text className="interview-room__panel-extra">
                  所有问题已完成
                </Typography.Text>
              )
            }
          >
            <Spin spinning={detailLoading && !detailData}>
              {qaList.length === 0 ? (
                <Empty description="暂无面试问题" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={qaList}
                  split={false}
                  className="interview-question-list"
                  renderItem={(item, index) => {
                    const answered = !!item.answer;
                    const category = categoryConfig[item.category] || { color: 'default', text: item.category };

                    return (
                      <List.Item className={`interview-question-item ${answered ? 'is-answered' : 'is-pending'}`}>
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <Space align="center" size={8} className="interview-question-item__header">
                            <span className="interview-question-item__index">Q{index + 1}</span>
                            <Tag color={category.color}>{category.text}</Tag>
                            <Tag color={answered ? 'success' : 'gold'}>{answered ? '已完成' : '待回答'}</Tag>
                          </Space>
                          <Typography.Text className="interview-question-item__question">
                            {item.question}
                          </Typography.Text>
                          <Space size={12} className="interview-question-item__meta">
                            {answered && (
                              <>
                                <span>评分 {item.score}</span>
                                <span>时长 {formatDuration(item.duration)}</span>
                              </>
                            )}
                          </Space>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              )}
            </Spin>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewDetail;
