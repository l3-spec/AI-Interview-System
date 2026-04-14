import SwiftUI

@MainActor
final class HomeViewModel: ObservableObject {
  @Published var isLoading = false
  @Published var banners: [Banner] = []
  @Published var promotedJobs: [PromotedJob] = []
  @Published var expertPosts: [ExpertPost] = []
  @Published var userPosts: [UserPost] = []
  @Published var featured: [HomeFeaturedArticle] = []
  @Published var hasMoreFeatured = true
  @Published var isLoadingMore = false
  @Published var page = 1
  @Published var error: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      async let bannerTask = appState.contentService.getBanners()
      async let promotedTask = appState.contentService.getPromotedJobs(page: 1, pageSize: 6)
      async let expertTask = appState.contentService.getExpertPosts(page: 1, pageSize: 6)
      async let userTask = appState.contentService.getUserPosts(page: 1, pageSize: 6, isHot: true)
      async let featuredTask = appState.contentService.getFeaturedArticles(page: 1, pageSize: 6)

      banners = try await bannerTask
      promotedJobs = try await promotedTask.list
      expertPosts = try await expertTask.list
      userPosts = try await userTask.list
      let featuredResponse = try await featuredTask
      featured = featuredResponse.list
      hasMoreFeatured = featuredResponse.hasMore
      page = featuredResponse.page
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }

  func loadMore(using appState: AppState) async {
    guard hasMoreFeatured, !isLoadingMore else { return }
    isLoadingMore = true
    defer { isLoadingMore = false }
    do {
      let next = page + 1
      let response = try await appState.contentService.getFeaturedArticles(page: next, pageSize: 6)
      featured.append(contentsOf: response.list)
      hasMoreFeatured = response.hasMore
      page = response.page
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct HomeView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = HomeViewModel()
  @State private var showAi = false
  @State private var searchText = ""
  @State private var showAssessments = false

  var body: some View {
    ScrollView(showsIndicators: false) {
      VStack(alignment: .leading, spacing: 16) {
        searchBar
        hero

        if !viewModel.banners.isEmpty {
          bannerCarousel
        }

        SectionHeader(title: "热门职岗", actionTitle: "查看更多") {
          appState.selectedTab = .jobs
        }
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: 12) {
            ForEach(viewModel.promotedJobs) { job in
              JobCard(job: job.job)
            }
          }
          .padding(.horizontal, 4)
        }

        SectionHeader(title: "大咖分享", actionTitle: "更多") {
          appState.selectedTab = .circle
        }
        VStack(spacing: 12) {
          ForEach(viewModel.expertPosts.prefix(4)) { post in
            ExpertPostRow(post: post)
          }
        }

        SectionHeader(title: "热门分享")
        VStack(spacing: 12) {
          ForEach(viewModel.userPosts.prefix(5)) { post in
            UserPostRow(post: post)
          }
        }

        if !viewModel.featured.isEmpty {
          SectionHeader(title: "精选内容")
          LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(Array(viewModel.featured.enumerated()), id: \.element.id) { index, article in
              HomeFeaturedCard(article: article)
                .onAppear {
                  if index == viewModel.featured.count - 1 {
                    Task { await viewModel.loadMore(using: appState) }
                  }
                }
            }
          }
        }

        if viewModel.isLoadingMore {
          ProgressView()
            .frame(maxWidth: .infinity, alignment: .center)
        } else if !viewModel.hasMoreFeatured {
          Text("没有更多内容了")
            .font(AppFont.caption(12))
            .foregroundStyle(AppColor.textSecondary)
            .frame(maxWidth: .infinity, alignment: .center)
        }

        if let error = viewModel.error {
          Text(error)
            .foregroundStyle(.red)
            .font(AppFont.caption(13))
            .padding(.top, 8)
        }
      }
      .padding(.horizontal, 16)
      .padding(.top, 16)
      .padding(.bottom, 32)
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .task {
      await viewModel.load(using: appState)
    }
    .refreshable {
      await viewModel.load(using: appState)
    }
    .sheet(isPresented: $showAi) {
      AiInterviewEntryView()
        .environmentObject(appState)
    }
    .sheet(isPresented: $showAssessments) {
      AssessmentsView()
        .environmentObject(appState)
    }
  }

  private var searchBar: some View {
    HStack(spacing: 12) {
      Image(systemName: "magnifyingglass")
        .foregroundStyle(AppColor.textSecondary)
      TextField("搜索岗位/关键词", text: $searchText)
#if os(iOS)
        .textInputAutocapitalization(.never)
#endif
        .onSubmit {
          appState.sharedJobKeyword = searchText
          appState.selectedTab = .jobs
        }
      Button {
        appState.selectedTab = .jobs
      } label: {
        Text("去找工作")
          .font(AppFont.caption(12))
          .foregroundStyle(AppColor.accent)
      }
    }
    .padding()
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 14))
    .overlay(RoundedRectangle(cornerRadius: 14).stroke(AppColor.outline, lineWidth: 1))
  }

  private var hero: some View {
    GlassCard {
      VStack(alignment: .leading, spacing: 12) {
        Text("AI 面试 · 数字人实时互动")
          .font(AppFont.title(20))
          .foregroundStyle(AppColor.textPrimary)
        Text("模拟真实面试场景，支持语音/文本作答，实时生成反馈与报告。")
          .font(AppFont.body(14))
          .foregroundStyle(AppColor.textSecondary)
        HStack(spacing: 12) {
          PrimaryButton(title: "开始AI面试", icon: "sparkles") {
            showAi = true
          }
          .frame(maxWidth: .infinity)
          PrimaryButton(title: "测评练习", icon: "list.bullet.rectangle") {
            showAssessments = true
          }
          .frame(maxWidth: .infinity)
        }
      }
    }
  }

  private var bannerCarousel: some View {
    TabView {
      ForEach(viewModel.banners) { banner in
        ZStack(alignment: .bottomLeading) {
          AsyncImage(url: URL(string: banner.imageUrl)) { image in
            image
              .resizable()
              .scaledToFill()
          } placeholder: {
            Rectangle().fill(AppColor.card)
          }
          .frame(height: 180)
          .clipShape(RoundedRectangle(cornerRadius: 18))

          LinearGradient(colors: [.black.opacity(0.7), .clear], startPoint: .bottom, endPoint: .top)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .frame(height: 180)

          VStack(alignment: .leading, spacing: 6) {
            Text(banner.title)
              .font(AppFont.title(18))
              .foregroundStyle(.white)
            Text(banner.subtitle)
              .font(AppFont.caption(13))
              .foregroundStyle(.white.opacity(0.8))
          }
          .padding()
        }
      }
    }
    .frame(height: 190)
#if os(iOS)
    .tabViewStyle(.page(indexDisplayMode: .automatic))
#endif
  }
}

