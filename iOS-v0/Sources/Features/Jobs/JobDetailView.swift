import SwiftUI

// MARK: - 岗位详情 ViewModel
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

// MARK: - 岗位详情页
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
            titleSection(detail)
            if !detail.tags.isEmpty {
              tagsSection(detail)
            }
            descSection(detail)
            if !detail.responsibilities.isEmpty {
              bulletSection(title: "岗位职责", items: detail.responsibilities, square: false)
            }
            if !detail.requirements.isEmpty {
              bulletSection(title: "任职要求", items: detail.requirements, square: true)
            }
            applySection(detail: detail)
          }
          .padding(16)
        }
      } else if viewModel.isLoading {
        ProgressView().tint(AppColor.primaryOrange)
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

  private func titleSection(_ detail: JobDetail) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .top) {
        Text(detail.title)
          .font(.system(size: 22, weight: .semibold, design: .rounded))
          .foregroundStyle(AppColor.textPrimary)
        Spacer()
        if let salary = detail.salary {
          Text(salary)
            .font(.system(size: 18, weight: .semibold, design: .rounded))
            .foregroundStyle(AppColor.primaryOrange)
        }
      }
      NavigationLink {
        CompanyDetailView(companyId: detail.companyId)
          .environmentObject(appState)
      } label: {
        HStack(spacing: 6) {
          Text(detail.companyName)
            .font(.system(size: 15))
            .foregroundStyle(AppColor.textSecondary)
          Image(systemName: "chevron.right")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(AppColor.textTertiary)
        }
      }
      .buttonStyle(.plain)
      HStack(spacing: 10) {
        if let loc = detail.location {
          detailChip(icon: "mappin.and.ellipse", label: loc)
        }
        if let exp = detail.experience {
          detailChip(icon: "briefcase", label: exp)
        }
        if let edu = detail.education {
          detailChip(icon: "graduationcap", label: edu)
        }
      }
    }
    .padding(16)
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: 0xE6E8EB), lineWidth: 1))
  }

  private func detailChip(icon: String, label: String) -> some View {
    HStack(spacing: 4) {
      Image(systemName: icon)
        .font(.system(size: 11))
      Text(label)
        .font(.system(size: 12))
    }
    .foregroundStyle(AppColor.textTertiary)
  }

  private func tagsSection(_ detail: JobDetail) -> some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 6) {
        ForEach(detail.tags.prefix(6), id: \.self) { tag in
          Text(tag)
            .font(.system(size: 12, weight: .light))
            .foregroundStyle(AppColor.primaryBlue)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
              RoundedRectangle(cornerRadius: 4)
                .fill(AppColor.primaryBlue.opacity(0.12))
            )
        }
      }
    }
  }

  private func descSection(_ detail: JobDetail) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("岗位描述")
        .font(.system(size: 16, weight: .semibold, design: .rounded))
        .foregroundStyle(AppColor.textPrimary)
      Text(detail.description.isEmpty ? "暂无岗位描述" : detail.description)
        .font(.system(size: 14))
        .foregroundStyle(AppColor.textSecondary)
        .lineSpacing(4)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(16)
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: 0xE6E8EB), lineWidth: 1))
  }

  private func bulletSection(title: String, items: [String], square: Bool) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title)
        .font(.system(size: 16, weight: .semibold, design: .rounded))
        .foregroundStyle(AppColor.textPrimary)
      ForEach(items, id: \.self) { item in
        HStack(alignment: .top, spacing: 8) {
          Group {
            if square {
              RoundedRectangle(cornerRadius: 2)
                .fill(AppColor.primaryOrange.opacity(0.8))
            } else {
              Circle().fill(AppColor.primaryOrange)
            }
          }
          .frame(width: 6, height: 6)
          .padding(.top, 6)
          Text(item)
            .font(.system(size: 14))
            .foregroundStyle(AppColor.textSecondary)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(16)
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: 0xE6E8EB), lineWidth: 1))
  }

  private func applySection(detail: JobDetail) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("立即投递/约聊")
        .font(.system(size: 17, weight: .semibold, design: .rounded))
        .foregroundStyle(AppColor.textPrimary)
      TextField("给招聘方的留言（可选）", text: $applyNote)
        .textFieldStyle(.roundedBorder)
      Button {
        guard appState.isLoggedIn else {
          showLogin = true
          return
        }
        Task {
          isApplying = true
          defer { isApplying = false }
          do {
            _ = try await appState.jobsService.apply(
              jobId: detail.id,
              message: applyNote.isEmpty ? nil : applyNote
            )
            applyStatus = "已投递"
          } catch {
            applyStatus = error.localizedDescription
          }
        }
      } label: {
        ZStack {
          RoundedRectangle(cornerRadius: 24)
            .fill(AppColor.primaryOrange)
          if isApplying {
            ProgressView().tint(Color.white)
          } else {
            Text("投递")
              .font(.system(size: 15, weight: .semibold))
              .foregroundStyle(Color.white)
          }
        }
        .frame(height: 48)
      }
      .buttonStyle(.plain)
      .disabled(isApplying)

      if let status = applyStatus {
        Text(status)
          .font(.system(size: 12))
          .foregroundStyle(status == "已投递" ? AppColor.textSecondary : .red)
      }
    }
    .padding(16)
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: 0xE6E8EB), lineWidth: 1))
  }
}

// MARK: - FlowLayout（早期模块复用：Assessments/CompanyDetail/JobPreferences）
@MainActor
struct FlowLayout<Data: RandomAccessCollection, Content: View>: View where Data.Element: Hashable {
  let items: Data
  let content: (Data.Element) -> Content

  init(_ items: Data, @ViewBuilder content: @escaping (Data.Element) -> Content) {
    self.items = items
    self.content = content
  }

  var body: some View {
    GeometryReader { geometry in
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
