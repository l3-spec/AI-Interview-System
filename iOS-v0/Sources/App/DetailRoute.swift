import Foundation

/// 标签页内部的详情路由 - 用于 NavigationStack(path:) 的统一 value 类型
/// 让首页/职圈/职岗的卡片点击通过 NavigationLink(value:) 推入详情栈
enum DetailRoute: Hashable {
  case jobDetail(String)
  case postDetail(String)
  case company(String)
}
