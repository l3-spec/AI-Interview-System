/**
 * 面试题模板配置
 * 遵循STAR原则 + 行为/场景题设计 + 可量化评分标准
 */

export interface ScoringRubric {
  weight: number; // 该维度在总分中的权重（默认每个维度等权1/6≈0.1667）
  criteria: {
    score0: string; // 0分判定标准
    score5: string; // 5分判定标准
    score10: string; // 10分判定标准
  };
  contentWeight: number; // 内容评分权重
  multimodalWeight: number; // 多模态评分权重
  keywords: string[]; // 评分关键词
  quantifiableMetrics: string[]; // 可量化指标关键词
}

export interface QuestionTemplate {
  id: string;
  dimension: 'professionalAbility' | 'achievementInnovation' | 'learningAbility' | 'opennessInnovation' | 'stressResistance' | 'collaborationResponsibility' | 'learningGrowth' | 'communicationCollaboration' | 'problemSolving' | 'achievementExecution' | 'stressResilience';
  type: 'behavior' | 'scenario' | 'practical' | 'roleplay' | 'stress';
  textTemplate: string; // 支持变量：{{jobPosition}}, {{jobLevel}}, {{industry}}
  followUpTemplate?: string[]; // 追问模板
  scoringRubric: ScoringRubric;
}

