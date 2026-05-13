import SwiftUI

/// 首页瀑布流卡片 - 对齐 Android `ContentCardItem`
/// 支持三种类型：岗位 (JOB) / 公司 (COMPANY) / 帖子 (POST)
struct HomeFeedCard: View {
  let item: HomeFeedItem

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      heroImage
        .frame(height: imageHeight)
        .frame(maxWidth: .infinity)
        .clipped()

      infoSection
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
    }
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: 8))
  }

  // MARK: - 图片区域

  @ViewBuilder
  private var heroImage: some View {
    if let imageUrl = item.imageUrl, !imageUrl.isEmpty {
      AsyncImage(url: URL(string: imageUrl)) { image in
        image.resizable().scaledToFill()
      } placeholder: {
        fallbackHero
      }
    } else {
      fallbackHero
    }
  }

  @ViewBuilder
  private var fallbackHero: some View {
    switch item.targetType {
    case .job:
      jobHero
    case .company:
      companyHero
    case .post:
      postHero
    }
  }

  private var jobHero: some View {
    let grad = gradientForId(item.id)
    return ZStack(alignment: .topLeading) {
      LinearGradient(colors: grad, startPoint: .topLeading, endPoint: .bottomTrailing)
      VStack(alignment: .leading, spacing: 6) {
        Text(item.title)
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(.white)
          .lineLimit(2)
        if let sal = item.metricValue {
          Text(sal)
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(.white)
        }
        Spacer()
        Text(item.authorName)
          .font(.system(size: 11))
          .foregroundStyle(.white.opacity(0.9))
          .lineLimit(1)
      }
      .padding(12)
    }
  }

  private var companyHero: some View {
    ZStack {
      LinearGradient(
        colors: [Color(hex: 0x00ADC1), Color(hex: 0x3DC8DC)],
        startPoint: .top,
        endPoint: .bottom
      )
      VStack(spacing: 8) {
        Circle()
          .fill(Color.white.opacity(0.9))
          .frame(width: 44, height: 44)
          .overlay(
            Text(item.authorName.prefix(1))
              .font(.system(size: 18, weight: .bold))
              .foregroundStyle(AppColor.primaryBlue)
          )
        Text(item.authorName)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(.white)
          .lineLimit(1)
          .padding(.horizontal, 8)
      }
    }
  }

  private var postHero: some View {
    ZStack(alignment: .bottomLeading) {
      LinearGradient(
        colors: [Color(hex: 0xFFE7C8), Color(hex: 0xFFD59A)],
        startPoint: .top,
        endPoint: .bottom
      )
      VStack(alignment: .leading, spacing: 4) {
        Text(item.title)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(AppColor.textPrimary)
          .lineLimit(3)
        if let summary = item.summary {
          Text(summary)
            .font(.system(size: 11))
            .foregroundStyle(AppColor.textSecondary)
            .lineLimit(2)
        }
      }
      .padding(12)
    }
  }

  // MARK: - 文本信息

  @ViewBuilder
  private var infoSection: some View {
    switch item.targetType {
    case .job:
      VStack(alignment: .leading, spacing: 4) {
        let jobTags = item.tags.prefix(2).map { "#\($0)" }.joined(separator: " ")
        if !jobTags.isEmpty {
          Text(jobTags)
            .font(.system(size: 12))
            .foregroundStyle(AppColor.primaryOrange)
            .lineLimit(1)
        }
        if let salary = item.metricValue, !salary.isEmpty {
          Text(salary)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(AppColor.primaryOrange)
            .lineLimit(1)
        }
      }
    case .company:
      VStack(alignment: .leading, spacing: 4) {
        Text(item.title)
          .font(.system(size: 14, weight: .medium))
          .foregroundStyle(AppColor.textPrimary)
          .lineLimit(1)
        let tags = item.tags.prefix(3).map { "#\($0)" }.joined(separator: " ")
        if !tags.isEmpty {
          Text(tags)
            .font(.system(size: 12))
            .foregroundStyle(AppColor.primaryOrange)
            .lineLimit(1)
        }
      }
    case .post:
      VStack(alignment: .leading, spacing: 4) {
        Text(item.title)
          .font(.system(size: 14, weight: .medium))
          .foregroundStyle(AppColor.textPrimary)
          .lineLimit(1)
        let tags = item.tags.prefix(2).map { "#\($0)" }.joined(separator: " ")
        if !tags.isEmpty {
          Text(tags)
            .font(.system(size: 12))
            .foregroundStyle(AppColor.primaryOrange)
            .lineLimit(1)
        }
      }
    }
  }

  // MARK: - 辅助

  /// 按 id 哈希选择图片高度，模拟瀑布流参差不齐
  private var imageHeight: CGFloat {
    let hash = abs(item.id.hashValue)
    switch hash % 3 {
    case 0: return 220
    case 1: return 180
    default: return 160
    }
  }

  /// 岗位渐变按 id 哈希分配
  private func gradientForId(_ id: String) -> [Color] {
    let palettes: [[Color]] = [
      [Color(hex: 0xF97316), Color(hex: 0xFFEDD5)],
      [Color(hex: 0x0EA5E9), Color(hex: 0xE0F2FE)],
      [Color(hex: 0x8B5CF6), Color(hex: 0xEDE9FE)],
      [Color(hex: 0x14B8A6), Color(hex: 0xCCFBF1)],
      [Color(hex: 0xF43F5E), Color(hex: 0xFFF1F2)]
    ]
    let idx = abs(id.hashValue) % palettes.count
    return palettes[idx]
  }
}
