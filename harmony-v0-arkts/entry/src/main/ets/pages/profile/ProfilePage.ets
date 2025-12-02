@Component
export default struct ProfilePage {
  build() {
    Column({ space: 20 }) {
      this.buildHeader();
      this.buildQuickActions();
      this.buildSettingsList();
    }
    .width('100%')
    .height('100%')
    .padding({ left: 16, right: 16, top: 24, bottom: 24 })
    .backgroundColor(Color.fromARGB(255, 250, 250, 250))
  }

  private buildHeader() {
    Row() {
      Column() {
        Text('Hi，面试官')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
        Text('登录后可同步安卓端的账号、Token 与偏好设置')
          .fontSize(14)
          .fontColor(Color.fromARGB(170, 90, 90, 90))
          .margin({ top: 4 })
      }
    }
  }

  private buildQuickActions() {
    Row({ space: 12 }) {
      this.actionCard('面试设置', '配置题库与技能标签')
      this.actionCard('通话记录', '查看历史面试回放')
    }
  }

  private actionCard(title: string, subtitle: string) {
    Column() {
      Text(title)
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
      Text(subtitle)
        .fontSize(12)
        .fontColor(Color.fromARGB(170, 90, 90, 90))
        .margin({ top: 6 })
    }
    .width('50%')
    .padding(18)
    .backgroundColor(Color.White)
    .borderRadius(18)
    .shadow({ radius: 10, color: Color.fromARGB(32, 0, 0, 0), offsetY: 2 })
  }

  private buildSettingsList() {
    Column({ space: 12 }) {
      this.settingItem('个人资料', '同步头像、联系方式与求职偏好')
      this.settingItem('通知管理', '面试提醒、系统消息推送')
      this.settingItem('账号安全', '设备管理、密码与验证码登录')
    }
  }

  private settingItem(title: string, subtitle: string) {
    Column() {
      Text(title)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
      Text(subtitle)
        .fontSize(13)
        .fontColor(Color.fromARGB(170, 90, 90, 90))
        .margin({ top: 4 })
    }
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .shadow({ radius: 10, color: Color.fromARGB(32, 0, 0, 0), offsetY: 2 })
  }
}
