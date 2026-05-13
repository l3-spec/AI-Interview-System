import SwiftUI

// MARK: - Android 风格岗位卡片
/// 对齐 Android `JobCard` - 白底 + 圆角 8 + 灰色描边
/// 顶部标题+薪资，中间标签，底部公司头像+名称+城市
struct JobCard: View {
  let job: JobSummary

  private let cardBorder = Color(hex: 0xE6E8EB)
  private let tagBackground = Color(hex: 0xF3F8FB)

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      // 顶部：岗位标题 + 薪资
      HStack(alignment: .top) {
        Text(job.title.isEmpty ? "前端开发" : job.title)
          .font(.system(size: 16, weight: .semibold, design: .rounded))
          .foregroundStyle(Color.black)
          .lineLimit(1)
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(job.salary?.isEmpty == false ? job.salary! : "10-20K")
          .font(.system(size: 16, weight: .semibold, design: .rounded))
          .foregroundStyle(AppColor.primaryOrange)
          .padding(.leading, 8)
      }

      // 标签区
      let tags = tagCandidates()
      if !tags.isEmpty {
        HStack(spacing: 6) {
          ForEach(tags.prefix(3), id: \.self) { tag in
            Text(tag)
              .font(.system(size: 12, weight: .light))
              .foregroundStyle(Color.black)
              .padding(.horizontal, 10)
              .padding(.vertical, 6)
              .background(RoundedRectangle(cornerRadius: 4).fill(tagBackground))
          }
          Spacer()
        }
      }

      // 底部：公司头像 + 名称 + 标语 + 城市
      HStack(spacing: 12) {
        // 头像
        ZStack {
          Circle()
            .fill(AppColor.primaryOrange.opacity(0.18))
            .frame(width: 42, height: 42)
          if let logo = job.companyLogo, !logo.isEmpty,
             let url = URL(string: logo) {
            AsyncImage(url: url) { image in
              image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
              EmptyView()
            }
            .frame(width: 42, height: 42)
            .clipShape(Circle())
          } else {
            Image(systemName: "briefcase.fill")
              .font(.system(size: 16))
              .foregroundStyle(Color.white)
          }
        }
        VStack(alignment: .leading, spacing: 2) {
          Text(job.companyName.isEmpty ? "公司名称" : job.companyName)
            .font(.system(size: 12, weight: .light))
            .foregroundStyle(Color.black)
            .lineLimit(1)
          Text(job.companyTagline?.isEmpty == false ? job.companyTagline! : "公司的简单介绍")
            .font(.system(size: 12, weight: .light))
            .foregroundStyle(AppColor.textTertiary)
            .lineLimit(1)
        }
        Spacer(minLength: 8)
        HStack(spacing: 4) {
          Image(systemName: "mappin.and.ellipse")
            .font(.system(size: 12))
            .foregroundStyle(AppColor.textTertiary)
          Text(job.location?.isEmpty == false ? job.location! : "上海 徐汇区")
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(AppColor.textTertiary)
            .lineLimit(1)
        }
      }
    }
    .padding(16)
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: 8))
    .overlay(RoundedRectangle(cornerRadius: 8).stroke(cardBorder, lineWidth: 1))
  }

  /// 组合标签：学历 / 经验 / 标签 / 类型 / 级别
  private func tagCandidates() -> [String] {
    var list: [String] = []
    if let edu = job.education, !edu.isEmpty { list.append(edu) }
    if let exp = job.experience, !exp.isEmpty { list.append(exp) }
    list.append(contentsOf: job.tags.filter { !$0.isEmpty })
    if let type = job.type, !type.isEmpty { list.append(type) }
    if let level = job.level, !level.isEmpty { list.append(level) }
    // 去重保序
    var seen = Set<String>()
    return list.filter { seen.insert($0).inserted }
  }
}

// MARK: - 意向岗位 Chip（可删除）
struct PreferenceChip: View {
  let name: String
  let onRemove: () -> Void

  private let bg = Color(hex: 0xDFFBFF)
  private let outline = Color(hex: 0x00ADC1)

