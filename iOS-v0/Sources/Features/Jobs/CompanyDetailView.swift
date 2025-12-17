import SwiftUI

@MainActor
final class CompanyDetailViewModel: ObservableObject {
  @Published var company: CompanyProfile?
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
      company = try await appState.jobsService.getCompanyProfile(id: id)
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}

struct CompanyDetailView: View {
  @EnvironmentObject private var appState: AppState
  @StateObject private var viewModel: CompanyDetailViewModel

  init(companyId: String) {
    _viewModel = StateObject(wrappedValue: CompanyDetailViewModel(id: companyId))
  }

  var body: some View {
    ScrollView {
      if let company = viewModel.company {
        VStack(alignment: .leading, spacing: 14) {
          header(company)
          stats(company)
          if let desc = company.description, !desc.isEmpty {
            GlassCard {
              VStack(alignment: .leading, spacing: 8) {
                Text("公司介绍")
                  .font(AppFont.title(16))
                Text(desc)
                  .font(AppFont.body(14))
                  .foregroundStyle(AppColor.textSecondary)
              }
            }
          }
          if !company.highlights.isEmpty {
            GlassCard {
              VStack(alignment: .leading, spacing: 8) {
                Text("亮点")
                  .font(AppFont.title(16))
                FlowLayout(company.highlights) { highlight in
                  PillTag(highlight, foreground: AppColor.accent, background: AppColor.accent.opacity(0.12))
                }
              }
            }
          }
          if !company.culture.isEmpty {
            GlassCard {
              VStack(alignment: .leading, spacing: 8) {
                Text("文化")
                  .font(AppFont.title(16))
                ForEach(company.culture, id: \.self) { item in
                  Text("• \(item)")
                    .font(AppFont.body(14))
                    .foregroundStyle(AppColor.textSecondary)
                }
              }
            }
          }
          if !company.openRoles.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
              Text("开放岗位")
                .font(AppFont.title(17))
              ForEach(company.openRoles) { job in
                NavigationLink(value: job.id) {
                  JobRow(job: job)
                }
                .buttonStyle(.plain)
              }
            }
          }
        }
        .padding(16)
      } else if viewModel.isLoading {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
      } else if let error = viewModel.error {
        Text(error)
          .foregroundStyle(.red)
          .padding()
      }
    }
    .background(AppColor.backgroundGradient.ignoresSafeArea())
    .navigationTitle("公司主页")
    .navigationDestination(for: String.self) { id in
      JobDetailView(jobId: id)
        .environmentObject(appState)
    }
    .task { await viewModel.load(using: appState) }
  }

  private func header(_ company: CompanyProfile) -> some View {
    GlassCard {
      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .center, spacing: 12) {
          Circle()
            .fill(AppColor.accent.opacity(0.14))
            .frame(width: 52, height: 52)
            .overlay(Text(company.name.prefix(1)).font(AppFont.title(22)))
          VStack(alignment: .leading, spacing: 4) {
            Text(company.name)
              .font(AppFont.title(18))
            if let tagline = company.tagline {
              Text(tagline)
                .font(AppFont.body(13))
                .foregroundStyle(AppColor.textSecondary)
            }
          }
        }
        HStack(spacing: 8) {
          if let industry = company.industry {
            PillTag(industry, foreground: AppColor.textSecondary, background: AppColor.outline)
          }
          if let scale = company.scale {
            PillTag(scale, foreground: AppColor.textSecondary, background: AppColor.outline)
          }
          if let website = company.website {
            PillTag(website, foreground: AppColor.accent, background: AppColor.accent.opacity(0.12))
          }
        }
      }
    }
  }

  private func stats(_ company: CompanyProfile) -> some View {
    GlassCard {
      VStack(alignment: .leading, spacing: 8) {
        Text("数据概览")
          .font(AppFont.title(16))
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
          ForEach(company.stats) { stat in
            VStack(alignment: .leading, spacing: 6) {
              Text(stat.label)
                .font(AppFont.caption(12))
                .foregroundStyle(AppColor.textSecondary)
              Text(stat.value)
                .font(AppFont.title(16))
                .foregroundStyle(AppColor.textPrimary)
            }
            .padding()
            .background(AppColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColor.outline, lineWidth: 1))
          }
        }
      }
    }
  }
}
