// JobSelectionScreen.ets - AI职位选择页面
// 参考 Android AiJobSelectionScreen.kt 实现完整功能

const GradientTop = Color.fromARGB(255, 0, 172, 195);
const AccentCyan = Color.fromARGB(255, 0, 173, 193);
const AccentOrange = Color.fromARGB(255, 236, 124, 56);
const PlaceholderGrey = Color.fromARGB(255, 181, 183, 184);
const ChipBackground = Color.fromARGB(255, 223, 251, 255);
const ChipOutline = Color.fromARGB(255, 0, 173, 193);
const SidebarBackground = Color.fromARGB(255, 245, 245, 245);
const SidebarInactive = Color.fromARGB(255, 181, 183, 184);
const CardBackground = Color.fromARGB(255, 250, 250, 250);
const CardSelectedBackground = Color.fromARGB(255, 223, 251, 255);
const CardTextDefault = Color.fromARGB(255, 165, 165, 165);

// 职位字典分类
export interface JobDictionaryCategory {
  id: string;
  name: string;
  positions: JobDictionaryPosition[];
}

// 职位字典中的职位
export interface JobDictionaryPosition {
  id: string;
  name: string;
  code: string;
  tags: string[];
  categoryId: string;
}

// JobSelectionScreen Props
export interface JobSelectionScreenProps {
  onBack: () => void;
  onStartInterview: (position: JobDictionaryPosition, category: JobDictionaryCategory) => void;
}

// 模拟职位分类数据
const mockCategories: JobDictionaryCategory[] = [
  {
    id: 'cat_1',
    name: '前端开发',
    positions: [
      { id: 'pos_1', name: '前端开发工程师', code: 'FE_DEV', tags: ['React', 'Vue'], categoryId: 'cat_1' },
      { id: 'pos_2', name: '高级前端工程师', code: 'FE_SENIOR', tags: ['架构'], categoryId: 'cat_1' },
      { id: 'pos_3', name: '前端Leader', code: 'FE_LEAD', tags: ['管理'], categoryId: 'cat_1' },
      { id: 'pos_4', name: 'React开发', code: 'FE_REACT', tags: ['React'], categoryId: 'cat_1' },
      { id: 'pos_5', name: 'Vue开发', code: 'FE_VUE', tags: ['Vue'], categoryId: 'cat_1' }
    ]
  },
  {
    id: 'cat_2',
    name: '后端开发',
    positions: [
      { id: 'pos_6', name: 'Java开发工程师', code: 'BE_JAVA', tags: ['Java'], categoryId: 'cat_2' },
      { id: 'pos_7', name: 'Go开发工程师', code: 'BE_GO', tags: ['Go'], categoryId: 'cat_2' },
      { id: 'pos_8', name: 'Python开发', code: 'BE_PY', tags: ['Python'], categoryId: 'cat_2' },
      { id: 'pos_9', name: 'Node.js开发', code: 'BE_NODE', tags: ['Node'], categoryId: 'cat_2' }
    ]
  },
  {
    id: 'cat_3',
    name: '数据科学',
    positions: [
      { id: 'pos_10', name: '数据分析师', code: 'DS_ANALYST', tags: ['SQL', 'Python'], categoryId: 'cat_3' },
      { id: 'pos_11', name: '算法工程师', code: 'DS_ALGO', tags: ['ML', 'DL'], categoryId: 'cat_3' },
      { id: 'pos_12', name: '数据挖掘工程师', code: 'DS_MINING', tags: ['挖掘'], categoryId: 'cat_3' }
    ]
  },
  {
    id: 'cat_4',
    name: '产品经理',
    positions: [
      { id: 'pos_13', name: '产品经理', code: 'PM_DEFAULT', tags: ['产品'], categoryId: 'cat_4' },
      { id: 'pos_14', name: '高级产品经理', code: 'PM_SENIOR', tags: ['高级'], categoryId: 'cat_4' },
      { id: 'pos_15', name: '产品总监', code: 'PM_DIR', tags: ['管理'], categoryId: 'cat_4' }
    ]
  },
  {
    id: 'cat_5',
    name: 'UI设计',
    positions: [
      { id: 'pos_16', name: 'UI设计师', code: 'UI_DESIGNER', tags: ['UI'], categoryId: 'cat_5' },
      { id: 'pos_17', name: 'UX设计师', code: 'UX_DESIGNER', tags: ['UX'], categoryId: 'cat_5' },
      { id: 'pos_18', name: '视觉设计师', code: 'VISUAL_DESIGNER', tags: ['视觉'], categoryId: 'cat_5' }
    ]
  },
  {
    id: 'cat_6',
    name: '运营',
    positions: [
      { id: 'pos_19', name: '用户运营', code: 'OP_USER', tags: ['用户'], categoryId: 'cat_6' },
      { id: 'pos_20', name: '内容运营', code: 'OP_CONTENT', tags: ['内容'], categoryId: 'cat_6' },
      { id: 'pos_21', name: '活动运营', code: 'OP_ACTIVITY', tags: ['活动'], categoryId: 'cat_6' }
    ]
  }
];

