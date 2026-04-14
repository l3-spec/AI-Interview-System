// AppRoutes.ets - 路由常量定义
// 新增路由：JOB_DETAIL, JOB_SELECTION, COMPANY_DETAIL, TOPIC, POST_DETAIL, CREATE_POST

export class AppRoutes {
  // 主页面路由
  static readonly HOME: string = 'home';
  static readonly JOBS: string = 'jobs';
  static readonly CIRCLE: string = 'circle';
  static readonly PROFILE: string = 'profile';
  static readonly AI: string = 'ai';

  // 职位相关路由
  static readonly JOB_DETAIL: string = 'job_detail';
  static readonly JOB_SELECTION: string = 'job_selection';
  static readonly COMPANY_DETAIL: string = 'company_detail';

  // 职圈相关路由
  static readonly TOPIC: string = 'topic';
  static readonly POST_DETAIL: string = 'post_detail';
  static readonly CREATE_POST: string = 'create_post';

  // AI面试相关路由
  static readonly AI_INTERVIEW: string = 'ai_interview';
  static readonly AI_RESULT: string = 'ai_result';
}
