import { Request, Response } from 'express';
import {
  getUserJobPreferences,
  updateUserJobPreferences,
} from '../services/jobPreferenceService';

export const fetchJobPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
      });
    }

    const data = await getUserJobPreferences(userId);
    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('获取职岗偏好失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取职岗偏好失败',
      error: error?.message ?? '服务器错误',
    });
  }
};

export const saveJobPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
      });
    }

    const { positionIds } = req.body ?? {};

    if (!Array.isArray(positionIds)) {
      return res.status(400).json({
        success: false,
        message: 'positionIds 必须是字符串数组',
      });
    }

    const data = await updateUserJobPreferences(userId, positionIds);
    return res.json({
      success: true,
      message: '职岗偏好已保存',
      data,
    });
  } catch (error: any) {
    const status = error?.message?.includes('最多只能选择') || error?.message?.includes('无效')
      ? 400
      : 500;
    console.error('保存职岗偏好失败:', error);
    return res.status(status).json({
      success: false,
      message: error?.message ?? '保存职岗偏好失败',
    });
  }
};
