import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 确保上传目录存在
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = 'uploads/';

    // 根据文件类型创建不同的子目录
    if (file.fieldname === 'logo') {
      dir += 'logos/';
    } else if (file.fieldname === 'businessLicense') {
      dir += 'licenses/';
    } else if (file.fieldname === 'resume') {
      dir += 'resumes/';
    } else if (file.fieldname === 'avatar') {
      dir += 'avatars/';
    } else if (file.fieldname === 'postImages') {
      dir += 'posts/';
    } else {
      dir += 'others/';
    }

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的图片类型
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  // 允许的文档类型
  const allowedDocTypes = /pdf|doc|docx/;
  // 允许的视频类型
  const allowedVideoTypes = /mp4|webm|ogg|quicktime/;

  const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
    allowedDocTypes.test(path.extname(file.originalname).toLowerCase()) ||
    allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());

  const mimetype = allowedImageTypes.test(file.mimetype) ||
    /application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document)/.test(file.mimetype) ||
    allowedVideoTypes.test(file.mimetype) ||
    file.mimetype === 'video/quicktime'; // iOS .mov files often use this

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传图片、文档或视频文件'));
  }
};

// 创建multer实例
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB限制
  },
  fileFilter: fileFilter
});

// 单文件上传中间件
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// 多文件上传中间件
export const uploadMultiple = (fieldName: string, maxCount: number = 5) =>
  upload.array(fieldName, maxCount);

// 混合上传中间件
export const uploadFields = (fields: { name: string; maxCount?: number }[]) =>
  upload.fields(fields); 
