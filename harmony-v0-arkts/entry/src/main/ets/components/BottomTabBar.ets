import { AppRoutes, isTabRoute } from '../router/AppRoutes';

interface BottomTabBarProps {
  currentRoute: string;
  onSelectRoute: (route: string) => void;
  onFabClick: () => void;
}

@Component
export default struct BottomTabBar {
  currentRoute: string;
  onSelectRoute: (route: string) => void;
  onFabClick: () => void;

  private readonly tabs = [
    { route: AppRoutes.HOME, label: '首页' },
    { route: AppRoutes.JOBS, label: '职岗' },
    { route: AppRoutes.CIRCLE, label: '职圈' },
    { route: AppRoutes.PROFILE, label: '我的' },
  ];

  aboutToAppear() {
    if (!isTabRoute(this.currentRoute)) {
      this.currentRoute = AppRoutes.HOME;
    }
  }

  build() {
    Stack({ alignContent: Alignment.BottomCenter }) {
      // Frosted glass styled background
      Row() {
        ForEach(this.tabs, (tab) => {
          const selected = this.currentRoute === tab.route;
          Column() {
            Text(tab.label)
              .fontSize(14)
              .fontWeight(selected ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(selected ? Color.fromARGB(255, 236, 124, 56) : Color.fromARGB(204, 33, 33, 33))
          }
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .height(56)
          .width('23%')
          .onClick(() => {
            this.onSelectRoute?.(tab.route);
          })
        }, (tab) => tab.route)
      }
      .backgroundColor(Color.fromARGB(235, 255, 255, 255))
      .borderRadius({ topLeft: 24, topRight: 24, bottomLeft: 24, bottomRight: 24 })
      .shadow({ radius: 12, color: Color.fromARGB(64, 0, 0, 0), offsetY: -2 })
      .margin({ bottom: 16, left: 24, right: 24 })

      // Central AI FAB
      Column() {
        const selected = this.currentRoute === AppRoutes.AI;
        Text('AI面')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor(selected ? Color.White : Color.fromARGB(255, 236, 124, 56))
      }
      .width(72)
      .height(72)
      .backgroundColor(this.currentRoute === AppRoutes.AI
        ? Color.fromARGB(255, 255, 154, 60)
        : Color.fromARGB(255, 255, 242, 230))
      .borderRadius(36)
      .borderWidth(this.currentRoute === AppRoutes.AI ? 0 : 1)
      .borderColor(Color.fromARGB(51, 236, 124, 56))
      .shadow({
        radius: this.currentRoute === AppRoutes.AI ? 16 : 8,
        color: Color.fromARGB(96, 236, 124, 56),
        offsetY: 4,
      })
      .align(Alignment.BottomCenter)
      .margin({ bottom: 40 })
      .onClick(() => {
        this.onFabClick?.();
      })
    }
    .height(120)
    .width('100%')
  }
}
