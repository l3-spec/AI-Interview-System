import { qwen3TTSClient } from './qwen3-tts-service-client';
import { deepseekService } from './deepseekService';

/**
 * 面试指挥官服务 (Interview Conductor)
 *
 * 核心职责：
 *   1. 调度 LLM（DeepSeek）生成面试官回复
 *   2. 从回复中提取/推断 TTS 情感指令
 *   3. 将文本 + 情感指令发送到 Qwen3-TTS 微服务进行流式合成
 *   4. 音频通过 TTS 微服务的 WebSocket 直推客户端
 *
 * LLM 输出格式约定：
 *   LLM 返回的每段回复可以包含情感标注 [emotion:xxx]
 *   例如: "[emotion:温和鼓励]您的项目经验非常丰富。[emotion:严肃追问]不过我想深入了解一下..."
 *   如果 LLM 没有返回标注，系统会根据文本语义自动推断情感
 */

/** 情感场景到 Qwen3-TTS instruct 指令的映射 */
const EMOTION_INSTRUCTIONS: Record<string, string> = {
  // 标准面试官情感
  'opening':       '语气温和而专业，带有欢迎感，像一位经验丰富的面试官在做开场，节奏适中偏慢。',
  'question':      '语气沉稳严肃，吐字清晰有力，像一位资深面试官在提出考察性问题，保持公正客观的距离感。',
  'follow_up':     '语气略带探究和追问感，沉稳中带一丝紧迫，像面试官在追问细节，语速稍快。',
  'encouragement': '语气温和且肯定，带有适度的赞许，但保持面试官的专业克制，不过分热情。',
  'transition':    '语气平稳过渡，自然衔接，像面试官在切换话题，节奏适中。',
  'closing':       '语气温和但正式，带有总结感，像面试官在做结束语，语速稍慢，给人从容感。',
  'clarification': '语气耐心且引导性，像面试官在帮助候选人理解问题，保持专业。',
  'challenge':     '语气坚定沉稳，略带质疑但不失礼貌，像面试官在做压力测试，节奏偏慢有力。',

  // LLM 标注对应
  '温和鼓励':  '语气温和肯定，带有适度赞许，保持面试官专业克制。',
  '严肃追问':  '语气沉稳严肃，略带追问感，像面试官在深入考察。',
  '专业提问':  '语气沉稳有力，吐字清晰，保持公正客观。',
  '耐心引导':  '语气耐心温和，有引导性，帮助候选人展开回答。',
  '正式总结':  '语气正式沉稳，带有总结感，语速稍慢从容。',
  '压力测试':  '语气坚定有力，略带质疑但保持礼貌。',
  '中性过渡':  '语气平稳自然，衔接顺畅。',
};

/** 默认面试官情感（未匹配到特定场景时） */
const DEFAULT_INSTRUCTION = '语气专业沉稳，公正严肃但不失礼貌，像一位经验丰富的面试官，节奏适中。';

/** 从 LLM 回复中解析情感标注段落 */
interface EmotionSegment {
  text: string;
  emotion: string;
  instruction: string;
}

/**
 * 面试场景枚举
 */
export type InterviewScene =
  | 'opening'
  | 'question'
  | 'follow_up'
  | 'encouragement'
  | 'transition'
  | 'closing'
  | 'clarification'
  | 'challenge';

class InterviewConductorService {

