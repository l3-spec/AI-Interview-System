import SwiftUI

@MainActor
final class JobsViewModel: ObservableObject {
  @Published var jobs: [JobSummary] = []
  @Published var isLoading = false
  @Published var isLoadingMore = false
  @Published var hasMore = true
  @Published var page: Int = 1
  @Published var query: String = ""
  @Published var location: String = ""
  @Published var onlyRemote: Bool = false
  @Published var selectedPositionIds: Set<String> = []
  @Published var selectedPositionNames: [String: String] = [:]
  @Published var error: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      let response = try await appState.jobsService.getPublicJobs(
        page: 1,
        pageSize: 30,
        keyword: query.isEmpty ? nil : query,
        location: location.isEmpty ? nil : location,
        remoteOnly: onlyRemote,
        dictionaryPositionIds: selectedPositionIds.isEmpty ? nil : selectedPositionIds.joined(separator: ",")
      )
      jobs = response.data ?? []
      hasMore = response.hasMore ?? false
      page = response.page ?? 1
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }

  func loadMore(using appState: AppState) async {
    guard hasMore, !isLoading, !isLoadingMore else { return }
    isLoadingMore = true
    defer { isLoadingMore = false }
    do {
      let nextPage = page + 1
      let response = try await appState.jobsService.getPublicJobs(
        page: nextPage,
        pageSize: 30,
        keyword: query.isEmpty ? nil : query,
        location: location.isEmpty ? nil : location,
        remoteOnly: onlyRemote,
        dictionaryPositionIds: selectedPositionIds.isEmpty ? nil : selectedPositionIds.joined(separator: ",")
      )
      jobs.append(contentsOf: response.data ?? [])
      hasMore = response.hasMore ?? false
      page = response.page ?? nextPage
    } catch {
      self.error = error.localizedDescription
    }
  }

  func syncPreferences(using appState: AppState) async {
    do {
      let prefs = try await appState.jobsService.getPreferences()
      selectedPositionIds = Set(prefs.positions.map { $0.id })
      selectedPositionNames = prefs.positions.reduce(into: [:]) { partialResult, position in
        partialResult[position.id] = position.name
      }
      await load(using: appState)
    } catch {
      self.error = error.localizedDescription
    }
  }
}

@MainActor
final class JobDetailViewModel: ObservableObject {
  @Published var detail: JobDetail?
  @Published var isLoading = false
  @Published var error: String?
  private let id: String

  init(id: String) {
    self.id = id
  }

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      detail = try await appState.jobsService.getJobDetail(id: id)
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct JobsView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel = JobsViewModel()
  @State private var showPreferences = false

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      searchBar
      filterBar

