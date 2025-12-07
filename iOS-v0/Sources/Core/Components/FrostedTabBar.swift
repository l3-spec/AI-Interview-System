import SwiftUI

struct FrostedTabBar: View {
  let selected: AppTab
  let onSelect: (AppTab) -> Void

  var body: some View {
    HStack(spacing: 22) {
      TabItem(icon: "house.fill", title: "首页", isSelected: selected == .home) {
        onSelect(.home)
      }
      TabItem(icon: "briefcase.fill", title: "职岗", isSelected: selected == .jobs) {
        onSelect(.jobs)
      }
      Spacer(minLength: 48)
      TabItem(icon: "bubble.left.and.bubble.right.fill", title: "职圈", isSelected: selected == .circle) {
        onSelect(.circle)
      }
      TabItem(icon: "person.crop.circle.fill", title: "我的", isSelected: selected == .profile) {
        onSelect(.profile)
      }
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity)
    .background(
      RoundedRectangle(cornerRadius: 24, style: .continuous)
        .fill(.ultraThinMaterial)
        .overlay(
          RoundedRectangle(cornerRadius: 24, style: .continuous)
            .stroke(AppColor.outline, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.35), radius: 16, x: 0, y: 12)
    )
    .padding(.horizontal, 16)
    .padding(.bottom, 12)
  }
}

private struct TabItem: View {
  let icon: String
  let title: String
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 6) {
        Image(systemName: icon)
          .font(.system(size: 20, weight: .semibold))
          .foregroundStyle(isSelected ? AppColor.accent : AppColor.textSecondary)
        Text(title)
          .font(AppFont.caption(11))
          .foregroundStyle(isSelected ? AppColor.accent : AppColor.textSecondary)
      }
      .padding(.vertical, 4)
      .frame(maxWidth: .infinity)
    }
    .buttonStyle(.plain)
  }
}