  /**
   * 生成面试官回复（带情感标注）
   * 替代原来的 deepseekService.generateResponse，输出包含 TTS 情感指令
   */
  async generateInterviewerResponse(params: {
    userMessage: string;
    sessionId: string;
    scene?: InterviewScene;
    context?: {
      jobPosition?: string;
      currentQuestion?: string;
      roundNumber?: number;
      totalRounds?: number;
    };
  }): Promise<{ text: string; segments: EmotionSegment[]; rawLLMOutput: string }> {
    const { userMessage, sessionId, scene, context } = params;
    const jobPosition = context?.jobPosition || '该职位';

    const systemPrompt = this.buildEmotionAwarePrompt(jobPosition, scene, context);

    let rawOutput: string;
    try {
      rawOutput = await deepseekService.generateResponse({
        userMessage,
        sessionId,
        context: { jobPosition },
        systemPromptOverride: systemPrompt,
      });
    } catch (err: any) {
      console.error(`[Conductor] LLM 调用失败: ${err.message}`);
      rawOutput = '抱歉，我没有听清楚，请您再说一遍。';
    }

    const segments = this.parseEmotionSegments(rawOutput, scene);
    const cleanText = segments.map(s => s.text).join('');

    return { text: cleanText, segments, rawLLMOutput: rawOutput };
  }

  /**
   * 将面试官回复发送到 Qwen3-TTS 进行流式合成
   * TTS 音频会通过 TTS 微服务的 WebSocket 直接推送给客户端
   *
   * @param sessionId TTS 会话 ID（客户端已与 TTS 服务建立 WebSocket 连接）
   * @param segments 带情感标注的文本段落
   */
  async synthesizeWithEmotion(
    sessionId: string,
    segments: EmotionSegment[]
  ): Promise<void> {
    for (const segment of segments) {
      // 通过 Redis 发送合成指令到 TTS 微服务
      // TTS 微服务会使用 segment.instruction 作为 Qwen3-TTS 的 instructions 参数
      qwen3TTSClient.synthesize(sessionId, segment.text, false);
    }
  }

  /**
   * 一站式：LLM 生成 + TTS 流式合成
   * 调用后，客户端会通过 TTS WebSocket 收到音频流
   *
   * @returns 纯文本内容（用于字幕显示和记录）
   */
  async generateAndSpeak(params: {
    userMessage: string;
    sessionId: string;
    ttsSessionId: string;
    scene?: InterviewScene;
    context?: {
      jobPosition?: string;
      currentQuestion?: string;
      roundNumber?: number;
      totalRounds?: number;
    };
  }): Promise<{ text: string; segments: EmotionSegment[] }> {
    const { ttsSessionId, ...llmParams } = params;

    const result = await this.generateInterviewerResponse(llmParams);

    // 异步发送到 TTS（不阻塞返回）
    this.synthesizeWithEmotion(ttsSessionId, result.segments).catch(err => {
      console.error(`[Conductor] TTS 合成失败: ${err.message}`);
    });

    return { text: result.text, segments: result.segments };
  }

  /**
   * 为单段文本生成 TTS 情感指令
   * 用于 createInterviewRounds 等预生成场景
   */
  getEmotionInstruction(scene: InterviewScene, text?: string): string {
    const base = EMOTION_INSTRUCTIONS[scene] || DEFAULT_INSTRUCTION;
    return base;
  }

  /**
   * 根据文本内容自动推断面试场景
   */
  inferScene(text: string, context?: { isFollowUp?: boolean; isLast?: boolean }): InterviewScene {
    if (context?.isLast) return 'closing';
    if (context?.isFollowUp) return 'follow_up';

    const lower = text.toLowerCase();

    if (/欢迎|你好|开始.*面试|自我介绍/.test(lower)) return 'opening';
    if (/感谢.*参加|面试.*结束|到此结束|祝您/.test(lower)) return 'closing';
    if (/不错|很好|非常好|优秀|出色/.test(lower)) return 'encouragement';
    if (/能.*详细|具体.*说说|举个例子|为什么.*这样/.test(lower)) return 'follow_up';
    if (/接下来|下一个|换个话题|我们聊聊/.test(lower)) return 'transition';
    if (/请.*解释|你确定|你.*怎么看|如果.*失败/.test(lower)) return 'challenge';
    if (/请问|你能|请.*描述|请.*分享/.test(lower)) return 'question';

    return 'question';
  }