      if viewModel.isLoading && viewModel.jobs.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
      } else {
        ScrollView {
          LazyVStack(spacing: 14) {
            ForEach(viewModel.jobs) { job in
              NavigationLink(value: job.id) {
                JobRow(job: job)
              }
              .buttonStyle(.plain)
              .onAppear {
                Task { await viewModel.loadMore(using: appState) }
              }
            }
            if viewModel.isLoadingMore {
              ProgressView()
                .padding(.vertical, 12)
            } else if !viewModel.hasMore {
              Text("没有更多岗位了")
                .font(AppFont.caption(12))
                .foregroundStyle(AppColor.textSecondary)
                .padding(.vertical, 12)
            }
          }
          .padding(.horizontal, 16)
          .padding(.bottom, 24)
        }
      }
      if let error = viewModel.error {
        Text(error)
          .foregroundStyle(.red)
          .font(AppFont.caption(12))
          .padding(.horizontal, 16)
      }
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .navigationDestination(for: String.self) { id in
      JobDetailView(jobId: id)
    }
    .task {
      if !appState.sharedJobKeyword.isEmpty {
        viewModel.query = appState.sharedJobKeyword
      }
      await viewModel.load(using: appState)
    }
    .refreshable {
      await viewModel.load(using: appState)
    }
    .sheet(isPresented: $showPreferences) {
      JobPreferencesView()
        .environmentObject(appState)
    }
    .onChange(of: viewModel.query) { newValue in
      appState.sharedJobKeyword = newValue
    }
  }

  private var searchBar: some View {
    HStack {
      Image(systemName: "magnifyingglass")
        .foregroundStyle(AppColor.textSecondary)
      TextField("搜索岗位/关键词", text: $viewModel.query)
#if os(iOS)
        .textInputAutocapitalization(.never)
#endif
        .onSubmit {
          Task { await viewModel.load(using: appState) }
        }
      Button {
        Task { await viewModel.load(using: appState) }
      } label: {
        Image(systemName: "arrow.clockwise")
      }
    }
    .padding()
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 14))
    .overlay(RoundedRectangle(cornerRadius: 14).stroke(AppColor.outline, lineWidth: 1))
    .padding(.horizontal, 16)
    .padding(.top, 12)
  }

  private var filterBar: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 10) {
        Toggle(isOn: $viewModel.onlyRemote) {
          Text("远程/弹性")
            .font(AppFont.body(13))
        }
        .toggleStyle(.switch)
        .onChange(of: viewModel.onlyRemote) { _ in
          Task { await viewModel.load(using: appState) }
        }

        Button {
          showPreferences = true
        } label: {
          PillTag("岗位意向", foreground: AppColor.accent, background: AppColor.accent.opacity(0.12))
        }
        .buttonStyle(.plain)

        Button {
          Task { await viewModel.syncPreferences(using: appState) }
        } label: {
          PillTag("同步偏好", foreground: AppColor.textPrimary, background: AppColor.outline)
        }
        .buttonStyle(.plain)

        ForEach(Array(viewModel.selectedPositionIds), id: \.self) { id in
          PillTag(viewModel.selectedPositionNames[id] ?? "偏好 \(id.prefix(4))", foreground: AppColor.textSecondary, background: AppColor.outline)
        }
      }
      .padding(.horizontal, 16)
    }
  }
}

struct JobRow: View {
  let job: JobSummary

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(job.title)
            .font(AppFont.title(16))
            .foregroundStyle(AppColor.textPrimary)
          Text(job.companyName)
            .font(AppFont.caption(12))
            .foregroundStyle(AppColor.textSecondary)
        }
        Spacer()
        if let salary = job.salary {
          Text(salary)
            .font(AppFont.caption(12))
            .foregroundStyle(AppColor.accent)
        }
      }
      HStack(spacing: 8) {
        if let location = job.location {
          PillTag(location, foreground: AppColor.textSecondary, background: AppColor.outline)
        }
        if let type = job.type {
          PillTag(type, foreground: AppColor.textSecondary, background: AppColor.outline)
        }
      }
      if !job.tags.isEmpty {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: 6) {
            ForEach(job.tags.prefix(4), id: \.self) { tag in
              PillTag(tag, foreground: AppColor.accent, background: AppColor.accent.opacity(0.12))
            }
          }
        }
      }
    }
    .padding()
    .background(AppColor.card)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColor.outline, lineWidth: 1))
  }
}

