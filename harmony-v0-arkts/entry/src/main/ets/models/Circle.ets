/**
 * 职圈数据模型 - 帖子、评论、话题等
 */

/**
 * 内容类型枚举
 */
export enum ContentType {
  ASSESSMENT = 'ASSESSMENT',
  USER_POST = 'USER_POST',
  EXPERT_POST = 'EXPERT_POST',
  PROMOTED_JOB = 'PROMOTED_JOB',
}

/**
 * 用户帖子作者
 */
export class UserPostAuthor {
  id: string | null;
  name: string | null;
  avatar: string | null;
  headline: string | null;

  constructor(json: any) {
    this.id = json.id ?? null;
    this.name = json.name ?? null;
    this.avatar = json.avatar ?? null;
    this.headline = json.headline ?? null;
  }
}

/**
 * 用户帖子
 */
export class UserPost {
  id: string;
  title: string;
  content: string;
  coverImage: string | null;
  images: string[];
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  author: UserPostAuthor | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.title = json.title ?? '';
    this.content = json.content ?? '';
    this.coverImage = json.coverImage ?? null;
    this.images = json.images ?? [];
    this.tags = json.tags ?? [];
    this.viewCount = json.viewCount ?? 0;
    this.likeCount = json.likeCount ?? 0;
    this.commentCount = json.commentCount ?? 0;
    this.shareCount = json.shareCount ?? 0;
    this.createdAt = json.createdAt ?? '';
    this.author = json.author ? new UserPostAuthor(json.author) : null;
  }
}

/**
 * 大咖分享
 */
export class ExpertPost {
  id: string;
  expertName: string;
  expertTitle: string;
  expertCompany: string;
  expertAvatar: string | null;
  title: string;
  content: string;
  coverImage: string | null;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.expertName = json.expertName ?? '';
    this.expertTitle = json.expertTitle ?? '';
    this.expertCompany = json.expertCompany ?? '';
    this.expertAvatar = json.expertAvatar ?? null;
    this.title = json.title ?? '';
    this.content = json.content ?? '';
    this.coverImage = json.coverImage ?? null;
    this.tags = json.tags ?? [];
    this.viewCount = json.viewCount ?? 0;
    this.likeCount = json.likeCount ?? 0;
    this.commentCount = json.commentCount ?? 0;
    this.publishedAt = json.publishedAt ?? null;
  }
}

/**
 * 推广职位中的公司信息
 */
export class CompanyInfo {
  id: string;
  name: string;
  logo: string | null;
  industry: string | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.name = json.name ?? '';
    this.logo = json.logo ?? null;
    this.industry = json.industry ?? null;
  }
}

/**
 * 推广职位中的职位信息
 */
export class JobInfo {
  id: string;
  title: string;
  salary: string | null;
  location: string | null;
  skills: string[];
  company: CompanyInfo;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.title = json.title ?? '';
    this.salary = json.salary ?? null;
    this.location = json.location ?? null;
    this.skills = json.skills ?? [];
    this.company = new CompanyInfo(json.company ?? {});
  }
}

/**
 * 推广职位
 */
export class PromotedJob {
  promotionId: string;
  promotionType: string;
  job: JobInfo;

  constructor(json: any) {
    this.promotionId = json.promotionId ?? '';
    this.promotionType = json.promotionType ?? 'NORMAL';
    this.job = new JobInfo(json.job ?? {});
  }
}

/**
 * 首页内容卡片（混排）
 */
export class HomeFeedItem {
  type: ContentType;
  id: string;
  data: any;

  constructor(type: ContentType, id: string, data: any) {
    this.type = type;
    this.id = id;
    this.data = data;
  }
}

/**
 * Banner 数据
 */
export class Banner {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  linkType: string | null;
  linkId: string | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.title = json.title ?? '';
    this.subtitle = json.subtitle ?? '';
    this.description = json.description ?? '';
    this.imageUrl = json.imageUrl ?? '';
    this.linkType = json.linkType ?? null;
    this.linkId = json.linkId ?? null;
  }
}

/**
 * 首页精选文章
 */
export class HomeFeaturedArticle {
  id: string;
  title: string;
  summary: string | null;
  imageUrl: string;
  author: string | null;
  tags: string[];
  viewCount: number;
  category: string | null;
  createdAt: string | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.title = json.title ?? '';
    this.summary = json.summary ?? null;
    this.imageUrl = json.imageUrl ?? '';
    this.author = json.author ?? null;
    this.tags = json.tags ?? [];
    this.viewCount = json.viewCount ?? 0;
    this.category = json.category ?? null;
    this.createdAt = json.createdAt ?? null;
  }
}

/**
 * 帖子评论
 */
export class Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  likeCount: number;
  createdAt: string;
  parentId: string | null;
  replies: Comment[];

  constructor(json: any) {
    this.id = json.id ?? '';
    this.postId = json.postId ?? '';
    this.userId = json.userId ?? '';
    this.userName = json.userName ?? '';
    this.userAvatar = json.userAvatar ?? null;
    this.content = json.content ?? '';
    this.likeCount = json.likeCount ?? 0;
    this.createdAt = json.createdAt ?? '';
    this.parentId = json.parentId ?? null;
    this.replies = (json.replies ?? []).map((r: any) => new Comment(r));
  }
}

/**
 * 话题
 */
export class Topic {
  id: string;
  name: string;
  description: string | null;
  postCount: number;
  followCount: number;
  isFollowed: boolean;
  coverImage: string | null;

  constructor(json: any) {
    this.id = json.id ?? '';
    this.name = json.name ?? '';
    this.description = json.description ?? null;
    this.postCount = json.postCount ?? 0;
    this.followCount = json.followCount ?? 0;
    this.isFollowed = json.isFollowed ?? false;
    this.coverImage = json.coverImage ?? null;
  }
}

/**
 * 发布帖子请求
 */
export class CreatePostRequest {
  title: string;
  content: string;
  images: string[];
  tags: string[];
  topicId: string | null;

  constructor(params: {
    title: string;
    content: string;
    images?: string[];
    tags?: string[];
    topicId?: string;
  }) {
    this.title = params.title;
    this.content = params.content;
    this.images = params.images ?? [];
    this.tags = params.tags ?? [];
    this.topicId = params.topicId ?? null;
  }
}
