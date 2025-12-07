import SwiftUI

struct AiEntryButton: View {
  var isActive: Bool
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      ZStack {
        Circle()
          .fill(
            LinearGradient(
              colors: isActive ?
                [Color(red: 1.00, green: 0.60, blue: 0.32), Color(red: 1.00, green: 0.48, blue: 0.16)] :
                [Color.white, AppColor.accentSoft],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 76, height: 76)
          .shadow(color: AppColor.accent.opacity(isActive ? 0.5 : 0.25), radius: isActive ? 18 : 10, x: 0, y: 10)
        Text("AI面")
          .font(.system(size: 16, weight: .semibold, design: .rounded))
          .foregroundStyle(isActive ? Color.white : AppColor.accent)
      }
    }
    .buttonStyle(.plain)
  }
}
