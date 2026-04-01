// CreatePostScreen.ets - 发布帖子页面
// 参考 Android CreatePostScreen.kt 实现完整功能

const AccentOrange = Color.fromARGB(255, 236, 124, 56);
const AccentCyan = Color.fromARGB(255, 0, 173, 193);
const PlaceholderColor = Color.fromARGB(255, 181, 183, 184);
const PrimaryText = Color.fromARGB(255, 0, 0, 0);
const TextSecondary = Color.fromARGB(255, 139, 146, 154);
const ImagePlaceholder = Color.fromARGB(255, 235, 235, 235);
const ChipBackground = Color.fromARGB(255, 245, 247, 250);
const ChipText = Color.fromARGB(255, 95, 103, 115);
const CardBackground = Color.White;
const BorderColor = Color.fromARGB(255, 229, 231, 235);

const TITLE_MAX_LENGTH = 30;
const MAX_IMAGES = 6;

// 已选择的图片数据
export interface SelectedImageData {
  uri: string;
  index: number;
}

// CreatePostScreen Props
export interface CreatePostScreenProps {
  onBack: () => void;
  onPublish: (title: string, content: string, tags: string[]) => void;
}

// 模拟选中图片
const mockSelectedImages: SelectedImageData[] = [];

@Component
export struct CreatePostScreen {
  private props: CreatePostScreenProps;
  @State private title: string = '';
  @State private content: string = '';
  @State private selectedTags: string[] = [];
  @State private selectedImages: SelectedImageData[] = mockSelectedImages;
  @State private showTagDialog: boolean = false;
  @State private tagInput: string = '';
  @State private isPublishing: boolean = false;

  private tagSuggestions: string[] = ['#AI', '#职业转型', '#Offer分享', '#面试技巧', '#职场干货'];

  build() {
    Column() {
      // 顶部导航栏
      this.buildTopBar()

      // 内容区域
      Column() {
        // 标题输入
        this.buildTitleSection()

        // 内容输入
        this.buildContentSection()

        // 标签选择
        this.buildTagSection()
      }
      .layoutWeight(1)
      .width('100%')
      .scrollBar(BarState.Off)
      .alignItems(HorizontalAlign.Start)

      // 底部发布按钮
      this.buildBottomBar()
    }
    .width('100%')
    .height('100%')
    .backgroundColor(CardBackground)
  }

  // 顶部导航栏
  @Builder
  buildTopBar() {
    Row() {
      Image($r('sys.media.ohos_ic_public_close'))
        .width(24)
        .height(24)
        .fillColor(PrimaryText)
        .onClick(() => {
          this.props.onBack?.();
        })

      Text('发帖')
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(PrimaryText)
        .layoutWeight(1)
        .textAlign(TextAlign.Center)
        .margin({ left: -40 })
    }
    .width('100%')
    .height(56)
    .padding({ left: 16, right: 16 })
    .backgroundColor(CardBackground)
    .alignItems(VerticalAlign.Center)
  }

