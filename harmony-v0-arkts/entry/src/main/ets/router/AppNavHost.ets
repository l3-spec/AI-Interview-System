// AppNavHost.ets - 应用导航路由
// 包含所有页面的路由配置

import { AppRoutes } from './AppRoutes';
import BottomTabBar from '../components/BottomTabBar';
import HomePage from '../pages/home/HomePage';
import { HomeScreen } from '../pages/home/HomeScreen';
import JobsPage from '../pages/jobs/JobsPage';
import { JobsScreen } from '../pages/jobs/JobsScreen';
import { JobDetailScreen } from '../pages/jobs/JobDetailScreen';
import { JobSelectionScreen } from '../pages/jobs/JobSelectionScreen';
import { CompanyDetailScreen } from '../pages/jobs/CompanyDetailScreen';
import CirclePage from '../pages/circle/CirclePage';
import { CircleScreen } from '../pages/circle/CircleScreen';
import { TopicAggregationScreen } from '../pages/circle/TopicAggregationScreen';
import { PostDetailScreen } from '../pages/circle/PostDetailScreen';
import { CreatePostScreen } from '../pages/circle/CreatePostScreen';
import ProfilePage from '../pages/profile/ProfilePage';
import AiLandingPage from '../pages/ai/AiLandingPage';

interface AppNavHostProps {
  startRoute?: string;
}

@Component
export default struct AppNavHost {
  startRoute?: string;
  @State private currentRoute: string = AppRoutes.HOME;
  @State private routeParams: Record<string, string> = {};

  aboutToAppear() {
    this.currentRoute = this.startRoute ?? AppRoutes.HOME;
  }

  build() {
    Stack() {
      Column() {
        this.renderCurrentPage();
        if (!this.hideBottomBar()) {
          Blank().height(140);
        }
      }
      .width('100%')
      .height('100%')

      if (!this.hideBottomBar()) {
        BottomTabBar({
          currentRoute: this.currentRoute,
          onSelectRoute: (route: string) => this.navigateTo(route),
          onFabClick: () => this.navigateTo(AppRoutes.AI),
        })
          .width('100%')
          .align(Alignment.BottomCenter);
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.White)
  }

  private hideBottomBar(): boolean {
    const hideRoutes = [AppRoutes.AI, AppRoutes.JOB_DETAIL, AppRoutes.JOB_SELECTION,
      AppRoutes.COMPANY_DETAIL, AppRoutes.POST_DETAIL, AppRoutes.CREATE_POST, AppRoutes.TOPIC];
    return hideRoutes.indexOf(this.currentRoute) !== -1;
  }

  private navigateTo(route: string, params?: Record<string, string>) {
    if (this.currentRoute === route) {
      return;
    }
    this.currentRoute = route;
    if (params) {
      this.routeParams = params;
    }
  }

  @Builder
  renderCurrentPage() {
    switch (this.currentRoute) {
      // 首页
      case AppRoutes.HOME:
        HomeScreen({
          onNavigateToJobs: () => this.navigateTo(AppRoutes.JOBS),
          onNavigateToCircle: () => this.navigateTo(AppRoutes.CIRCLE),
          onNavigateToSearch: () => this.navigateTo(AppRoutes.TOPIC, { topicId: 'topic_search', topicTitle: '搜索' }),
          onCardClick: (card) => {
            this.navigateTo(AppRoutes.POST_DETAIL, { postId: card.id });
          }
        });
        break;

      // 职位列表
      case AppRoutes.JOBS:
        JobsScreen({
          onJobClick: (jobId) => {
            this.navigateTo(AppRoutes.JOB_DETAIL, { jobId: jobId });
          },
          onCompanyClick: (companyId) => {
            this.navigateTo(AppRoutes.COMPANY_DETAIL, { companyId: companyId });
          },
          onJobSelectionClick: () => {
            this.navigateTo(AppRoutes.JOB_SELECTION);
          },
          onEditIntentionClick: () => {
            this.navigateTo(AppRoutes.JOB_SELECTION);
          }
        });
        break;

      // 职位详情
      case AppRoutes.JOB_DETAIL:
        JobDetailScreen({
          jobId: this.routeParams['jobId'] || '',
          onBack: () => this.navigateTo(AppRoutes.JOBS),
          onCompanyClick: (companyId) => {
            this.navigateTo(AppRoutes.COMPANY_DETAIL, { companyId: companyId });
          },
          onJobClick: (jobId) => {
            this.navigateTo(AppRoutes.JOB_DETAIL, { jobId: jobId });
          },
          onStartInterview: (position, category) => {
            this.navigateTo(AppRoutes.AI, { position: position, category: category });
          }
        });
        break;

      // AI职位选择
      case AppRoutes.JOB_SELECTION:
        JobSelectionScreen({
          onBack: () => this.navigateTo(AppRoutes.JOBS),
          onStartInterview: (position, category) => {
            this.navigateTo(AppRoutes.AI, {
              positionId: position.id,
              positionName: position.name,
              categoryId: category.id,
              categoryName: category.name
            });
          }
        });
        break;

      // 公司详情
      case AppRoutes.COMPANY_DETAIL:
        CompanyDetailScreen({
          companyId: this.routeParams['companyId'] || '',
          onBack: () => this.navigateTo(AppRoutes.JOBS),
          onRoleClick: (jobId) => {
            this.navigateTo(AppRoutes.JOB_DETAIL, { jobId: jobId });
          }
        });
        break;

      // 职圈主页
      case AppRoutes.CIRCLE:
        CircleScreen({
          onSearchClick: () => {
            this.navigateTo(AppRoutes.TOPIC, { topicId: 'topic_search', topicTitle: '搜索' });
          },
          onCardClick: (card) => {
            this.navigateTo(AppRoutes.POST_DETAIL, { postId: card.id });
          },
          onCreatePost: () => {
            this.navigateTo(AppRoutes.CREATE_POST);
          }
        });
        break;

      // 话题聚合页
      case AppRoutes.TOPIC:
        TopicAggregationScreen({
          topicId: this.routeParams['topicId'] || 'topic_default',
          topicTitle: this.routeParams['topicTitle'] || '热门话题',
          onBack: () => this.navigateTo(AppRoutes.CIRCLE),
          onPostClick: (postId) => {
            this.navigateTo(AppRoutes.POST_DETAIL, { postId: postId });
          }
        });
        break;

      // 帖子详情
      case AppRoutes.POST_DETAIL:
        PostDetailScreen({
          postId: this.routeParams['postId'] || '',
          onBack: () => this.navigateTo(AppRoutes.CIRCLE)
        });
        break;

      // 创建帖子
      case AppRoutes.CREATE_POST:
        CreatePostScreen({
          onBack: () => this.navigateTo(AppRoutes.CIRCLE),
          onPublish: (title, content, tags) => {
            // 发布成功后返回
            this.navigateTo(AppRoutes.CIRCLE);
          }
        });
        break;

      // 个人中心
      case AppRoutes.PROFILE:
        ProfilePage();
        break;

      // AI面试
      case AppRoutes.AI:
        AiLandingPage({
          onBack: () => this.navigateTo(AppRoutes.HOME),
        });
        break;

      // 默认显示首页
      default:
        HomeScreen({
          onNavigateToJobs: () => this.navigateTo(AppRoutes.JOBS),
          onNavigateToCircle: () => this.navigateTo(AppRoutes.CIRCLE),
          onNavigateToSearch: () => this.navigateTo(AppRoutes.TOPIC, { topicId: 'topic_search', topicTitle: '搜索' }),
        });
        break;
    }
  }
}
