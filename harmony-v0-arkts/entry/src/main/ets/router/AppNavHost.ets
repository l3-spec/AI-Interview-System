import { AppRoutes } from './AppRoutes';
import BottomTabBar from '../components/BottomTabBar';
import HomePage from '../pages/home/HomePage';
import JobsPage from '../pages/jobs/JobsPage';
import CirclePage from '../pages/circle/CirclePage';
import ProfilePage from '../pages/profile/ProfilePage';
import AiLandingPage from '../pages/ai/AiLandingPage';

interface AppNavHostProps {
  startRoute?: string;
}

@Component
export default struct AppNavHost {
  startRoute?: string;
  @State private currentRoute: string = AppRoutes.HOME;

  aboutToAppear() {
    this.currentRoute = this.startRoute ?? AppRoutes.HOME;
  }

  build() {
    Stack() {
      Column() {
        this.renderCurrentPage();
        if (!this.hideBottomBar()) {
          Blank().height(140); // keep space for bottom bar overlay
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
    return this.currentRoute === AppRoutes.AI;
  }

  private navigateTo(route: string) {
    if (this.currentRoute === route) {
      return;
    }
    this.currentRoute = route;
  }

  private renderCurrentPage() {
    switch (this.currentRoute) {
      case AppRoutes.HOME:
        HomePage({
          onNavigateToJobs: () => this.navigateTo(AppRoutes.JOBS),
          onNavigateToCircle: () => this.navigateTo(AppRoutes.CIRCLE),
        });
        break;
      case AppRoutes.JOBS:
        JobsPage();
        break;
      case AppRoutes.CIRCLE:
        CirclePage();
        break;
      case AppRoutes.PROFILE:
        ProfilePage();
        break;
      case AppRoutes.AI:
        AiLandingPage({
          onBack: () => this.navigateTo(AppRoutes.HOME),
        });
        break;
      default:
        HomePage({
          onNavigateToJobs: () => this.navigateTo(AppRoutes.JOBS),
          onNavigateToCircle: () => this.navigateTo(AppRoutes.CIRCLE),
        });
        break;
    }
  }
}
