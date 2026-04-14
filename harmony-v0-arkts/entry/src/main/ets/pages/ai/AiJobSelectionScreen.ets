/**
 * AI面试职位选择页面
 * 支持搜索、职位分类Tab、职位列表选择
 */

interface AiJobSelectionScreenProps {
  onBack: () => void;
  onStartInterview: (positionId: string, positionName: string) => void;
}

// 职位大类
interface JobCategory {
  id: string;
  name: string;
  icon: string;
}

// 职位项
interface JobPosition {
  id: string;
  name: string;
  description: string;
  categoryId: string;
}

// 示例数据
const JOB_CATEGORIES: JobCategory[] = [
  { id: 'tech', name: '技术', icon: '💻' },
  { id: 'product', name: '产品', icon: '📱' },
  { id: 'operation', name: '运营', icon: '📊' },
  { id: 'marketing', name: '市场', icon: '📢' },
  { id: '管培生', name: '管培生', icon: '🎓' }
];

const JOB_POSITIONS: JobPosition[] = [
  // 技术类
  { id: 'pos_001', name: 'Java开发工程师', description: '后端开发、分布式系统', categoryId: 'tech' },
  { id: 'pos_002', name: '前端开发工程师', description: 'React/Vue、响应式开发', categoryId: 'tech' },
  { id: 'pos_003', name: 'Android开发工程师', description: 'Android原生开发、Kotlin', categoryId: 'tech' },
  { id: 'pos_004', name: 'iOS开发工程师', description: 'iOS原生开发、Swift', categoryId: 'tech' },
  { id: 'pos_005', name: '测试开发工程师', description: '自动化测试、质量保障', categoryId: 'tech' },
  { id: 'pos_006', name: '算法工程师', description: '机器学习、深度学习', categoryId: 'tech' },
  // 产品类
  { id: 'pos_101', name: '产品经理', description: '需求分析、产品规划', categoryId: 'product' },
  { id: 'pos_102', name: '产品运营', description: '用户增长、活动策划', categoryId: 'product' },
  // 运营类
  { id: 'pos_201', name: '用户运营', description: '用户增长、留存分析', categoryId: 'operation' },
  { id: 'pos_202', name: '内容运营', description: '内容策划、内容生产', categoryId: 'operation' },
  { id: 'pos_203', name: '活动运营', description: '活动策划、活动执行', categoryId: 'operation' },
  // 市场类
  { id: 'pos_301', name: '市场推广', description: '品牌推广、渠道拓展', categoryId: 'marketing' },
  { id: 'pos_302', name: '商务拓展', description: '商务合作、供应商管理', categoryId: 'marketing' },
  // 管培生
  { id: 'pos_401', name: '综合管培生', description: '轮岗培养、管理储备', categoryId: '管培生' },
  { id: 'pos_402', name: '技术管培生', description: '技术管理、架构方向', categoryId: '管培生' },
];

@Component
export default struct AiJobSelectionScreen {
  props: AiJobSelectionScreenProps = {
    onBack: () => {},
    onStartInterview: () => {}
  };

  @State private selectedCategoryIndex: number = 0;
  @State private searchText: string = '';
  @State private selectedPositionId: string = '';
  @State private positions: JobPosition[] = JOB_POSITIONS;

  private get currentCategory(): JobCategory {
    return JOB_CATEGORIES[this.selectedCategoryIndex];
  }