// 通用权重配置
const DEFAULT_WEIGHT = 1 / 6;

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // -------------------------- 1. 专业硬能力维度 --------------------------
  {
    id: 'prof_1',
    dimension: 'professionalAbility',
    type: 'behavior',
    textTemplate: '请举例说明你过去做过的最能体现你{{jobPosition}}专业能力的项目，其中最复杂的技术/业务问题是什么？你是怎么解决的？',
    followUpTemplate: [
      '你在解决这个问题时用到了哪些核心的{{jobPosition}}知识点？',
      '这个解决方案最终带来了什么量化结果？',
      '如果再做一次，你会有什么优化？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '无法举例、描述空泛，知识点错误，逻辑混乱',
        score5: '能描述基本问题和解决方案，知识点基本正确，有基本逻辑',
        score10: '问题描述清晰，解决方案有技术/业务深度，知识点准确，结果可量化，追问回答正确'
      },
      contentWeight: 0.8,
      multimodalWeight: 0.2,
      keywords: ['解决', '架构', '优化', '核心', '原理', '流程', '实现', '方案'],
      quantifiableMetrics: ['提升', '降低', '减少', '增加', '%', '毫秒', 'QPS', '用户量', '收入']
    }
  },
  {
    id: 'prof_2',
    dimension: 'professionalAbility',
    type: 'scenario',
    textTemplate: '现在你需要为{{industry}}行业的一个项目设计{{jobPosition}}相关的方案，要求满足高可用/可扩展/业务需求，你会怎么设计？核心考虑点是什么？',
    followUpTemplate: [
      '这个方案的瓶颈可能在哪里？你怎么应对？',
      '如果出现XX问题（根据回答内容），你怎么排查？',
      '和行业常见方案相比，你的设计有什么优势？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '完全没有思路，设计逻辑错误，不符合行业常识',
        score5: '能给出基本设计思路，核心考虑点基本正确，可落地性一般',
        score10: '设计思路清晰，考虑全面，符合行业最佳实践，有可量化的预期效果，可落地性强'
      },
      contentWeight: 0.8,
      multimodalWeight: 0.2,
      keywords: ['设计', '架构', '高可用', '扩展性', '容灾', '监控', '性能', '成本'],
      quantifiableMetrics: ['可用性', '响应时间', '吞吐量', '成本', '故障率', '%']
    }
  },
  {
    id: 'prof_3',
    dimension: 'professionalAbility',
    type: 'practical',
    textTemplate: '请现场解决一个{{jobPosition}}常见的实操问题：{{practicalQuestionContext}}，说说你的解决思路和步骤。',
    followUpTemplate: [
      '你为什么选择这个方案而不是其他方案？',
      '如果第一步不行，你有什么备选方案？',
      '怎么验证这个解决方案是正确的？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '完全不会解决，思路完全错误',
        score5: '能给出基本解决思路，步骤大致正确，可能存在小的疏漏',
        score10: '解决思路清晰，步骤完整正确，考虑边界情况，能给出验证方法'
      },
      contentWeight: 0.8,
      multimodalWeight: 0.2,
      keywords: ['排查', '定位', '解决', '验证', '步骤', '测试', '边界', '异常'],
      quantifiableMetrics: ['解决时间', '成功率', '影响范围', '恢复时间']
    }
  },

  // -------------------------- 2. 成就导向维度 --------------------------
  {
    id: 'achievement_1',
    dimension: 'achievementInnovation',
    type: 'behavior',
    textTemplate: '请说说你过去工作中遇到的最有挑战性的任务，你当时面临的最大困难是什么？你具体做了什么？最终结果如何？',
    followUpTemplate: [
      '这个困难具体难在哪里？你是怎么拆解的？',
      '你迈出的第一步是什么？遇到阻力时你怎么克服的？',
      '最终的结果有没有量化的数据？有没有超出预期？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '说不出具体事例，描述空泛，没有具体行动',
        score5: '能说出基本事例，有具体行动，在他人帮助下完成任务，结果基本达标',
        score10: '事例具体，主动拆解问题，克服阻力独立/主导完成，结果有量化数据且超出预期'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['挑战', '困难', '主动', '克服', '主导', '负责', '推动', '完成'],
      quantifiableMetrics: ['超出预期', '提升', '%', '提前完成', '超额完成', '第一', '奖项']
    }
  },
  {
    id: 'achievement_2',
    dimension: 'achievementInnovation',
    type: 'behavior',
    textTemplate: '你有没有过主动承担超出你职责范围的工作的经历？为什么要承担？结果怎么样？',
    followUpTemplate: [
      '这件事本来不属于你，你为什么要接？',
      '你做了哪些额外的努力？',
      '最终给团队/公司带来了什么价值？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '没有相关经历，或者描述空泛，没有实际价值',
        score5: '有相关经历，完成了基本任务，带来了一定价值',
        score10: '主动承担，付出额外努力，带来了显著的量化价值，得到团队/公司认可'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['主动', '承担', '额外', '职责', '价值', '贡献', '认可'],
      quantifiableMetrics: ['效率提升', '成本降低', '收益增加', '表扬', '晋升', '奖项']
    }
  },

  // -------------------------- 3. 学习研究维度 --------------------------
  {
    id: 'learning_1',
    dimension: 'learningAbility',
    type: 'behavior',
    textTemplate: '最近半年你主动学习了哪些和{{jobPosition}}相关的新知识/技能？你是怎么学习的？有没有用到工作中？效果如何？',
    followUpTemplate: [
      '你为什么选择学习这些内容？学习路径是什么？',
      '你在工作中具体怎么用到这些知识的？',
      '带来了什么可量化的效果？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '说不出学习内容，或者学习内容和岗位无关，没有实际应用',
        score5: '能说出相关学习内容，有基本学习方法，在工作中有应用，带来一定效果',
        score10: '学习内容和岗位高度相关，学习路径清晰，在工作中落地应用，带来明确的量化效果'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['学习', '研究', '实践', '应用', '掌握', '深入', '新技能', '新知识'],
      quantifiableMetrics: ['提升', '优化', '效率', '解决了问题', '%', '产出']
    }
  },
  {
    id: 'learning_2',
    dimension: 'learningAbility',
    type: 'scenario',
    textTemplate: '如果现在需要你快速掌握一个你完全不熟悉的{{jobPosition}}相关新技术，要求2周内用到项目中，你会怎么安排学习计划？',
    followUpTemplate: [
      '你怎么判断哪些是核心知识点需要优先学习？',
      '怎么验证你已经掌握了可以用到项目中？',
      '如果遇到学习瓶颈你怎么解决？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '没有明确学习计划，思路混乱，不符合实际',
        score5: '有基本学习计划，能覆盖核心内容，基本可落地',
        score10: '学习计划清晰合理，优先级明确，有验证方法，可落地性强，考虑了风险应对'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['计划', '优先级', '实践', '验证', '请教', '文档', '教程', 'demo'],
      quantifiableMetrics: ['学习周期', '掌握程度', '落地时间', '项目影响']
    }
  },

  // -------------------------- 4. 开放创新维度 --------------------------
  {
    id: 'innovation_1',
    dimension: 'opennessInnovation',
    type: 'behavior',
    textTemplate: '你有没有主动优化过现有工作流程、技术方案或者业务规则的经历？你是怎么发现优化点的？优化后带来了什么效果？',
    followUpTemplate: [
      '你为什么觉得需要优化？当时的痛点是什么？',
      '你是怎么推动这个优化落地的？有没有遇到阻力？',
      '优化后有什么量化的效果？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '没有相关经历，或者优化没有实际效果',
        score5: '有相关经历，发现了基本痛点，优化落地后有一定效果',
        score10: '主动发现核心痛点，推动优化落地，带来显著的量化效果，被团队推广使用'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['优化', '改进', '创新', '效率', '痛点', '推动', '落地', '推广'],
      quantifiableMetrics: ['效率提升', '成本降低', '错误率下降', '满意度提升', '%', '收益']
    }
  },
  {
    id: 'innovation_2',
    dimension: 'opennessInnovation',
    type: 'scenario',
    textTemplate: '如果让你优化我们公司当前的{{jobPosition}}相关工作流程/产品，你会从哪里入手？预期能带来什么效果？',
    followUpTemplate: [
      '你为什么选择这个优化点？核心痛点是什么？',
      '你怎么推进这个优化落地？需要什么资源？',
      '怎么衡量优化是否成功？有没有量化指标？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '优化思路空泛，不符合实际，没有可落地性',
        score5: '优化思路基本合理，有一定价值，可落地性一般',
        score10: '优化思路清晰，直击核心痛点，可落地性强，有明确的量化预期效果'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['痛点', '优化', '价值', '落地', '资源', '衡量', 'ROI'],
      quantifiableMetrics: ['效率', '成本', '收益', '用户满意度', '%', '投入产出比']
    }
  },

  // -------------------------- 5. 压力承受维度 --------------------------
  {
    id: 'stress_1',
    dimension: 'stressResistance',
    type: 'behavior',
    textTemplate: '你过往工作中遇到的最大压力是什么情况？当时你是怎么应对的？最终结果如何？',
    followUpTemplate: [
      '压力来源是什么？你当时的情绪状态怎么样？',
      '你具体做了什么来缓解压力并推进工作？',
      '最终结果怎么样？有没有从中学到什么？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '没有相关经历，或者应对方式消极，结果不好，情绪失控',
        score5: '能描述压力场景，应对方式基本合理，情绪基本稳定，结果基本达标',
        score10: '压力场景具体，应对方式积极有效，情绪稳定，结果良好，有明确的成长收获'
      },
      contentWeight: 0.2,
      multimodalWeight: 0.8,
      keywords: ['压力', '应对', '调整', '优先级', '沟通', '解决', '冷静', '复盘'],
      quantifiableMetrics: ['按时完成', '结果达标', '团队评价', '个人成长']
    }
  },
  {
    id: 'stress_2',
    dimension: 'stressResistance',
    type: 'stress',
    textTemplate: '你刚才的回答有明显的错误，对这个知识点的理解不对，你怎么解释？',
    followUpTemplate: [
      '你确定你的回答是正确的吗？有没有什么依据？',
      '如果确实是你错了，你会怎么处理？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '情绪激动，反驳甩锅，拒不承认错误，逻辑混乱',
        score5: '情绪基本稳定，能接受批评，有基本的应对逻辑',
        score10: '情绪非常稳定，理性面对，能客观分析问题，有明确的改进/修正方案，不甩锅'
      },
      contentWeight: 0.2,
      multimodalWeight: 0.8,
      keywords: ['抱歉', '理解', '修正', '学习', '改进', '客观', '理性'],
      quantifiableMetrics: ['情绪稳定度', '反应时间', '逻辑连贯性']
    }
  },
  {
    id: 'stress_3',
    dimension: 'stressResistance',
    type: 'stress',
    textTemplate: '我们这个岗位经常需要加班，最高可能连续一周每天到12点，你能接受吗？',
    followUpTemplate: [
      '你对加班的看法是什么？',
      '如果长期高频加班你会怎么平衡工作和生活？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '直接拒绝，或者情绪抵触，回答逻辑混乱',
        score5: '能接受有限度的加班，有基本的平衡思路',
        score10: '理性看待加班，能接受必要的加班，有清晰的工作生活平衡方案，不极端'
      },
      contentWeight: 0.2,
      multimodalWeight: 0.8,
      keywords: ['理解', '必要', '效率', '平衡', '规划', '优先级'],
      quantifiableMetrics: ['情绪稳定度', '回答合理性', '接受度']
    }
  },

  // -------------------------- 6. 沟通协作维度 --------------------------
  {
    id: 'collaborationResponsibility_1',
    dimension: 'collaborationResponsibility',
    type: 'behavior',
    textTemplate: '你有没有过和领导/同事/客户意见不一致的经历？你们的分歧是什么？你是怎么说服对方的？最终结果如何？',
    followUpTemplate: [
      '你们的核心分歧点是什么？对方的顾虑是什么？',
      '你是怎么站在对方的角度思考问题的？用了什么方法说服？',
      '最终有没有达成共识？结果怎么样？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '没有相关经历，或者沟通方式不当，没有达成共识，关系恶化',
        score5: '能描述分歧场景，沟通方式基本合理，最终达成基本共识',
        score10: '分歧场景具体，能换位思考，沟通方式有效，最终达成共赢结果，双方都满意'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['沟通', '共识', '换位思考', '理解', '说服', '共赢', '协作'],
      quantifiableMetrics: ['达成共识', '项目结果', '对方满意度', '效率提升']
    }
  },
  {
    id: 'collaborationResponsibility_2',
    dimension: 'collaborationResponsibility',
    type: 'roleplay',
    textTemplate: '现在我是业务方，要求你在3天内完成一个原本需要10天才能完成的{{jobPosition}}相关需求，并且不接受延期，你怎么和我沟通？',
    followUpTemplate: [
      '如果我还是坚持必须3天完成，你怎么办？',
      '怎么平衡需求质量和交付时间？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '直接拒绝或者直接答应，沟通逻辑混乱，没有考虑实际情况',
        score5: '能说明难度，给出基本的解决方案，沟通思路基本清晰',
        score10: '沟通思路清晰，能换位思考，给出多种可选方案，平衡各方需求，达成共赢'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['理解', '优先级', '方案', '取舍', '质量', '风险', '共识'],
      quantifiableMetrics: ['沟通效果', '共识达成', '方案可行性', '对方满意度']
    }
  },

  // -------------------------- 新版2026维度 --------------------------
  // -------------------------- 1. 学习成长维度 --------------------------
  {
    id: 'learning_growth_1',
    dimension: 'learningGrowth',
    type: 'behavior',
    textTemplate: '过去1年里，你在{{jobPosition}}领域有哪些明显的能力提升？请具体说明你做了什么努力，以及这些提升带来了什么实际价值。',
    followUpTemplate: [
      '你是如何制定学习计划的？遇到了哪些困难？',
      '这些能力提升在哪些具体工作场景中得到了体现？',
      '接下来你还有哪些学习成长计划？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '无法说明能力提升，或者提升与岗位无关，没有实际价值',
        score5: '能说明基本的能力提升，有一定的学习行动，带来了一定价值',
        score10: '能力提升明确具体，学习行动有规划有执行，带来了显著的量化价值，未来计划清晰可行'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['学习', '成长', '提升', '实践', '复盘', '规划', '技能', '进步'],
      quantifiableMetrics: ['效率提升', '问题解决', '产出增加', '%', '项目贡献']
    }
  },
  {
    id: 'learning_growth_2',
    dimension: 'learningGrowth',
    type: 'scenario',
    textTemplate: '如果我们公司的{{jobPosition}}技术栈/业务模式发生了重大变化，你需要在1个月内完成知识切换以适应新要求，你会怎么做？',
    followUpTemplate: [
      '你会如何规划学习路径，优先掌握哪些内容？',
      '如何验证自己已经达到了上岗要求？',
      '如果遇到难点，你会通过哪些方式解决？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '没有明确的学习计划，思路混乱，不符合实际',
        score5: '有基本的学习计划，能覆盖核心内容，基本可落地',
        score10: '学习计划清晰合理，优先级明确，有验证方法，考虑了风险应对，可落地性强'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['规划', '优先级', '实践', '验证', '请教', '文档', '落地'],
      quantifiableMetrics: ['学习周期', '掌握程度', '落地时间', '项目影响']
    }
  },
  {
    id: 'learning_growth_3',
    dimension: 'learningGrowth',
    type: 'behavior',
    textTemplate: '请分享一个你从失败中学习成长的经历，当时发生了什么？你学到了什么？后续你是怎么应用这些经验的？',
    followUpTemplate: [
      '你当时的情绪是怎样的？如何从负面情绪中走出来？',
      '你总结了哪些关键经验教训？',
      '这些经验在后续的工作中带来了什么帮助？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '无法分享相关经历，或者不从自身找原因，甩锅，没有成长',
        score5: '能描述失败经历，能总结基本的经验，后续有一定的改进',
        score10: '经历具体，反思深刻，能总结出可复用的经验，后续应用带来了明确的正向结果'
      },
      contentWeight: 0.7,
      multimodalWeight: 0.3,
      keywords: ['失败', '反思', '总结', '经验', '改进', '成长', '应用'],
      quantifiableMetrics: ['错误率下降', '效率提升', '避免损失', '%']
    }
  },

  // -------------------------- 2. 沟通协作维度 --------------------------
  {
    id: 'communication_collaboration_1',
    dimension: 'communicationCollaboration',
    type: 'behavior',
    textTemplate: '请举例说明你参与的跨团队协作项目，你在其中扮演了什么角色？遇到了哪些沟通问题？你是怎么解决的？最终结果如何？',
    followUpTemplate: [
      '不同团队的核心利益诉求分别是什么？你是如何平衡的？',
      '遇到分歧时，你用了什么方法达成共识？',
      '这次协作有什么可以改进的地方？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '无法举例，或者沟通方式不当，导致协作失败，关系恶化',
        score5: '能描述协作场景，沟通方式基本合理，最终达成基本目标',
        score10: '场景具体，能换位思考，沟通方式有效，平衡各方利益，达成共赢结果，效率提升明显'
      },
      contentWeight: 0.6,
      multimodalWeight: 0.4,
      keywords: ['跨团队', '协作', '沟通', '共识', '换位思考', '共赢', '对齐'],
      quantifiableMetrics: ['项目交付时间', '满意度', '效率提升', '%', '产出']
    }
  },
  {
    id: 'communication_collaboration_2',
    dimension: 'communicationCollaboration',
    type: 'roleplay',
    textTemplate: '现在我是一个完全不懂技术的业务方，要求你用大白话给我解释{{jobPosition}}相关的一个复杂专业问题，让我能听懂。',
    followUpTemplate: [
      '如果我还是听不懂，你会换什么方式解释？',
      '你会如何确认我真的理解了你说的内容？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '解释不通，用太多专业术语，没有耐心，情绪不耐烦',
        score5: '能基本解释清楚，尽量避免专业术语，情绪基本稳定',
        score10: '解释生动易懂，不用专业术语，有耐心，会用例子/类比，能主动确认对方理解程度'
      },
      contentWeight: 0.6,
      multimodalWeight: 0.4,
      keywords: ['通俗易懂', '类比', '例子', '耐心', '确认', '共情'],
      quantifiableMetrics: ['理解程度', '沟通时间', '对方满意度']
    }
  },
  {
    id: 'communication_collaboration_3',
    dimension: 'communicationCollaboration',
    type: 'behavior',
    textTemplate: '你有没有过给团队成员分享知识/培训的经历？你是怎么准备的？效果如何？',
    followUpTemplate: [
      '你是如何根据受众的水平调整分享内容的？',
      '你通过什么方式评估分享效果？',
      '后续有没有根据反馈优化你的分享方式？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '没有相关经历，或者分享效果很差，大家听不懂',
        score5: '有相关经历，能完成分享，有一定效果',
        score10: '分享准备充分，内容符合受众水平，效果好，得到大家的认可，后续有优化'
      },
      contentWeight: 0.6,
      multimodalWeight: 0.4,
      keywords: ['分享', '培训', '准备', '受众', '反馈', '优化', '知识传递'],
      quantifiableMetrics: ['满意度', '掌握程度', '团队效率提升', '%']
    }
  },

  // -------------------------- 3. 问题解决维度 --------------------------
  {
    id: 'problem_solving_1',
    dimension: 'problemSolving',
    type: 'behavior',
    textTemplate: '请举例说明你过去遇到的最复杂的问题，你是怎么分析和解决的？最终结果如何？',
    followUpTemplate: [
      '你是如何拆解这个复杂问题的？核心矛盾是什么？',
      '你用到了哪些分析方法和工具？',
      '在解决过程中遇到了哪些阻碍？你是怎么克服的？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '无法举例，或者分析逻辑混乱，问题没有得到解决',
        score5: '能描述基本问题和解决思路，逻辑基本清晰，问题得到基本解决',
        score10: '问题描述清晰，分析思路严谨有逻辑，拆解合理，解决方案有效，结果超出预期'
      },
      contentWeight: 0.8,
      multimodalWeight: 0.2,
      keywords: ['拆解', '分析', '定位', '解决', '方案', '逻辑', '落地'],
      quantifiableMetrics: ['解决时间', '效果', '成本降低', '效率提升', '%']
    }
  },
  {
    id: 'problem_solving_2',
    dimension: 'problemSolving',
    type: 'scenario',
    textTemplate: '假如线上突然出现了一个严重的{{jobPosition}}相关问题，影响了大量用户，现在需要你在30分钟内给出解决方案，你会怎么做？',
    followUpTemplate: [
      '你的排查优先级是什么？首先会做什么？',
      '如果短时间内找不到根因，你会怎么处理？',
      '如何避免后续再出现类似问题？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '思路混乱，没有优先级，无法给出解决方案',
        score5: '有基本的排查思路，优先级基本合理，能给出临时解决方案',
        score10: '思路清晰，优先级明确，能快速给出止损方案，同时有根因分析和长效避免方案'
      },
      contentWeight: 0.8,
      multimodalWeight: 0.2,
      keywords: ['优先级', '止损', '排查', '定位', '解决', '复盘', '避免'],
      quantifiableMetrics: ['恢复时间', '影响范围', '故障率下降', '%']
    }
  },
  {
    id: 'problem_solving_3',
    dimension: 'problemSolving',
    type: 'practical',
    textTemplate: '现在有一个{{jobPosition}}相关的常见问题：{{problemContext}}，你会用什么思路和方法解决？',
    followUpTemplate: [
      '你为什么选择这个方案？优势是什么？',
      '如果这个方案不行，你有什么备选方案？',
      '如何验证解决方案的有效性？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '完全没有思路，解决方案错误',
        score5: '有基本的解决思路，方案基本可行',
        score10: '思路清晰，方案可行，考虑边界情况，有验证方法，有备选方案'
      },
      contentWeight: 0.8,
      multimodalWeight: 0.2,
      keywords: ['思路', '方案', '验证', '边界', '备选', '落地'],
      quantifiableMetrics: ['解决时间', '成功率', '成本']
    }
  },

  // -------------------------- 4. 成就执行维度 --------------------------
  {
    id: 'achievement_execution_1',
    dimension: 'achievementExecution',
    type: 'behavior',
    textTemplate: '请举例说明你负责的一个重点项目，你是怎么制定计划和推进执行的？最终达成了什么结果？',
    followUpTemplate: [
      '你是如何拆解目标，制定里程碑的？',
      '遇到延期风险时你是怎么应对的？',
      '最终结果有没有超出目标？超出/未达标的原因是什么？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '无法举例，或者项目执行失败，结果很差',
        score5: '能描述基本的项目计划和执行过程，结果基本达标',
        score10: '目标拆解清晰，里程碑合理，执行过程有管控，风险应对有效，结果超出预期，有量化数据'
      },
      contentWeight: 0.75,
      multimodalWeight: 0.25,
      keywords: ['目标', '拆解', '计划', '执行', '里程碑', '管控', '风险应对', '结果'],
      quantifiableMetrics: ['交付时间', '目标完成率', '超出预期', '%', '收益']
    }
  },
  {
    id: 'achievement_execution_2',
    dimension: 'achievementExecution',
    type: 'behavior',
    textTemplate: '你有没有过在资源不足（缺人/缺钱/缺时间）的情况下完成重要任务的经历？你是怎么做的？结果如何？',
    followUpTemplate: [
      '当时有哪些资源缺口？你是如何优先级排序的？',
      '你有没有争取到额外的资源？怎么争取的？',
      '最终结果怎么样？有没有什么可以优化的地方？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '没有相关经历，或者在资源不足时直接放弃，任务失败',
        score5: '有相关经历，能完成基本目标，有一定的资源协调能力',
        score10: '能在资源不足的情况下合理优先级，有效协调资源，超额完成目标，结果超出预期'
      },
      contentWeight: 0.75,
      multimodalWeight: 0.25,
      keywords: ['资源不足', '优先级', '协调', '争取', '克服困难', '结果'],
      quantifiableMetrics: ['完成率', '成本节约', '收益', '%']
    }
  },
  {
    id: 'achievement_execution_3',
    dimension: 'achievementExecution',
    type: 'scenario',
    textTemplate: '如果现在给你一个全新的{{jobPosition}}相关项目，没有任何前人经验可以参考，你会怎么从零到一推进落地？',
    followUpTemplate: [
      '你的第一步会做什么？核心里程碑有哪些？',
      '你会如何评估项目是否成功？',
      '遇到未知风险时你会怎么处理？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '没有思路，完全不知道从何入手',
        score5: '有基本的推进思路，里程碑基本合理',
        score10: '推进思路清晰，里程碑明确，有成功评估标准，有风险应对预案，可落地性强'
      },
      contentWeight: 0.75,
      multimodalWeight: 0.25,
      keywords: ['从零到一', '调研', '规划', '里程碑', '验证', '风险应对', '落地'],
      quantifiableMetrics: ['落地时间', '项目成功率', '收益', '%']
    }
  },

  // -------------------------- 5. 抗压韧性维度 --------------------------
  {
    id: 'stress_resilience_1',
    dimension: 'stressResilience',
    type: 'behavior',
    textTemplate: '请分享一个你承受巨大压力的经历，当时的压力来源是什么？你是怎么应对的？最终结果如何？',
    followUpTemplate: [
      '你当时的情绪状态是怎样的？如何调节？',
      '你用了哪些方法来保证工作不受影响？',
      '这次经历给你带来了什么成长？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '无法分享经历，或者应对方式消极，情绪失控，工作受严重影响',
        score5: '能描述压力场景，情绪基本稳定，能基本完成工作',
        score10: '场景具体，应对方式积极有效，情绪稳定，工作高质量完成，有明确的成长收获'
      },
      contentWeight: 0.2,
      multimodalWeight: 0.8,
      keywords: ['压力', '应对', '调节', '情绪稳定', '克服', '成长'],
      quantifiableMetrics: ['完成率', '情绪稳定度', '结果', '成长']
    }
  },
  {
    id: 'stress_resilience_2',
    dimension: 'stressResilience',
    type: 'stress',
    textTemplate: '我觉得你今天的面试表现很差，不符合我们的录用要求，你有什么想说的？',
    followUpTemplate: [
      '你觉得你今天的表现怎么样？哪些地方可以改进？',
      '如果我们真的不录用你，你会怎么做？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '情绪激动，反驳甩锅，或者情绪崩溃，无法正常回答',
        score5: '情绪基本稳定，能接受评价，有基本的反思',
        score10: '情绪非常稳定，理性客观，能正确看待评价，有清晰的改进计划，态度积极'
      },
      contentWeight: 0.2,
      multimodalWeight: 0.8,
      keywords: ['理性', '客观', '反思', '改进', '积极', '稳定'],
      quantifiableMetrics: ['情绪稳定度', '回答逻辑性', '态度']
    }
  },
  {
    id: 'stress_resilience_3',
    dimension: 'stressResilience',
    type: 'scenario',
    textTemplate: '假如你辛苦工作了几个月的项目，最终因为公司战略调整被砍掉了，所有付出都白费了，你会怎么处理？',
    followUpTemplate: [
      '你当时的第一反应是什么？如何调节情绪？',
      '你会从这次项目中收获什么？',
      '接下来你会怎么做？'
    ],
    scoringRubric: {
      weight: DEFAULT_WEIGHT,
      criteria: {
        score0: '情绪激动，抱怨公司，消极怠工，甚至离职',
        score5: '情绪基本稳定，能接受现实，继续完成后续工作',
        score10: '情绪稳定，能理性看待，从中总结经验，快速调整状态投入新的工作'
      },
      contentWeight: 0.2,
      multimodalWeight: 0.8,
      keywords: ['接受', '调整', '总结经验', '重新出发', '积极'],
      quantifiableMetrics: ['情绪稳定度', '调整时间', '后续工作表现']
    }
  }
];

// 岗位类型映射的专业题关键词
export const JOB_TYPE_PROFESSIONAL_KEYWORDS = {
  tech: ['代码', '架构', '性能', '算法', '数据库', '服务器', '前端', '后端', '运维', '测试'],
  product: ['需求', '用户', '体验', '迭代', ' roadmap', 'PRD', '原型', '数据分析', '竞品'],
  sales: ['客户', '业绩', '转化', '客单价', '复购', '渠道', '谈判', '回款', 'CRM'],
  management: ['团队', '目标', 'OKR', 'KPI', '考核', '招聘', '培养', '规划', '风险', '决策']
};
