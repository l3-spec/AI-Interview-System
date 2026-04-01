/**
 * 空状态组件 - 列表为空时的占位组件
 */

@Component
export struct EmptyState {
  @Prop title: string = '暂无数据';
  @Prop subtitle: string = '这里还没有内容';
  @Prop iconPath: string = '';  // 本地图标路径（可选）
  @Prop actionText: string = ''; // 操作按钮文字（可选）
  onAction?: () => void;

  build() {
    Column() {
      // 图标区域（使用文字模拟图标，后续替换为真实图标资源）
      Column() {
        Text('📭')
          .fontSize(64)
          .fontWeight(FontWeight.Normal)
      }
      .margin({ bottom: 24 })

      // 标题
      Text(this.title)
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.fromARGB(255, 44, 44, 44))
        .textAlign(TextAlign.Center)

      // 副标题
      if (this.subtitle) {
        Text(this.subtitle)
          .fontSize(14)
          .fontColor(Color.fromARGB(179, 90, 90, 90))
          .textAlign(TextAlign.Center)
          .margin({ top: 8 })
      }

      // 操作按钮
      if (this.actionText) {
        Button(this.actionText, { type: ButtonType.Capsule })
          .fontSize(14)
          .fontColor(Color.White)
          .backgroundColor(Color.fromARGB(255, 236, 124, 56))
          .padding({ left: 32, right: 32, top: 10, bottom: 10 })
          .margin({ top: 24 })
          .onClick(() => {
            this.onAction?.();
          })
      }
    }
    .width('100%')
    .padding({
      left: 32,
      right: 32,
      top: 60,
      bottom: 60,
    })
    .alignItems(HorizontalAlign.Center)
  }
}

/**
 * 空状态 - 搜索无结果
 */
@Component
export struct EmptySearchState {
  @Prop keyword: string = '';

  build() {
    EmptyState({
      title: '未找到相关结果',
      subtitle: `没有找到与"${this.keyword}"相关的内容\n试试其他关键词吧`,
      actionText: '清除搜索',
      onAction: () => {
        // 由调用方处理清除搜索
      }
    })
  }
}

/**
 * 空状态 - 网络错误
 */
@Component
export struct EmptyNetworkState {
  onRetry?: () => void;

  build() {
    EmptyState({
      title: '网络不给力',
      subtitle: '请检查网络连接后重试',
      actionText: '重新加载',
      onAction: () => {
        this.onRetry?.();
      }
    })
  }
}

/**
 * 空状态 - 我的投递为空
 */
@Component
export struct EmptyDeliveryState {
  onGoJobs?: () => void;

  build() {
    EmptyState({
      title: '还没有投递记录',
      subtitle: '去发现心仪的职位吧',
      actionText: '浏览职位',
      onAction: () => {
        this.onGoJobs?.();
      }
    })
  }
}

/**
 * 空状态 - 我的收藏为空
 */
@Component
export struct EmptyFavoriteState {
  onGoJobs?: () => void;

  build() {
    EmptyState({
      title: '还没有收藏职位',
      subtitle: '收藏感兴趣的职位，随时查看',
      actionText: '去收藏',
      onAction: () => {
        this.onGoJobs?.();
      }
    })
  }
}

/**
 * 空状态 - 面试记录为空
 */
@Component
export struct EmptyInterviewState {
  onStartInterview?: () => void;

  build() {
    EmptyState({
      title: '还没有面试记录',
      subtitle: '开始一次 AI 模拟面试吧',
      actionText: '开始面试',
      onAction: () => {
        this.onStartInterview?.();
      }
    })
  }
}

/**
 * 空状态 - 简历报告为空
 */
@Component
export struct EmptyReportState {
  onStartInterview?: () => void;

  build() {
    EmptyState({
      title: '暂无简历报告',
      subtitle: '完成一次 AI 面试后，报告会出现在这里',
      actionText: '开始面试',
      onAction: () => {
        this.onStartInterview?.();
      }
    })
  }
}