  private get filteredPositions(): JobPosition[] {
    let filtered = this.positions.filter(p => p.categoryId === this.currentCategory.id);

    if (this.searchText.trim() !== '') {
      const keyword = this.searchText.toLowerCase();
      filtered = this.positions.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  }

  private get selectedPosition(): JobPosition | undefined {
    return this.positions.find(p => p.id === this.selectedPositionId);
  }

  build() {
    Column() {
      // 顶部区域 - 渐变背景
      Column() {
        // 顶部标题栏
        Row() {
          Button('← 返回', { type: ButtonType.Capsule })
            .fontSize(14)
            .onClick(() => this.props.onBack?.())

          Blank()

          Text('选择面试方向')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)

          Blank()
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 16, bottom: 12 })
      }
      .width('100%')
      .backgroundColor(Color.fromARGB(255, 0, 173, 195))

      // 搜索框
      Row() {
        Text('🔍')
          .fontSize(18)
          .margin({ left: 12 })

        TextInput({ placeholder: '搜索职位...', text: this.searchText })
          .fontSize(15)
          .layoutWeight(1)
          .margin({ left: 8, right: 12 })
          .onChange((value: string) => {
            this.searchText = value;
          })
      }
      .width('100%')
      .height(44)
      .backgroundColor(Color.White)
      .borderRadius(22)
      .shadow({
        radius: 8,
        color: Color.fromARGB(30, 0, 0, 0),
        offsetY: 2
      })
      .margin({ left: 16, right: 16, top: -20 })

      // 职位大类Tab
      this.buildCategoryTabs()

      // 职位列表
      this.buildPositionList()

      // 底部固定区 - 数字人预览 + 开始面试按钮
      this.buildBottomArea()
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.fromARGB(255, 246, 248, 252))
  }

  @Builder
  private buildCategoryTabs() {
    Column() {
      // Tab栏
      Scroll() {
        Row() {
          ForEach(JOB_CATEGORIES, (category: JobCategory, index: number) => {
            Column() {
              Text(category.icon + ' ' + category.name)
                .fontSize(14)
                .fontWeight(this.selectedCategoryIndex === index ? FontWeight.Bold : FontWeight.Normal)
                .fontColor(this.selectedCategoryIndex === index ?
                  Color.fromARGB(255, 0, 173, 195) : Color.fromARGB(180, 100, 100, 100))
                .padding({
                  left: 16,
                  right: 16,
                  top: 12,
                  bottom: 8
                })

              // 选中指示条
              if (this.selectedCategoryIndex === index) {
                Rect()
                  .width(30)
                  .height(3)
                  .backgroundColor(Color.fromARGB(255, 0, 173, 195))
                  .borderRadius(1.5)
                  .align(Alignment.TopCenter)
              } else {
                Rect()
                  .width(30)
                  .height(3)
                  .backgroundColor(Color.Transparent)
              }
            }
            .onClick(() => {
              this.selectedCategoryIndex = index;
              this.selectedPositionId = '';
            })
          });
        }
      }
      .scrollable(ScrollDirection.Horizontal)
      .scrollBar(BarState.Off)
      .width('100%')
      .height(50)
      .backgroundColor(Color.White)
    }
  }

  @Builder
  private buildPositionList() {
    Column() {
      // 列表标题
      Text(`${this.currentCategory.name}类职位` + (this.searchText.trim() !== '' ? ' (搜索结果)' : ''))
        .fontSize(14)
        .fontColor(Color.fromARGB(150, 100, 100, 100))
        .padding({ left: 16, top: 16, bottom: 8 })

      // 职位列表
      if (this.filteredPositions.length === 0) {
        Column() {
          Text('😔')
            .fontSize(40)
            .margin({ top: 40 })
          Text('未找到匹配的职位')
            .fontSize(14)
            .fontColor(Color.fromARGB(150, 120, 120, 120))
            .margin({ top: 12 })
        }
        .width('100%')
        .height(150)
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
      } else {
        List() {
          ForEach(this.filteredPositions, (position: JobPosition) => {
            ListItem() {
              this.buildPositionItem(position)
            }
          });
        }
        .listDirection(Axis.Vertical)
        .edgeEffect(EdgeEffect.Spring)
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 16, right: 16 })
      }
    }
  }

  @Builder
  private buildPositionItem(position: JobPosition) {
    Column() {
      Row() {
        Column() {
          Text(position.name)
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
            .fontColor(this.selectedPositionId === position.id ?
              Color.fromARGB(255, 0, 173, 195) : Color.fromARGB(200, 50, 50, 50))

          Text(position.description)
            .fontSize(12)
            .fontColor(Color.fromARGB(150, 120, 120, 120))
            .margin({ top: 4 })
        }

        Blank()

        // 选中状态
        if (this.selectedPositionId === position.id) {
          Text('✓')
            .fontSize(20)
            .fontColor(Color.fromARGB(255, 0, 173, 195))
        }
      }
      .width('100%')
      .padding(16)
    }
    .width('100%')
    .backgroundColor(this.selectedPositionId === position.id ?
      Color.fromARGB(255, 223, 251, 255) : Color.White)
    .borderRadius(12)
    .border({
      width: this.selectedPositionId === position.id ? 1 : 0,
      color: Color.fromARGB(255, 0, 173, 195)
    })
    .margin({ bottom: 8 })
    .onClick(() => {
      this.selectedPositionId = position.id;
    })
  }

  @Builder
  private buildBottomArea() {
    Column() {
      // 数字人占位区域
      Stack({ alignContent: Alignment.Center }) {
        // 背景
        Rect()
          .width('100%')
          .height(120)
          .backgroundColor(Color.fromARGB(255, 230, 245, 250))
          .borderRadius(16)

        Column() {
          Text('🤖')
            .fontSize(36)
          Text('AI数字人面试官')
            .fontSize(12)
            .fontColor(Color.fromARGB(180, 0, 173, 195))
            .margin({ top: 4 })
        }
      }
      .margin({ left: 16, right: 16, bottom: 12 })

      // 开始面试按钮
      Button(this.selectedPositionId !== '' ? '开始面试' : '请先选择职位')
        .width('100%')
        .height(50)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .backgroundColor(this.selectedPositionId !== '' ?
          Color.fromARGB(255, 0, 173, 195) : Color.fromARGB(150, 180, 180, 180))
        .borderRadius(25)
        .margin({ left: 16, right: 16, bottom: 24 })
        .enabled(this.selectedPositionId !== '')
        .onClick(() => {
          const position = this.selectedPosition;
          if (position) {
            this.props.onStartInterview?.(position.id, position.name);
          }
        })
    }
    .width('100%')
    .backgroundColor(Color.White)
    .shadow({
      radius: 16,
      color: Color.fromARGB(30, 0, 0, 0),
      offsetY: -4
    })
  }
}
