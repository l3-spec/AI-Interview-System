import SwiftUI

/// 毛玻璃底栏 - 严格对齐 Android `FrostedGlassBottomBar`
/// - 浅色渐变 F8F8F8→FFFFFF 叠加 .ultraThinMaterial
/// - 顶部两角圆角 24
/// - 中心留 72pt 给 AI 入口按钮
struct FrostedTabBar: View {
  let selected: AppTab
  let onSelect: (AppTab) -> Void
  /// 安全区底部 inset（对齐 Android bottomInset）
  var bottomInset: CGFloat = 0

  var body: some View {
    ZStack(alignment: .top) {
      background
      tabs
    }
    .frame(height: 72 + bottomInset)
    .frame(maxWidth: .infinity)
  }

  /// 背景层：毛玻璃 + 浅色渐变 + 顶圆角 + 白色边框 + 阴影
  private var background: some View {
    UnevenRoundedRectangle(
      topLeadingRadius: 24,
      bottomLeadingRadius: 0,
      bottomTrailingRadius: 0,
      topTrailingRadius: 24,
      style: .continuous
    )
    .fill(.ultraThinMaterial)
    .overlay(
      UnevenRoundedRectangle(
        topLeadingRadius: 24,
        bottomLeadingRadius: 0,
        bottomTrailingRadius: 0,
        topTrailingRadius: 24,
        style: .continuous
      )
      .fill(
        LinearGradient(
          colors: [AppColor.bottomBarGradientStart, AppColor.bottomBarGradientEnd],
          startPoint: .top,
          endPoint: .bottom
        )
      )
    )
    .overlay(
      UnevenRoundedRectangle(
        topLeadingRadius: 24,
        bottomLeadingRadius: 0,
        bottomTrailingRadius: 0,
        topTrailingRadius: 24,
        style: .continuous
      )
      .stroke(AppColor.bottomBarBorder, lineWidth: 1)
    )
    .shadow(color: Color.black.opacity(0.08), radius: 10, x: 0, y: -2)
  }

  /// 标签按钮行 - 对齐 Android：左2 / 空 72pt / 右2
  private var tabs: some View {
    HStack(spacing: 0) {
      TabItem(icon: "house.fill", title: "首页", isSelected: selected == .home) {
        onSelect(.home)
      }
      TabItem(icon: "briefcase.fill", title: "职岗", isSelected: selected == .jobs) {
        onSelect(.jobs)
      }
      Spacer().frame(width: 72)
      TabItem(icon: "bubble.left.and.bubble.right.fill", title: "职圈", isSelected: selected == .circle) {
        onSelect(.circle)
      }
      TabItem(icon: "person.crop.circle.fill", title: "我的", isSelected: selected == .profile) {
        onSelect(.profile)
      }
    }
    .padding(.horizontal, 24)
    .padding(.top, 10)
    .padding(.bottom, 10 + bottomInset)
  }
}

private struct TabItem: View {
  let icon: String
  let title: String
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 4) {
        Image(systemName: icon)
          .font(.system(size: 22, weight: .regular))
          .foregroundStyle(isSelected ? AppColor.bottomBarSelected : AppColor.bottomBarUnselected)
        Text(title)
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(isSelected ? AppColor.bottomBarSelected : AppColor.bottomBarUnselected)
      }
      .frame(maxWidth: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
  }
}
