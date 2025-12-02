import { Request, Response } from 'express';
import { fetchActiveDictionary } from '../services/jobDictionaryService';

export const getJobDictionary = async (req: Request, res: Response) => {
  try {
    const includeInactive =
      typeof req.query.includeInactive === 'string'
        ? ['true', '1'].includes(req.query.includeInactive.toLowerCase())
        : false;

    const data = await fetchActiveDictionary(includeInactive);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('获取职岗字典失败:', error);
    res.status(500).json({
      success: false,
      message: '获取职岗字典失败',
      error: error.message,
    });
  }
};
