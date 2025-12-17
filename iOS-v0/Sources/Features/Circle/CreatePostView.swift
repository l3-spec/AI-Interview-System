import SwiftUI
import PhotosUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

@MainActor
final class CreatePostViewModel: ObservableObject {
  @Published var title: String = ""
  @Published var content: String = ""
  @Published var tagsText: String = ""
  @Published var isPublishing = false
  @Published var message: String?

  func publish(using appState: AppState, images: [Data]) async {
    guard !title.isEmpty, !content.isEmpty else {
      message = "请填写标题和内容"
      return
    }
    isPublishing = true
    defer { isPublishing = false }
    do {
      let tags = tagsText.split(whereSeparator: { $0 == "," || $0 == " " || $0 == "，" }).map { String($0) }
      _ = try await appState.contentService.createUserPost(title: title, content: content, tags: tags, images: images)
      message = "发布成功"
      title = ""
      content = ""
      tagsText = ""
    } catch {
      message = error.localizedDescription
    }
  }
}

struct CreatePostView: View {
  @EnvironmentObject private var appState: AppState
  @Environment(\.dismiss) private var dismiss
  @StateObject private var viewModel = CreatePostViewModel()
  @State private var pickerItems: [PhotosPickerItem] = []
  @State private var selectedImages: [Data] = []
  @State private var showLogin = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 14) {
          TextField("标题（30字内）", text: $viewModel.title)
            .textFieldStyle(.roundedBorder)
          TextEditor(text: $viewModel.content)
            .frame(height: 180)
            .padding(8)
            .background(AppColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColor.outline, lineWidth: 1))
          TextField("标签，逗号分隔", text: $viewModel.tagsText)
            .textFieldStyle(.roundedBorder)

          VStack(alignment: .leading, spacing: 8) {
            Text("上传图片（可选）")
              .font(AppFont.body(13))
              .foregroundStyle(AppColor.textSecondary)
            PhotosPicker(selection: $pickerItems, maxSelectionCount: 6, matching: .images) {
              RoundedRectangle(cornerRadius: 12)
                .stroke(AppColor.outline, style: StrokeStyle(lineWidth: 1, dash: [6]))
                .frame(height: 80)
                .overlay(Text("选择图片").foregroundStyle(AppColor.textSecondary))
            }
            ScrollView(.horizontal, showsIndicators: false) {
              HStack(spacing: 8) {
                ForEach(Array(selectedImages.enumerated()), id: \.offset) { _, data in
                  #if canImport(UIKit)
                  if let image = UIImage(data: data) {
                    Image(uiImage: image)
                      .resizable()
                      .scaledToFill()
                      .frame(width: 96, height: 96)
                      .clipShape(RoundedRectangle(cornerRadius: 10))
                  }
                  #elseif canImport(AppKit)
                  if let image = NSImage(data: data) {
                    Image(nsImage: image)
                      .resizable()
                      .scaledToFill()
                      .frame(width: 96, height: 96)
                      .clipShape(RoundedRectangle(cornerRadius: 10))
                  }
                  #endif
                }
              }
            }
          }

          PrimaryButton(title: "发布", isLoading: viewModel.isPublishing) {
            guard appState.isLoggedIn else {
              showLogin = true
              return
            }
            Task { await viewModel.publish(using: appState, images: selectedImages) }
          }

          if let message = viewModel.message {
            Text(message)
              .font(AppFont.caption(12))
              .foregroundStyle(message.contains("成功") ? AppColor.textSecondary : .red)
          }
        }
        .padding(16)
      }
      .background(AppColor.backgroundGradient.ignoresSafeArea())
      .navigationTitle("发布帖子")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") { dismiss() }
        }
      }
      .sheet(isPresented: $showLogin) {
        LoginView { data in
          appState.updateAuth(token: data.token, user: data.user)
          showLogin = false
        }
        .environmentObject(appState)
      }
      .onChange(of: pickerItems) { newItems in
        Task {
          var datas: [Data] = []
          for item in newItems {
            if let data = try? await item.loadTransferable(type: Data.self) {
              datas.append(data)
            }
          }
          selectedImages = datas
        }
      }
    }
  }
}
