import SwiftUI

/// 用户帖子列表行 - 用于职圈 / 个人中心等列表场景
struct UserPostRow: View {
  let post: UserPost

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(post.title)
        .font(AppFont.title(15))
        .foregroundStyle(AppColor.textPrimary)
      Text(post.content)
        .font(AppFont.body(13))
        .foregroundStyle(AppColor.textSecondary)
        .lineLimit(2)
      HStack(spacing: 8) {
        PillTag("点赞 \(post.likeCount)", foreground: AppColor.textSecondary, background: AppColor.outline)
        PillTag("评论 \(post.commentCount)", foreground: AppColor.textSecondary, background: AppColor.outline)
      }
    }
    .padding()
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 14))
    .overlay(RoundedRectangle(cornerRadius: 14).stroke(AppColor.outline, lineWidth: 1))
  }
}