  var body: some View {
    HStack(spacing: 6) {
      Text(name)
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(outline)
        .lineLimit(1)
      Button(action: onRemove) {
        Image(systemName: "xmark")
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(outline)
      }
      .buttonStyle(.plain)
    }
    .padding(.leading, 10)
    .padding(.trailing, 6)
    .padding(.vertical, 5)
    .background(RoundedRectangle(cornerRadius: 12).fill(bg))
    .overlay(RoundedRectangle(cornerRadius: 12).stroke(outline, lineWidth: 1))
  }
}

// MARK: - 简易换行容器（用于 chip 列表）
struct WrapChips<Item: Identifiable, Content: View>: View {
  let items: [Item]
  @ViewBuilder let content: (Item) -> Content

  var body: some View {
    // SwiftUI 没有直接的 FlowRow；用 LazyVGrid + adaptive 模拟
    LazyVGrid(
      columns: [GridItem(.adaptive(minimum: 80), spacing: 8, alignment: .leading)],
      alignment: .leading,
      spacing: 8
    ) {
      ForEach(items) { item in
        content(item)
      }
    }
  }
}

// MARK: - 城市/筛选底部弹窗
struct CityPickerSheet: View {
  let currentCity: String?
  let onlyRemote: Bool
  let onApply: (String?, Bool) -> Void

  @Environment(\.dismiss) private var dismiss
  @State private var city: String
  @State private var remote: Bool

  // 常见城市，可后续接入字典服务
  private let cities = [
    "不限", "北京", "上海", "广州", "深圳",
    "杭州", "成都", "武汉", "南京", "苏州",
    "西安", "长沙", "青岛", "重庆"
  ]

  init(currentCity: String?, onlyRemote: Bool, onApply: @escaping (String?, Bool) -> Void) {
    self.currentCity = currentCity
    self.onlyRemote = onlyRemote
    self.onApply = onApply
    _city = State(initialValue: currentCity ?? "不限")
    _remote = State(initialValue: onlyRemote)
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          Text("选择城市")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(AppColor.textPrimary)
            .padding(.top, 4)

          LazyVGrid(
            columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())],
            spacing: 10
          ) {
            ForEach(cities, id: \.self) { option in
              Button {
                city = option
              } label: {
                Text(option)
                  .font(.system(size: 13, weight: city == option ? .semibold : .regular))
                  .foregroundStyle(city == option ? AppColor.primaryBlue : AppColor.textPrimary)
                  .frame(maxWidth: .infinity)
                  .padding(.vertical, 10)
                  .background(
                    RoundedRectangle(cornerRadius: 10)
                      .fill(city == option ? Color(hex: 0xDFFBFF) : Color(hex: 0xF4F5F8))
                  )
                  .overlay(
                    RoundedRectangle(cornerRadius: 10)
                      .stroke(city == option ? AppColor.primaryBlue : Color.clear, lineWidth: 1)
                  )
              }
              .buttonStyle(.plain)
            }
          }

          Toggle(isOn: $remote) {
            Text("仅看远程/弹性岗位")
              .font(.system(size: 14))
              .foregroundStyle(AppColor.textPrimary)
          }
          .tint(AppColor.primaryOrange)
          .padding(.top, 8)

          Button {
            let finalCity = (city == "不限" || city.isEmpty) ? nil : city
            onApply(finalCity, remote)
          } label: {
            Text("应用筛选")
              .font(.system(size: 15, weight: .semibold))
              .foregroundStyle(Color.white)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 14)
              .background(RoundedRectangle(cornerRadius: 24).fill(AppColor.primaryOrange))
          }
          .buttonStyle(.plain)
          .padding(.top, 12)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 24)
      }
      .navigationTitle("筛选")
#if os(iOS)
      .navigationBarTitleDisplayMode(.inline)
#endif
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") { dismiss() }
        }
      }
    }
  }
}

// MARK: - JobRow（兼容旧 CompanyDetailView openRoles 列表）
struct JobRow: View {
  let job: JobSummary
  var body: some View {
    JobCard(job: job)
  }
}