struct JobDetailView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel: JobDetailViewModel
  @State private var applyNote: String = ""
  @State private var isApplying = false
  @State private var applyStatus: String?
  @State private var showLogin = false

  init(jobId: String) {
    _viewModel = StateObject(wrappedValue: JobDetailViewModel(id: jobId))
  }

  var body: some View {
    Group {
      if let detail = viewModel.detail {
        ScrollView {
          VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
              Text(detail.title)
                .font(AppFont.title(22))
                .foregroundStyle(AppColor.textPrimary)
              NavigationLink {
                CompanyDetailView(companyId: detail.companyId)
                  .environmentObject(appState)
              } label: {
                HStack(spacing: 6) {
                  Text(detail.companyName)
                    .font(AppFont.body(15))
                    .foregroundStyle(AppColor.textSecondary)
                  Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AppColor.textSecondary)
                }
              }
            }
            if let salary = detail.salary {
              PillTag(salary)
            }
            if !detail.tags.isEmpty {
              FlowLayout(detail.tags.prefix(6).map { String($0) }) { tag in
                PillTag(tag, foreground: AppColor.accent, background: AppColor.accent.opacity(0.12))
              }
            }
            VStack(alignment: .leading, spacing: 8) {
              Text("岗位描述")
                .font(AppFont.title(18))
              Text(detail.description)
                .font(AppFont.body(14))
                .foregroundStyle(AppColor.textSecondary)
            }
            if !detail.responsibilities.isEmpty {
              VStack(alignment: .leading, spacing: 6) {
                Text("岗位职责")
                  .font(AppFont.title(18))
                ForEach(detail.responsibilities, id: \.self) { item in
                  HStack(alignment: .top, spacing: 6) {
                    Circle().fill(AppColor.accent).frame(width: 6, height: 6)
                    Text(item)
                      .font(AppFont.body(14))
                      .foregroundStyle(AppColor.textSecondary)
                  }
                }
              }
            }
            if !detail.requirements.isEmpty {
              VStack(alignment: .leading, spacing: 6) {
                Text("任职要求")
                  .font(AppFont.title(18))
                ForEach(detail.requirements, id: \.self) { item in
                  HStack(alignment: .top, spacing: 6) {
                    RoundedRectangle(cornerRadius: 2).fill(AppColor.accent.opacity(0.8)).frame(width: 6, height: 6)
                    Text(item)
                      .font(AppFont.body(14))
                      .foregroundStyle(AppColor.textSecondary)
                  }
                }
              }
            }
          }
          .padding(16)
          applySection(detail: detail)
        }
      } else if viewModel.isLoading {
        ProgressView()
      } else {
        Text(viewModel.error ?? "无法加载岗位详情")
          .foregroundStyle(.red)
      }
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .sheet(isPresented: $showLogin) {
      LoginView { data in
        appState.updateAuth(token: data.token, user: data.user)
        showLogin = false
      }
      .environmentObject(appState)
    }
    .task {
      await viewModel.load(using: appState)
    }
  }

  private func applySection(detail: JobDetail) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("立即投递/约聊")
        .font(AppFont.title(17))
      TextField("给招聘方的留言（可选）", text: $applyNote)
        .textFieldStyle(.roundedBorder)
      PrimaryButton(title: "投递", isLoading: isApplying) {
        guard appState.isLoggedIn else {
          showLogin = true
          return
        }
        Task {
          isApplying = true
          defer { isApplying = false }
          do {
            _ = try await appState.jobsService.apply(jobId: detail.id, message: applyNote.isEmpty ? nil : applyNote)
            applyStatus = "已投递"
          } catch {
            applyStatus = error.localizedDescription
          }
        }
      }
      if let status = applyStatus {
        Text(status)
          .font(AppFont.caption(12))
          .foregroundStyle(status == "已投递" ? AppColor.textSecondary : .red)
      }
    }
    .padding(16)
  }
}

// Simple flow layout to wrap tags
@MainActor
struct FlowLayout<Data: RandomAccessCollection, Content: View>: View where Data.Element: Hashable {
  let items: Data
  let content: (Data.Element) -> Content

  init(_ items: Data, @ViewBuilder content: @escaping (Data.Element) -> Content) {
    self.items = items
    self.content = content
  }

  var body: some View {
    return GeometryReader { geometry in
      var width: CGFloat = 0
      var height: CGFloat = 0
      ZStack(alignment: .topLeading) {
        ForEach(Array(items), id: \.self) { item in
          content(item)
            .padding(4)
            .alignmentGuide(.leading) { d in
              if width + d.width > geometry.size.width {
                width = 0
                height += d.height
              }
              let result = width
              width += d.width
              return result
            }
            .alignmentGuide(.top) { _ in
              let result = height
              return result
            }
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}
