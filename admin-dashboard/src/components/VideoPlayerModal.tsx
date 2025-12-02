import React from 'react';
import { Modal, Alert } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';

interface Props {
  visible: boolean;
  videoUrl: string | null;
  candidateName?: string;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<Props> = ({
  visible,
  videoUrl,
  candidateName,
  onClose
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <VideoCameraOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          面试视频 {candidateName && `- ${candidateName}`}
        </div>
      }
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      bodyStyle={{ padding: '20px' }}
    >
      {videoUrl ? (
        <div style={{ width: '100%', textAlign: 'center' }}>
          <video
            controls
            style={{
              width: '100%',
              maxHeight: '500px',
              borderRadius: '8px',
              backgroundColor: '#000'
            }}
            preload="metadata"
          >
            <source src={videoUrl} type="video/mp4" />
            您的浏览器不支持视频播放。
          </video>
          
          <div style={{ 
            marginTop: '16px', 
            fontSize: '12px', 
            color: '#666',
            textAlign: 'left'
          }}>
            <Alert
              message="提示"
              description="当前为演示模式，视频链接为示例地址。在实际使用中，这里会播放候选人的真实面试视频。"
              type="info"
              showIcon
              style={{ textAlign: 'left' }}
            />
          </div>
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0',
          color: '#999'
        }}>
          暂无面试视频
        </div>
      )}
    </Modal>
  );
};

export default VideoPlayerModal; 