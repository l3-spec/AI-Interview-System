import SwiftUI

@MainActor
final class JobsViewModel: ObservableObject {
  @Published var jobs: [JobSummary] = []
  @Published var isLoading = false
  @Published var query: String = ""
  @Published var error: String?

  func load(using appState: AppState) async {
    guard !isLoading else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      let response = try await appState.jobsService.getPublicJobs(
        page: 1,
        pageSize: 30,
        keyword: query.isEmpty ? nil : query
      )
      jobs = response.data ?? []
      error = nil
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

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
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
      }
      .padding()
      .background(AppColor.card)
      .clipShape(RoundedRectangle(cornerRadius: 14))
      .overlay(RoundedRectangle(cornerRadius: 14).stroke(AppColor.outline, lineWidth: 1))
      .padding(.horizontal, 16)
      .padding(.top, 12)

      if viewModel.isLoading {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
      } else {
        ScrollView {
          LazyVStack(spacing: 14, pinnedViews: []) {
            ForEach(viewModel.jobs) { job in
              NavigationLink(value: job.id) {
                JobRow(job: job)
              }
              .buttonStyle(.plain)
            }
          }
          .padding(.horizontal, 16)
          .padding(.bottom, 24)
        }
      }
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .navigationDestination(for: String.self) { id in
      JobDetailView(jobId: id)
    }
    .task {
      await viewModel.load(using: appState)
    }
    .refreshable {
      await viewModel.load(using: appState)
    }
  }
}

private struct JobRow: View {
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

  init(jobId: String) {
    _viewModel = StateObject(wrappedValue: JobDetailViewModel(id: jobId))
  }

  var body: some View {
    Group {
      if let detail = viewModel.detail {
        ScrollView {
          VStack(alignment: .leading, spacing: 16) {
            Text(detail.title)
              .font(AppFont.title(22))
              .foregroundStyle(AppColor.textPrimary)
            Text(detail.companyName)
              .font(AppFont.body(15))
              .foregroundStyle(AppColor.textSecondary)
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
        }
      } else if viewModel.isLoading {
        ProgressView()
      } else {
        Text(viewModel.error ?? "无法加载岗位详情")
          .foregroundStyle(.red)
      }
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .task {
      await viewModel.load(using: appState)
    }
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
