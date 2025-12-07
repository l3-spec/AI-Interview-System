import SwiftUI

struct SectionHeader: View {
  let title: String
  var actionTitle: String?
  var action: (() -> Void)?

  var body: some View {
    HStack {
      Text(title)
        .font(AppFont.title(18))
        .foregroundStyle(AppColor.textPrimary)
      Spacer()
      if let actionTitle, let action {
        Button(action: action) {
          Text(actionTitle)
            .font(AppFont.caption(12))
            .foregroundStyle(AppColor.accent)
        }
        .buttonStyle(.plain)
      }
    }
  }
}
