import SwiftUI

/// AI 面试入口按钮 - 对齐 Android AIInterviewFab
/// 72dp 大小，选中时橙色渐变，未选中时白色渐变+橙色边框
struct AiEntryButton: View {
  var isActive: Bool
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      ZStack {
        // 背景渐变
        Circle()
          .fill(
            LinearGradient(
              colors: isActive ?
                [Color(red: 1.00, green: 0.60, blue: 0.24), Color(red: 1.00, green: 0.48, blue: 0.11)] : // #FF9A3C -> #FF7A1C
                [Color.white, AppColor.accentSoft], // #FFFFFF -> #FFF2E6
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 72, height: 72)
          .overlay(
            // 未选中时显示边框
            Circle()
              .stroke(isActive ? Color.clear : Color(red: 0.93, green: 0.49, blue: 0.22).opacity(0.2), lineWidth: 1)
          )
          .shadow(
            color: Color.black.opacity(isActive ? 0.3 : 0.2),
            radius: isActive ? 12 : 8,
            x: 0,
            y: isActive ? 6 : 4
          )
        
        // 文字
        Text("AI面")
          .font(.system(size: 15, weight: isActive ? .bold : .semibold, design: .default))
          .foregroundStyle(isActive ? Color.white : Color(red: 0.93, green: 0.49, blue: 0.22)) // #EC7C38
      }
    }
    .buttonStyle(.plain)
  }
}