  /**
   * 构建包含情感标注引导的 LLM System Prompt
   */
  private buildEmotionAwarePrompt(
    jobPosition: string,
    scene?: InterviewScene,
    context?: { roundNumber?: number; totalRounds?: number; currentQuestion?: string }
  ): string {
    const roundInfo = context?.roundNumber && context?.totalRounds
      ? `当前是第${context.roundNumber}/${context.totalRounds}题。`
      : '';

    return `你是一位专业、公正且严肃的AI面试官，正在面试【${jobPosition}】的候选人。${roundInfo}

【核心人设 — 不可违反】
- 你是面试官（提问方），候选人是应聘者（回答方）
- 保持公正严肃的专业形象，像一位有10年经验的HR总监
- 你的评价要客观公正，不随意夸赞也不无端打击
- 每次回复控制在2-4句话，保持对话节奏

【情感标注规则】
在回复中，你可以用 [emotion:标签] 来标记语气变化，帮助语音合成更加自然：
- [emotion:专业提问] — 提出新问题时
- [emotion:严肃追问] — 追问细节时
- [emotion:温和鼓励] — 肯定好的回答时（保持克制）
- [emotion:耐心引导] — 引导候选人展开时
- [emotion:压力测试] — 做压力面试时
- [emotion:中性过渡] — 切换话题时

示例回复格式：
"[emotion:温和鼓励]您关于微服务架构的理解很到位。[emotion:严肃追问]不过在实际项目中，当服务数量超过50个时，您是如何处理服务间的依赖管理和故障隔离的？"

注意：标签是可选的，如果某段话情感明确可以不标注。保持自然，不要每句都标注。

【面试结束检测】
如果候选人明确表示结束意图（"面试结束"、"我答完了"等），用 [emotion:正式总结] 开头回复。`;
  }

  /**
   * 从 LLM 输出中解析情感标注段落
   * 输入: "[emotion:温和鼓励]很好。[emotion:严肃追问]请详细说说..."
   * 输出: [{ text: "很好。", emotion: "温和鼓励", instruction: "..." }, ...]
   */
  private parseEmotionSegments(text: string, fallbackScene?: InterviewScene): EmotionSegment[] {
    const segments: EmotionSegment[] = [];
    const regex = /\[emotion:([^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // 标注之前的文本
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index).trim();
        if (beforeText) {
          const scene = fallbackScene || this.inferScene(beforeText);
          segments.push({
            text: beforeText,
            emotion: scene,
            instruction: EMOTION_INSTRUCTIONS[scene] || DEFAULT_INSTRUCTION,
          });
        }
      }

      const emotionLabel = match[1].trim();
      lastIndex = regex.lastIndex;

      // 找到下一个标注或文本末尾
      const nextMatch = regex.exec(text);
      const endPos = nextMatch ? nextMatch.index : text.length;
      regex.lastIndex = nextMatch ? nextMatch.index : text.length;

      const segmentText = text.substring(lastIndex, endPos).trim();
      if (segmentText) {
        segments.push({
          text: segmentText,
          emotion: emotionLabel,
          instruction: EMOTION_INSTRUCTIONS[emotionLabel] || DEFAULT_INSTRUCTION,
        });
      }

      lastIndex = endPos;

      // 如果找到了下一个 match，回退以便外层循环再次匹配
      if (nextMatch) {
        regex.lastIndex = nextMatch.index;
      }
    }

    // 剩余没有标注的文本
    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex).trim();
      if (remaining) {
        const scene = fallbackScene || this.inferScene(remaining);
        segments.push({
          text: remaining,
          emotion: scene,
          instruction: EMOTION_INSTRUCTIONS[scene] || DEFAULT_INSTRUCTION,
        });
      }
    }

    // 如果完全没解析出来（LLM 没用标注格式），整段按场景处理
    if (segments.length === 0 && text.trim()) {
      const scene = fallbackScene || this.inferScene(text);
      segments.push({
        text: text.trim(),
        emotion: scene,
        instruction: EMOTION_INSTRUCTIONS[scene] || DEFAULT_INSTRUCTION,
      });
    }

    return segments;
  }
}

export const interviewConductor = new InterviewConductorService();
