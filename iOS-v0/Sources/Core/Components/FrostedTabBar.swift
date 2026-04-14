import SwiftUI

/// 毛玻璃底栏 - 对齐 Android FrostedGlassBottomBar
/// 参照 Android：深色半透明底栏，有圆角，无缺口（简洁设计），左右下有间距
struct FrostedTabBar: View {
  let selected: AppTab
  let onSelect: (AppTab) -> Void

  var body: some View {
    HStack(spacing: 0) {
      // 左侧两个按钮
      TabItem(icon: "house.fill", title: "首页", isSelected: selected == .home) {
        onSelect(.home)
      }
      TabItem(icon: "briefcase.fill", title: "职岗", isSelected: selected == .jobs) {
        onSelect(.jobs)
      }
      
      // 中间留空（AI面按钮位置，68dp 宽度）
      Spacer()
        .frame(width: 68)
      
      // 右侧两个按钮
      TabItem(icon: "bubble.left.and.bubble.right.fill", title: "职圈", isSelected: selected == .circle) {
        onSelect(.circle)
      }
      TabItem(icon: "person.crop.circle.fill", title: "我的", isSelected: selected == .profile) {
        onSelect(.profile)
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 6)
    .frame(height: 86)
    .background(
      // 底栏背景（简洁圆角矩形，无缺口）
      RoundedRectangle(cornerRadius: 24, style: .continuous)
        .fill(
          LinearGradient(
            colors: [
              AppColor.bottomBarBackground,
              Color(red: 0.18, green: 0.18, blue: 0.18).opacity(0.7)
            ],
            startPoint: .top,
            endPoint: .bottom
          )
        )
        .overlay(
          RoundedRectangle(cornerRadius: 24, style: .continuous)
            .stroke(AppColor.bottomBarBorder, lineWidth: 1)
        )
        .background(
          // 轻微模糊效果（iOS 17+）
          RoundedRectangle(cornerRadius: 24, style: .continuous)
            .fill(.ultraThinMaterial)
        )
    )
    .padding(.horizontal, 12)
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
          .font(.system(size: 24, weight: .regular))
          .foregroundStyle(isSelected ? AppColor.bottomBarSelected : AppColor.bottomBarUnselected)
        Text(title)
          .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
          .foregroundStyle(isSelected ? AppColor.bottomBarSelected : AppColor.bottomBarUnselected)
      }
      .padding(.vertical, 6)
      .padding(.horizontal, 8)
      .frame(maxWidth: .infinity)
    }
    .buttonStyle(.plain)
  }
}