@Component
export struct JobSelectionScreen {
  private props: JobSelectionScreenProps;
  @State private categories: JobDictionaryCategory[] = mockCategories;
  @State private activeCategoryId: string = 'cat_1';
  @State private selectedPosition: JobDictionaryPosition | null = null;
  @State private searchQuery: string = '';
  @State private isLoading: boolean = false;
  @State private showResumeDialog: boolean = false;

  build() {
    Column() {
      // 顶部搜索区域
      this.buildTopSection()

      // 主内容区域（左侧分类 + 右侧职位）
      Row() {
        // 左侧分类栏
        this.buildCategorySidebar()

        // 右侧职位列表
        Column() {
          this.buildPositionGrid()
        }
        .layoutWeight(1)
        .padding({ right: 12, bottom: 12 })
      }
      .width('100%')
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.White)
  }

  // 顶部搜索区域
  @Builder
  buildTopSection() {
    Column() {
      // 返回按钮和标题
      Row() {
        Image($r('sys.media.ohos_ic_public_arrow_left'))
          .width(24)
          .height(24)
          .fillColor(Color.Black)
          .onClick(() => {
            this.props.onBack?.();
          })

        Text('选择面试职岗')
          .fontSize(20)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.Black)
          .margin({ left: 8 })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12 })
      .alignItems(VerticalAlign.Center)

      // 搜索框
      Row() {
        Image($r('sys.media.ohos_ic_public_search'))
          .width(12)
          .height(12)
          .fillColor(PlaceholderGrey)

        TextInput({ placeholder: '搜索' })
          .width('100%')
          .height(32)
          .fontSize(12)
          .backgroundColor(Color.White)
          .borderRadius(8)
          .padding({ left: 24, right: 8 })
          .onChange((value: string) => {
            this.searchQuery = value;
          })
      }
      .width('100%')
      .height(34)
      .backgroundColor(Color.White)
      .borderRadius(8)
      .padding({ left: 24 })
      .margin({ left: 16, right: 16, top: 12 })

