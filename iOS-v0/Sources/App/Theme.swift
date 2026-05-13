import SwiftUI

// MARK: - Color 扩展：支持 hex 初始化，便于与 Android Color.kt 对齐
extension Color {
  /// 从 16 进制初始化，例如 0xFFEC7C38
  init(hex: UInt32, alpha: Double = 1.0) {
    let r = Double((hex >> 16) & 0xFF) / 255.0
    let g = Double((hex >> 8) & 0xFF) / 255.0
    let b = Double(hex & 0xFF) / 255.0
    self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
  }
}

/// 主题颜色 - 严格对齐 Android `com.xlwl.AiMian.ui.theme.Color.kt`
/// 整体走浅色主题：白底、淡蓝辅助、品牌橙、统一文字层级。
enum AppColor {
  // MARK: 品牌主色
  /// 品牌橙 - 对齐 Android PrimaryOrange (#EC7C38)
  static let primaryOrange = Color(hex: 0xEC7C38)
  /// 品牌蓝 - 对齐 Android PrimaryBlue (#00ADC1)
  static let primaryBlue = Color(hex: 0x00ADC1)
  /// 橙色渐变（AI 按钮） - 对齐 Android FF9A3C -> FF7A1C
  static let orangeGradientStart = Color(hex: 0xFF9A3C)
  static let orangeGradientEnd = Color(hex: 0xFF7A1C)

  // MARK: 文字色
  /// 主文字 - 对齐 TextPrimary (#1C1D1F)
  static let textPrimary = Color(hex: 0x1C1D1F)
  /// 次级文字 - 对齐 TextSecondary (#757575)
  static let textSecondary = Color(hex: 0x757575)
  /// 提示/占位文字 - 对齐 TextTertiary (#B5B7B8)
  static let textTertiary = Color(hex: 0xB5B7B8)

  // MARK: 背景 / 表面
  /// 纯白 - 对齐 BackgroundWhite (#FFFFFF)
  static let backgroundWhite = Color(hex: 0xFFFFFF)
  /// 淡蓝主背景 - 对齐 BackgroundLight (#E3F4FB)
  static let backgroundLight = Color(hex: 0xE3F4FB)
  /// iOS 风格系统灰 - 对齐 BackgroundGray (#F2F2F7)
  static let backgroundGray = Color(hex: 0xF2F2F7)
  /// 表面变体 - 对齐 SurfaceVariant (#F7F7F9)
  static let surfaceVariant = Color(hex: 0xF7F7F9)
  /// 分割线 - 对齐 DividerGray (#E5E5E5)
  static let dividerGray = Color(hex: 0xE5E5E5)

  // MARK: 页面背景渐变
  /// 主页面背景：从顶部蓝色渐变到底部淡蓝 - 对齐 Android 首页蓝色头部
  static let backgroundGradient = LinearGradient(
    colors: [
      Color(hex: 0xB8E7F2),
      Color(hex: 0xE3F4FB),
      Color(hex: 0xFFFFFF)
    ],
    startPoint: .top,
    endPoint: .bottom
  )

  /// 蓝色头部渐变（需要蓝色状态栏的页面）
  static let blueHeaderGradient = LinearGradient(
    colors: [
      Color(hex: 0x00ADC1),
      Color(hex: 0x3DC8DC)
    ],
    startPoint: .top,
    endPoint: .bottom
  )

  /// 纯白背景（详情页/设置页等）
  static let whiteBackground = LinearGradient(
    colors: [Color.white, Color.white],
    startPoint: .top,
    endPoint: .bottom
  )

  // MARK: 语义别名（兼容既有调用点：Circle/Jobs/CreatePost 等）
  /// 卡片背景 - 浅色白底
  static let card = Color.white
  /// 表面背景 - 浅灰
  static let surface = surfaceVariant
  /// 描边颜色
  static let outline = dividerGray
  /// 强调色（等同于 primaryOrange）
  static let accent = primaryOrange
  /// 柔和橙色（浅色 tint）
  static let accentSoft = Color(hex: 0xFFE8D8)

  // MARK: 底栏
  /// 底栏渐变起始色 - 对齐 Android F8F8F8 @0.92
  static let bottomBarGradientStart = Color(hex: 0xF8F8F8).opacity(0.92)
  /// 底栏渐变结束色 - 对齐 Android FFFFFF @0.96
  static let bottomBarGradientEnd = Color(hex: 0xFFFFFF).opacity(0.96)
  /// 底栏边框 - 对齐 Android white @0.7
  static let bottomBarBorder = Color.white.opacity(0.7)
  /// 底栏选中色（品牌橙）
  static let bottomBarSelected = primaryOrange
  /// 底栏未选中色
  static let bottomBarUnselected = textTertiary

  // MARK: 向后兼容（早期暗色常量映射到新语义）
  /// 兼容旧代码的命名
  static let bottomBarBackground = bottomBarGradientStart
  static let orangeAccent = primaryOrange
}

// MARK: - 字体
enum AppFont {
  static func title(_ size: CGFloat) -> Font { .system(size: size, weight: .semibold, design: .rounded) }
  static func body(_ size: CGFloat) -> Font { .system(size: size, weight: .regular, design: .rounded) }
  static func caption(_ size: CGFloat) -> Font { .system(size: size, weight: .medium, design: .rounded) }
  static func bold(_ size: CGFloat) -> Font { .system(size: size, weight: .bold, design: .rounded) }
}

// MARK: - 统一阴影
enum AppShadow {
  /// 卡片阴影（轻量）
  static let card: (color: Color, radius: CGFloat, x: CGFloat, y: CGFloat) =
    (Color.black.opacity(0.06), 10, 0, 4)
  /// 浮层阴影（较重）
  static let floating: (color: Color, radius: CGFloat, x: CGFloat, y: CGFloat) =
    (Color.black.opacity(0.12), 12, 0, 6)
}
