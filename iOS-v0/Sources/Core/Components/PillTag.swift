import SwiftUI

struct PillTag: View {
  let text: String
  let foreground: Color
  let background: Color

  init(_ text: String, foreground: Color = AppColor.accent, background: Color = AppColor.accent.opacity(0.12)) {
    self.text = text
    self.foreground = foreground
    self.background = background
  }

  var body: some View {
    Text(text)
      .font(AppFont.caption(12))
      .padding(.vertical, 6)
      .padding(.horizontal, 10)
      .background(
        Capsule(style: .continuous)
          .fill(background)
      )
      .foregroundStyle(foreground)
  }
}