  // 标题输入区域
  @Builder
  buildTitleSection() {
    Column() {
      Row() {
        TextInput({ placeholder: '好的标题会让更多人看到哦~', text: this.title })
          .width('100%')
          .height(40)
          .fontSize(14)
          .fontColor(PrimaryText)
          .placeholderColor(PlaceholderColor)
          .backgroundColor(Color.Transparent)
          .onChange((value: string) => {
            if (value.length <= TITLE_MAX_LENGTH) {
              this.title = value;
            }
          })

        Text(this.title.length + '/' + TITLE_MAX_LENGTH)
          .fontSize(14)
          .fontColor(PlaceholderColor)
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 10, bottom: 10 })

      // 分隔线
      Column() {
        Column()
          .width('100%')
          .height(0.25)
          .backgroundColor(PlaceholderColor.copy((alpha: 0.6) as any))
      }
      .width('100%')
      .padding({ left: 16, right: 16 })
    }
    .width('100%')
  }

  // 内容输入区域
  @Builder
  buildContentSection() {
    Column() {
      // 内容输入框
      TextArea({ placeholder: '此刻你想和大家分享什么......', text: this.content })
        .width('100%')
        .height(220)
        .fontSize(14)
        .fontColor(PrimaryText)
        .placeholderColor(PlaceholderColor)
        .backgroundColor(Color.Transparent)
        .padding({ left: 16, right: 16, top: 10, bottom: 10 })
        .onChange((value: string) => {
          this.content = value;
        })

      // 添加图片区域
      Row() {
        // 已有图片预览
        ForEach(this.selectedImages, (img: SelectedImageData, index: number) => {
          Column() {
            // 占位图
            Column() {
              Text('图片 ' + (index + 1))
                .fontSize(12)
                .fontColor(PlaceholderColor)
            }
            .width(110)
            .height(110)
            .backgroundColor(ImagePlaceholder)
            .borderRadius(8)
            .justifyContent(FlexAlign.Center)

            // 删除按钮
            Column() {
              Image($r('sys.media.ohos_ic_public_close'))
                .width(16)
                .height(16)
                .fillColor(Color.White)
            }
            .width(24)
            .height(24)
            .backgroundColor(Color.Black.copy((alpha: 0.45) as any))
            .borderRadius(12)
            .position({ x: 88, y: -2 })
            .onClick(() => {
              this.removeImage(index);
            })
          }
          .margin({ right: 8 })
        })

        // 添加图片按钮
        if (this.selectedImages.length < MAX_IMAGES) {
          Column() {
            Image($r('sys.media.ohos_ic_public_add'))
              .width(28)
              .height(28)
              .fillColor(PlaceholderColor)
          }
          .width(110)
          .height(110)
          .backgroundColor(ImagePlaceholder)
          .borderRadius(12)
          .justifyContent(FlexAlign.Center)
          .onClick(() => {
            this.addImage();
          })
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 8 })
    }
    .width('100%')
  }

  // 标签选择区域
  @Builder
  buildTagSection() {
    Column() {
      Row() {
        // 话题标签
        ForEach(this.selectedTags, (tag: string) => {
          Column() {
            Text(tag)
              .fontSize(12)
              .fontColor(AccentOrange)
              .padding({ left: 12, right: 12, top: 2, bottom: 2 })
          }
          .backgroundColor(AccentOrange.copy((alpha: 0.12) as any))
          .borderRadius(25)
          .border({
            width: 0.5,
            color: AccentOrange,
            radius: 25
          })
          .margin({ right: 8 })
          .onClick(() => {
            this.removeTag(tag);
          })
        })

        // 添加话题按钮
        Column() {
          Text('#话题')
            .fontSize(12)
            .fontColor(PrimaryText)
            .fontWeight(FontWeight.Medium)
            .padding({ left: 12, right: 12, top: 2, bottom: 2 })
        }
        .backgroundColor(Color.White)
        .borderRadius(25)
        .border({
          width: 0.5,
          color: PlaceholderColor,
          radius: 25
        })
        .onClick(() => {
          this.showTagDialog = true;
        })

        // 分隔线
        Column() {
          Column()
            .width(0.5)
            .height(17)
            .backgroundColor(PlaceholderColor.copy((alpha: 0.6) as any))
        }
        .margin({ left: 8 })
        .height(17)
        .justifyContent(FlexAlign.Center)

        // 建议标签
        ForEach(this.tagSuggestions.slice(0, 3), (tag: string) => {
          Column() {
            Text(tag)
              .fontSize(12)
              .fontColor(PlaceholderColor)
              .fontWeight(FontWeight.Light)
              .padding({ left: 12, right: 12, top: 2, bottom: 2 })
          }
          .backgroundColor(Color.White)
          .borderRadius(25)
          .border({
            width: 0.5,
            color: PlaceholderColor,
            radius: 25
          })
          .margin({ left: 8 })
          .onClick(() => {
            this.addTag(tag);
          })
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 12 })
    }
    .width('100%')
  }

  // 底部发布按钮
  @Builder
  buildBottomBar() {
    Column() {
      // 分隔线
      Column() {
        Column()
          .width('100%')
          .height(1)
          .backgroundColor(BorderColor)
      }
      .width('100%')

      // 发布按钮
      Button('发布')
        .type(ButtonType.Capsule)
        .width('100%')
        .height(48)
        .backgroundColor(AccentOrange)
        .fontColor(Color.White)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .enabled(!this.isPublishing)
        .margin({ left: 16, right: 16, top: 10, bottom: 10 })
        .onClick(() => {
          this.handlePublish();
        })
    }
    .width('100%')
    .backgroundColor(CardBackground)
  }

  // 添加图片
  private addImage(): void {
    if (this.selectedImages.length < MAX_IMAGES) {
      this.selectedImages.push({
        uri: '',
        index: this.selectedImages.length
      });
    }
  }

  // 移除图片
  private removeImage(index: number): void {
    this.selectedImages.remove(index);
  }

  // 添加标签
  private addTag(tag: string): void {
    if (!this.selectedTags.includes(tag)) {
      this.selectedTags.push(tag);
    }
  }

  // 移除标签
  private removeTag(tag: string): void {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.remove(index);
    }
  }

  // 处理发布
  private handlePublish(): void {
    // 验证
    if (!this.title || this.title.trim() === '') {
      // 显示提示：请输入标题
      return;
    }

    if (!this.content || this.content.trim() === '' || this.content === '此刻你想和大家分享什么......') {
      // 显示提示：请输入内容
      return;
    }

    // 开始发布
    this.isPublishing = true;

    setTimeout(() => {
      this.props.onPublish?.(this.title.trim(), this.content, this.selectedTags);
      this.isPublishing = false;
    }, 1500);
  }
}