struct JobCard: View {
  let job: JobInfo

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 10) {
        Circle()
          .fill(AppColor.card)
          .frame(width: 38, height: 38)
          .overlay(
            Text(job.company.name.prefix(1))
              .font(AppFont.title(16))
              .foregroundStyle(.white)
          )
        VStack(alignment: .leading, spacing: 4) {
          Text(job.title)
            .font(AppFont.title(15))
            .foregroundStyle(AppColor.textPrimary)
          Text(job.company.name)
            .font(AppFont.caption(12))
            .foregroundStyle(AppColor.textSecondary)
        }
      }
      if let salary = job.salary {
        Text(salary)
          .font(AppFont.caption(12))
          .foregroundStyle(AppColor.accent)
      }
      if !job.skills.isEmpty {
        HStack {
          ForEach(job.skills.prefix(3), id: \.self) { skill in
            PillTag(skill, foreground: AppColor.textPrimary, background: AppColor.outline)
          }
        }
      }
    }
    .padding()
    .frame(width: 250, alignment: .leading)
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .stroke(AppColor.outline, lineWidth: 1)
    )
  }
}

struct ExpertPostRow: View {
  let post: ExpertPost

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      AsyncImage(url: URL(string: post.coverImage ?? "")) { image in
        image.resizable().scaledToFill()
      } placeholder: {
        Color.gray.opacity(0.2)
      }
      .frame(width: 96, height: 72)
      .clipShape(RoundedRectangle(cornerRadius: 12))

      VStack(alignment: .leading, spacing: 6) {
        Text(post.title)
          .font(AppFont.title(16))
          .foregroundStyle(AppColor.textPrimary)
          .lineLimit(2)
        Text("\(post.expertName) · \(post.expertCompany)")
          .font(AppFont.caption(12))
          .foregroundStyle(AppColor.textSecondary)
        HStack(spacing: 8) {
          PillTag("阅读 \(post.viewCount)", foreground: AppColor.textSecondary, background: AppColor.outline)
          if let first = post.tags.first {
            PillTag(first, foreground: AppColor.accent, background: AppColor.accent.opacity(0.12))
          }
        }
      }
      Spacer()
    }
    .padding()
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColor.outline, lineWidth: 1))
  }
}

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

struct HomeFeaturedCard: View {
  let article: HomeFeaturedArticle

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      AsyncImage(url: URL(string: article.imageUrl)) { image in
        image.resizable().scaledToFill()
      } placeholder: {
        Rectangle().fill(AppColor.card)
      }
      .frame(height: 140)
      .clipShape(RoundedRectangle(cornerRadius: 14))

      Text(article.title)
        .font(AppFont.title(15))
        .foregroundStyle(AppColor.textPrimary)
        .lineLimit(2)
      if let summary = article.summary {
        Text(summary)
          .font(AppFont.body(13))
          .foregroundStyle(AppColor.textSecondary)
          .lineLimit(2)
      }
      HStack(spacing: 8) {
        if let first = article.tags.first {
          PillTag(first, foreground: AppColor.accent, background: AppColor.accent.opacity(0.12))
        }
        PillTag("浏览 \(format(article.viewCount))", foreground: AppColor.textSecondary, background: AppColor.outline)
      }
    }
    .padding()
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColor.outline, lineWidth: 1))
  }

  private func format(_ count: Int) -> String {
    if count >= 1_000_000 { return String(format: "%.1fM", Double(count) / 1_000_000) }
    if count >= 10_000 { return String(format: "%.1fw", Double(count) / 10_000) }
    if count >= 1_000 { return String(format: "%.1fk", Double(count) / 1_000) }
    return "\(count)"
  }
}
