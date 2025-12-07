import SwiftUI

struct PrimaryButton: View {
  let title: String
  var icon: String?
  var isLoading: Bool = false
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 10) {
        if isLoading {
          ProgressView().tint(.white)
        } else if let icon {
          Image(systemName: icon)
        }
        Text(title)
          .font(.system(size: 16, weight: .semibold, design: .rounded))
      }
      .frame(maxWidth: .infinity)
      .padding()
      .background(
        RoundedRectangle(cornerRadius: 14, style: .continuous)
          .fill(LinearGradient(colors: [AppColor.accent, Color(red: 1.00, green: 0.68, blue: 0.36)], startPoint: .leading, endPoint: .trailing))
      )
      .foregroundStyle(.white)
      .shadow(color: AppColor.accent.opacity(0.35), radius: 10, x: 0, y: 8)
    }
    .buttonStyle(.plain)
    .disabled(isLoading)
  }
}
