import SwiftUI

struct ProfileView: View {
  @EnvironmentObject private var appState: AppState
  @State private var showLogin = false
  @State private var showHistory = false
  @State private var showMessages = false
  @State private var showPreferences = false
  @State private var showAssessments = false
  @State private var showMyPosts = false
  @State private var showCreatePost = false

  var onRequireLogin: (() -> Void)?

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      header

      if appState.currentUser == nil {
        GlassCard {
          VStack(alignment: .leading, spacing: 10) {
            Text("登录后同步面试记录与收藏")
              .font(AppFont.title(16))
            PrimaryButton(title: "手机号验证码登录") {
              showLogin = true
            }
          }
        }
      } else {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
              Text("常用功能")
                .font(AppFont.title(16))
              VStack(spacing: 12) {
                ProfileActionRow(icon: "sparkles", title: "AI 面试记录", subtitle: "查看历史与报告") {
                  showHistory = true
                }
                ProfileActionRow(icon: "bell.badge", title: "消息中心", subtitle: "系统通知、评论回复") {
                  showMessages = true
                }
                ProfileActionRow(icon: "target", title: "岗位偏好", subtitle: "同步意向，匹配岗位") {
                  showPreferences = true
                }
                ProfileActionRow(icon: "list.bullet.rectangle", title: "测评中心", subtitle: "行业/岗位专项测评") {
                  showAssessments = true
                }
                ProfileActionRow(icon: "text.bubble", title: "我的帖子", subtitle: "查看和管理发帖") {
                  showMyPosts = true
                }
                ProfileActionRow(icon: "square.and.pencil", title: "发布帖子", subtitle: "分享经验与观点") {
                  showCreatePost = true
                }
                ProfileActionRow(icon: "square.and.arrow.up", title: "退出登录", subtitle: "清除本地令牌") {
                  appState.signOut()
                }
              }
            }
        }
      }

      Spacer()
    }
    .padding(.horizontal, 16)
    .padding(.top, 16)
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .sheet(isPresented: $showLogin) {
      LoginView { data in
        appState.updateAuth(token: data.token, user: data.user)
        showLogin = false
      }
      .environmentObject(appState)
    }
    .sheet(isPresented: $showHistory) {
      InterviewHistoryView()
        .environmentObject(appState)
    }
    .sheet(isPresented: $showMessages) {
      MessagesView()
        .environmentObject(appState)
    }
    .sheet(isPresented: $showPreferences) {
      JobPreferencesView()
        .environmentObject(appState)
    }
    .sheet(isPresented: $showAssessments) {
      AssessmentsView()
        .environmentObject(appState)
    }
    .sheet(isPresented: $showMyPosts) {
      MyPostsView()
        .environmentObject(appState)
    }
    .sheet(isPresented: $showCreatePost) {
      CreatePostView()
        .environmentObject(appState)
    }
  }

  private var header: some View {
    HStack(spacing: 12) {
      Circle()
        .fill(AppColor.accent.opacity(0.2))
        .frame(width: 60, height: 60)
        .overlay(
          Text(appState.currentUser?.name?.prefix(1) ?? "访")
            .font(AppFont.title(24))
            .foregroundStyle(AppColor.accent)
        )
      VStack(alignment: .leading, spacing: 4) {
        Text(appState.currentUser?.name ?? "访客模式")
          .font(AppFont.title(18))
          .foregroundStyle(AppColor.textPrimary)
        Text(appState.currentUser?.email ?? "未登录")
          .font(AppFont.body(13))
          .foregroundStyle(AppColor.textSecondary)
      }
      Spacer()
    }
  }
}

private struct ProfileActionRow: View {
  let icon: String
  let title: String
  let subtitle: String
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack {
        Circle()
          .fill(AppColor.card)
          .frame(width: 36, height: 36)
          .overlay(Image(systemName: icon).foregroundStyle(AppColor.accent))
        VStack(alignment: .leading, spacing: 4) {
          Text(title)
            .foregroundStyle(AppColor.textPrimary)
          Text(subtitle)
            .font(AppFont.caption(12))
            .foregroundStyle(AppColor.textSecondary)
        }
        Spacer()
        Image(systemName: "chevron.right")
          .foregroundStyle(AppColor.textSecondary)
      }
      .padding(.vertical, 6)
    }
    .buttonStyle(.plain)
  }
}