      // 已选职位标签
      if (this.selectedPosition) {
        Row() {
          Column() {
            Text(this.selectedPosition.name)
              .fontSize(12)
              .fontColor(AccentCyan)
              .padding({ left: 12, right: 12, top: 6, bottom: 6 })
          }
          .backgroundColor(ChipBackground)
          .borderRadius(8)
          .border({
            width: 1,
            color: ChipOutline,
            radius: 8
          })
          .margin({ left: 16, top: 10 })

          // 关闭按钮
          Image($r('sys.media.ohos_ic_public_close'))
            .width(10)
            .height(10)
            .fillColor(Color.White)
            .backgroundColor(AccentCyan)
            .borderRadius(5)
            .margin({ left: -24, top: 6 })
            .onClick(() => {
              this.selectedPosition = null;
            })
        }
        .width('100%')
      }
    }
    .width('100%')
    .background(
      new LinearGradient({
        direction: GradientDirection.Top,
        colors: [
          [GradientTop, 0],
          [Color.fromARGB(255, 81, 171, 185), 1],
          [Color.White, 2]
        ]
      })
    )
    .padding({ bottom: 10 })
  }

  // 左侧分类栏
  @Builder
  buildCategorySidebar() {
    Column() {
      List() {
        ForEach(this.categories, (category: JobDictionaryCategory) => {
          ListItem() {
            Column() {
              Text(category.name)
                .fontSize(14)
                .fontColor(category.id === this.activeCategoryId ? AccentCyan : SidebarInactive)
                .fontWeight(category.id === this.activeCategoryId ? FontWeight.Medium : FontWeight.Normal)
                .textAlign(TextAlign.Center)
                .width('100%')
            }
            .width('100%')
            .height(48)
            .backgroundColor(category.id === this.activeCategoryId ? Color.White : SidebarBackground)
            .onClick(() => {
              this.activeCategoryId = category.id;
            })
          }
        })
      }
      .width(100)
      .height('100%')
      .backgroundColor(SidebarBackground)
    }
    .width(100)
    .height('100%')
  }

  // 右侧职位网格
  @Builder
  buildPositionGrid() {
    Column() {
      if (this.isLoading) {
        Column() {
          LoadingProgress()
            .width(32)
            .height(32)
        }
        .width('100%')
        .height(200)
        .justifyContent(FlexAlign.Center)
      } else {
        // 获取当前分类
        let activeCategory = this.categories.find(c => c.id === this.activeCategoryId);
        if (activeCategory) {
          // 过滤职位
          let filteredPositions = activeCategory.positions.filter(pos => {
            if (!this.searchQuery) return true;
            const keyword = this.searchQuery.toLowerCase();
            return pos.name.toLowerCase().includes(keyword) ||
              pos.code.toLowerCase().includes(keyword) ||
              pos.tags.some(tag => tag.toLowerCase().includes(keyword));
          });

          // 双列网格
          Row() {
            ForEach(filteredPositions.slice(0, Math.ceil(filteredPositions.length / 2)), (pos: JobDictionaryPosition) => {
              this.buildPositionCard(pos);
            })
          }
          .width('100%')

          if (filteredPositions.length > Math.ceil(filteredPositions.length / 2)) {
            Row() {
              ForEach(filteredPositions.slice(Math.ceil(filteredPositions.length / 2)), (pos: JobDictionaryPosition) => {
                this.buildPositionCard(pos);
              })
            }
            .width('100%')
            .margin({ top: 12 })
          }
        }
      }
    }
    .width('100%')
    .height('100%')
  }

  // 职位卡片
  @Builder
  buildPositionCard(position: JobDictionaryPosition) {
    Column() {
      Text(position.name.length > 6 ? position.name.substring(0, 6) + '...' : position.name)
        .fontSize(12)
        .fontColor(this.selectedPosition?.id === position.id ? AccentCyan : CardTextDefault)
        .fontWeight(this.selectedPosition?.id === position.id ? FontWeight.Medium : FontWeight.Normal)
        .textAlign(TextAlign.Center)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .width('100%')
    .height(44)
    .backgroundColor(this.selectedPosition?.id === position.id ? CardSelectedBackground : CardBackground)
    .borderRadius(8)
    .border({
      width: this.selectedPosition?.id === position.id ? 1 : 0,
      color: this.selectedPosition?.id === position.id ? AccentCyan : Color.Transparent,
      radius: 8
    })
    .justifyContent(FlexAlign.Center)
    .margin({ right: 12, bottom: 12 })
    .onClick(() => {
      let category = this.categories.find(c => c.id === position.categoryId);
      if (category) {
        this.selectedPosition = position;
        this.props.onStartInterview?.(position, category);
      }
    })
  }
}
