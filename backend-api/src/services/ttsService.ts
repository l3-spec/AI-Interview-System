import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { volcengineTtsService } from './volcengine';
import { ossService } from './ossService';
import { prisma } from '../lib/prisma';

/**
 * TTS (文本转语音) 服务
 * 支持多个 TTS 提供商：阿里云、Azure、百度、腾讯云
 */

interface TTSConfig {
  provider: string;
  voice: string;
  format: string;
  sampleRate: number;
}

interface TTSResult {
  success: boolean;
  audioPath?: string;
  audioUrl?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

interface TTSUsageRecord {
  provider: string;
  textLength: number;
  audioLength?: number;
  cost?: number;
  sessionId?: string;
  status: 'SUCCESS' | 'FAILED';
  errorMsg?: string;
}

export class TTSService {
  private provider: string;
  private uploadDir: string;
  private isEnabled: boolean;
  private mode: 'server' | 'client';

  constructor() {
    this.provider = process.env.TTS_PROVIDER || 'aliyun';
    this.mode = ['client', 'client-side'].includes(this.provider) ? 'client' : 'server';
    this.uploadDir = process.env.AUDIO_UPLOAD_DIR || 'uploads/audio';
    
    // 检查是否有TTS服务配置
    this.isEnabled = this.mode === 'server' ? this.checkTTSConfig() : false;
    
    // 确保上传目录存在
    this.ensureUploadDir();
    
    if (this.mode === 'client') {
      console.log('ℹ️  TTS服务配置为客户端模式，服务器将仅返回文本结果');
    } else if (!this.isEnabled) {
      console.warn('⚠️  TTS服务未配置，将使用模拟模式生成音频文件');
    } else {
      console.log(`✅ TTS服务已配置 (${this.provider})，将使用真实服务`);
    }
  }

  /**
   * 检查TTS配置
   */
  private checkTTSConfig(): boolean {
    switch (this.provider) {
      case 'index-tts2':
        return !!(process.env.INDEX_TTS2_API_URL && process.env.INDEX_TTS2_API_KEY);
      case 'aliyun':
        return !!(process.env.ALIYUN_TTS_ACCESS_KEY_ID && process.env.ALIYUN_TTS_ACCESS_KEY_SECRET);
      case 'azure':
        return !!(process.env.AZURE_TTS_KEY && process.env.AZURE_TTS_REGION);
      case 'baidu':
        return !!(process.env.BAIDU_TTS_APP_ID && process.env.BAIDU_TTS_API_KEY && process.env.BAIDU_TTS_SECRET_KEY);
      case 'volcengine':
        return !!process.env.VOLCENGINE_API_KEY;
      default:
        return false;
    }
  }

  /**
   * 确保上传目录存在
   */
  private ensureUploadDir(): void {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (error) {
      console.error('创建上传目录失败:', error);
    }
  }

  /**
   * 将音频文件上传到 OSS 并返回 URL
   */
  private async uploadAudioToOSS(filePath: string, fileName: string): Promise<string> {
    try {
      const objectKey = `temp/tts/${fileName}`;
      console.log(`正在上传音频到OSS: ${objectKey}`);
      // 音频文件使用主存储桶
      const result = await ossService.uploadLocalFile(filePath, objectKey, ossService.getBucketForType());
      console.log(`✅ 上传到OSS成功: ${result.url}`);
      return result.url;
    } catch (error) {
      console.error('上传音频到OSS失败，回退到本地URL:', error);
      return `/uploads/audio/${fileName}`;
    }
  }

  /**
   * 文本转语音 - 主方法
   */
  async textToSpeech(params: {
    text: string;
    sessionId?: string;
    questionIndex?: number;
    voice?: string;
  }): Promise<TTSResult> {
    const { text, sessionId, questionIndex, voice } = params;

    // 未配置服务端 TTS 时直接返回，避免每段文本都打「开始/失败」日志（Qwen3-TTS 流式仍由 WebSocket 侧负责）
    if (!this.isEnabled) {
      const hint =
        this.mode === 'client'
          ? 'TTS_PROVIDER 为 client 模式，服务端不合成语音'
          : '请配置 TTS_PROVIDER 及对应密钥（如 ALIYUN_TTS_ACCESS_KEY_ID / ALIYUN_TTS_ACCESS_KEY_SECRET）';
      return {
        success: false,
        error: `服务端 TTS 未启用：${hint}`,
      };
    }

    try {
      console.log(`开始TTS转换: ${text.substring(0, 50)}...`);

      let result: TTSResult;

      switch (this.provider) {
        case 'index-tts2':
          result = await this.indexTTS2TTS(text, voice);
          break;
        case 'aliyun':
          result = await this.aliyunTTS(text, voice);
          break;
        case 'azure':
          result = await this.azureTTS(text, voice);
          break;
        case 'baidu':
          result = await this.baiduTTS(text, voice);
          break;
        case 'volcengine':
          result = await this.volcengineTTS(text, voice);
          break;
        default:
          throw new Error(`不支持的TTS提供商: ${this.provider}`);
      }

      await this.recordUsage({
        provider: this.provider,
        textLength: text.length,
        audioLength: result.duration,
        sessionId,
        status: result.success ? 'SUCCESS' : 'FAILED',
        errorMsg: result.error,
      });

      if (result.success) {
        console.log('TTS转换成功');
      } else {
        console.warn(`TTS转换失败: ${result.error || '未知原因'}`);
      }
      return result;

    } catch (error) {
      console.error('TTS转换失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 阿里云 TTS (推荐)
   */
  private async aliyunTTS(text: string, voice?: string): Promise<TTSResult> {
    try {
      const accessKeyId = process.env.ALIYUN_TTS_ACCESS_KEY_ID;
      const accessKeySecret = process.env.ALIYUN_TTS_ACCESS_KEY_SECRET;
      const region = process.env.ALIYUN_TTS_REGION || 'cn-shanghai';
      const voiceName = voice || process.env.ALIYUN_TTS_VOICE || 'siqi';
      const format = process.env.ALIYUN_TTS_FORMAT || 'mp3';
      const sampleRate = process.env.ALIYUN_TTS_SAMPLE_RATE || '16000';

      if (!accessKeyId || !accessKeySecret) {
        return {
          success: false,
          error: '阿里云 TTS 未配置：请设置 ALIYUN_TTS_ACCESS_KEY_ID 与 ALIYUN_TTS_ACCESS_KEY_SECRET',
        };
      }

      const fileName = `tts_${uuidv4()}.${format}`;
      const filePath = path.join(this.uploadDir, fileName);

      try {
        const outcome = await this.callAliyunTTSAPI(
          text,
          voiceName,
          format,
          sampleRate,
          accessKeyId,
          accessKeySecret,
          region
        );

        if ('remoteUrl' in outcome && outcome.remoteUrl) {
          const duration = this.estimateAudioDuration(text);
          console.log(`✅ 阿里云TTS返回直链，跳过本地文件: ${outcome.remoteUrl}`);
          return {
            success: true,
            audioUrl: outcome.remoteUrl,
            duration,
            fileSize: 0,
          };
        }

        const audioData = outcome as Buffer;
        fs.writeFileSync(filePath, audioData);

        const stats = fs.statSync(filePath);
        const duration = this.estimateAudioDuration(text);

        console.log(`✅ 阿里云TTS转换成功: ${filePath}, 大小: ${Math.round(stats.size / 1024)}KB`);

        const audioUrl = await this.uploadAudioToOSS(filePath, fileName);

        return {
          success: true,
          audioPath: filePath,
          audioUrl: audioUrl,
          duration: duration,
          fileSize: stats.size,
        };
      } catch (apiError) {
        console.error('阿里云TTS API调用失败:', apiError);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch {
            // ignore
          }
        }
        return {
          success: false,
          error: apiError instanceof Error ? apiError.message : '阿里云 TTS 调用失败',
        };
      }

    } catch (error) {
      console.error('阿里云TTS转换失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Aliyun TTS error',
      };
    }
  }

  /**
   * 调用阿里云TTS API
   */
  /**
   * 阿里云语音合成。常规 NLS 返回二进制音频；若接口以 JSON 返回可下载临时 URL，则直接使用该 URL（不再经 OSS）。
   */
  private async callAliyunTTSAPI(
    text: string, 
    voice: string, 
    format: string, 
    sampleRate: string,
    accessKeyId: string,
    accessKeySecret: string,
    region: string
  ): Promise<Buffer | { remoteUrl: string }> {
    const endpoint = `https://nls-meta.${region}.aliyuncs.com`;
    const action = 'SynthesizeSpeech';
    const version = '2019-02-28';
    
    // 构建请求参数
    const commonParams = {
      'Action': action,
      'Version': version,
      'RegionId': region,
      'AccessKeyId': accessKeyId,
      'SignatureMethod': 'HMAC-SHA1',
      'SignatureVersion': '1.0',
      'SignatureNonce': uuidv4(),
      'Timestamp': new Date().toISOString(),
      'Format': 'JSON'
    };

    const requestParams: Record<string, string> = {
      ...commonParams,
      'Text': text,
      'Voice': voice,
      'AudioFormat': format,
      'SampleRate': sampleRate,
      'Volume': '50',
      'SpeechRate': '0'
    };

    // 生成签名
    const signature = this.generateAliyunSignature(requestParams, accessKeySecret, 'POST');
    requestParams['Signature'] = signature;

    // 发送请求
    const response = await axios.post(endpoint, null, {
      params: requestParams,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // 检查响应
    if (response.status !== 200) {
      throw new Error(`阿里云TTS API请求失败: ${response.status}`);
    }

    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const json = JSON.parse(Buffer.from(response.data).toString()) as Record<string, unknown>;
      const errMsg = (json.Message || json.message || json.Code) as string | undefined;
      if (errMsg && !json.Url && !json.url && !json.AudioUrl && !json.audioUrl) {
        throw new Error(`阿里云TTS API错误: ${errMsg}`);
      }
      const rawUrl =
        (json.Url || json.url || json.AudioUrl || json.audioUrl || json.Data) as string | undefined;
      if (typeof rawUrl === 'string' && /^https?:\/\//i.test(rawUrl.trim())) {
        return { remoteUrl: rawUrl.trim() };
      }
      throw new Error(`阿里云TTS API错误: ${errMsg || '未知错误'}`);
    }

    return Buffer.from(response.data);
  }

  /**
   * 生成阿里云API签名
   */
  private generateAliyunSignature(params: Record<string, string>, accessKeySecret: string, method: string = 'GET'): string {
    // 1. 对参数进行排序
    const sortedKeys = Object.keys(params).sort();
    
    // 2. 构建规范化查询字符串
    const canonicalQueryString = sortedKeys
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
      .join('&');
    
    // 3. 构建待签名字符串
    const stringToSign = `${method}&${this.percentEncode('/')}&${this.percentEncode(canonicalQueryString)}`;
    
    // 4. 计算签名
    const signature = crypto
      .createHmac('sha1', `${accessKeySecret}&`)
      .update(stringToSign)
      .digest('base64');
    
    return signature;
  }

  /**
   * URL编码（符合阿里云规范）
   */
  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  /**
   * Azure TTS (备用方案)
   */
  private async azureTTS(text: string, voice?: string): Promise<TTSResult> {
    try {
      const subscriptionKey = process.env.AZURE_TTS_KEY;
      const region = process.env.AZURE_TTS_REGION || 'eastus';
      const voiceName = voice || process.env.AZURE_TTS_VOICE || 'zh-CN-XiaoxiaoNeural';

      if (!subscriptionKey) {
        throw new Error('Azure TTS配置缺失');
      }

      // 获取访问令牌
      const tokenResponse = await axios.post(
        `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`,
        null,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
          },
        }
      );

      const accessToken = tokenResponse.data;

      // 构建SSML
      const ssml = `
        <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>
          <voice name='${voiceName}'>
            ${text}
          </voice>
        </speak>
      `;

      // 调用TTS API
      const ttsResponse = await axios.post(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          },
          responseType: 'arraybuffer',
        }
      );

      const fileName = `tts_${uuidv4()}.mp3`;
      const filePath = path.join(this.uploadDir, fileName);

      fs.writeFileSync(filePath, ttsResponse.data);

      const stats = fs.statSync(filePath);
      const duration = this.estimateAudioDuration(text);

      return {
        success: true,
        audioPath: filePath,
        audioUrl: await this.uploadAudioToOSS(filePath, fileName),
        duration: duration,
        fileSize: stats.size,
      };

    } catch (error) {
      console.error('Azure TTS转换失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Azure TTS error',
      };
    }
  }

  /**
   * IndexTTS2 TTS (推荐用于数字人)
   */
  private async indexTTS2TTS(text: string, voice?: string): Promise<TTSResult> {
    const apiUrl = (process.env.INDEX_TTS2_API_URL || '').trim();
    const apiKey = (process.env.INDEX_TTS2_API_KEY || '').trim();

    if (!apiUrl || !apiKey) {
      return {
        success: false,
        error: 'IndexTTS2 未配置：请设置 INDEX_TTS2_API_URL 与 INDEX_TTS2_API_KEY',
      };
    }

    const endpoint = apiUrl.replace(/\/$/, '');
    const voiceName = voice || process.env.INDEX_TTS2_VOICE || 'zh-CN-female-pro';
    const format = (process.env.INDEX_TTS2_FORMAT || 'mp3').toLowerCase();
    const sampleRate = parseInt(process.env.INDEX_TTS2_SAMPLE_RATE || '24000', 10);
    const speed = parseFloat(process.env.INDEX_TTS2_SPEED || '1');
    const emotion = process.env.INDEX_TTS2_EMOTION;
    const timeout = parseInt(process.env.INDEX_TTS2_TIMEOUT || '60000', 10);

    const fileName = `tts_${uuidv4()}.${format}`;
    const filePath = path.join(this.uploadDir, fileName);

    try {
      const payload: Record<string, unknown> = {
        text,
        voice: voiceName,
        format,
        sample_rate: sampleRate,
        speed,
      };

      if (emotion) {
        payload.emotion = emotion;
      }

      const lexicons = process.env.INDEX_TTS2_LEXICONS;
      if (lexicons) {
        payload.lexicons = lexicons
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
      }

      const response = await axios.post(`${endpoint}/v1/tts`, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout,
      });

      fs.writeFileSync(filePath, response.data);
      const stats = fs.statSync(filePath);
      const duration = this.estimateAudioDuration(text);

      // 上传到 OSS
      const audioUrl = await this.uploadAudioToOSS(filePath, fileName);

      return {
        success: true,
        audioPath: filePath,
        audioUrl: audioUrl,
        duration,
        fileSize: stats.size,
      };
    } catch (error) {
      console.error('IndexTTS2 语音合成失败:', error);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (_) {
          // ignore
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IndexTTS2 合成失败',
      };
    }
  }

  /**
   * 百度 TTS (备用方案)
   */
  private async baiduTTS(text: string, voice?: string): Promise<TTSResult> {
    try {
      const appId = process.env.BAIDU_TTS_APP_ID;
      const apiKey = process.env.BAIDU_TTS_API_KEY;
      const secretKey = process.env.BAIDU_TTS_SECRET_KEY;

      if (!appId || !apiKey || !secretKey) {
        throw new Error('百度TTS配置缺失');
      }

      // 获取访问令牌
      const tokenResponse = await axios.post(
        'https://aip.baidubce.com/oauth/2.0/token',
        null,
        {
          params: {
            grant_type: 'client_credentials',
            client_id: apiKey,
            client_secret: secretKey,
          },
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // 调用TTS API
      const ttsResponse = await axios.post(
        'https://tsn.baidu.com/text2audio',
        null,
        {
          params: {
            tex: text,
            tok: accessToken,
            cuid: uuidv4(),
            ctp: 1,
            lan: 'zh',
            spd: 5, // 语速
            pit: 5, // 音调
            vol: 5, // 音量
            per: 1, // 发音人选择
          },
          responseType: 'arraybuffer',
        }
      );

      const fileName = `tts_${uuidv4()}.mp3`;
      const filePath = path.join(this.uploadDir, fileName);

      fs.writeFileSync(filePath, ttsResponse.data);

      const stats = fs.statSync(filePath);
      const duration = this.estimateAudioDuration(text);

      return {
        success: true,
        audioPath: filePath,
        audioUrl: await this.uploadAudioToOSS(filePath, fileName),
        duration: duration,
        fileSize: stats.size,
      };

    } catch (error) {
      console.error('百度TTS转换失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Baidu TTS error',
      };
    }
  }

  /**
   * 估算音频时长（基于文本长度）
   */
  private estimateAudioDuration(text: string): number {
    // 根据中文语音特点，大约每分钟200-250字
    const wordsPerMinute = 220;
    const textLength = text.length;
    const durationMinutes = textLength / wordsPerMinute;
    return Math.max(1, Math.round(durationMinutes * 60)); // 返回秒数，最少1秒
  }

  /**
   * 批量转换文本为语音
   */
  async batchTextToSpeech(params: {
    texts: string[];
    sessionId?: string;
    voice?: string;
  }): Promise<TTSResult[]> {
    const { texts, sessionId, voice } = params;
    const results: TTSResult[] = [];

    for (let i = 0; i < texts.length; i++) {
      const result = await this.textToSpeech({
        text: texts[i],
        sessionId,
        questionIndex: i,
        voice,
      });
      results.push(result);

      // 添加短暂延迟避免API限流
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * 删除音频文件
   */
  async deleteAudioFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`删除音频文件: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除音频文件失败:', error);
      return false;
    }
  }

  /**
   * 火山引擎 TTS
   */
  private async volcengineTTS(text: string, voice?: string): Promise<TTSResult> {
    try {
      const result = await volcengineTtsService.synthesize({
        text,
        voice,
        saveToFile: true,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || '火山引擎 TTS 合成失败',
        };
      }

      // 上传到 OSS
      if (!result.audioPath) {
        throw new Error('火山引擎TTS合成成功但未返回音频路径');
      }
      const fileName = path.basename(result.audioPath);
      const audioUrl = await this.uploadAudioToOSS(result.audioPath, fileName);

      return {
        success: true,
        audioPath: result.audioPath,
        audioUrl: audioUrl,
        duration: result.duration,
        fileSize: result.fileSize,
      };
    } catch (error) {
      console.error('火山引擎TTS转换失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '火山引擎 TTS 异常',
      };
    }
  }

  /**
   * 获取支持的语音列表
   */
  getSupportedVoices(): { [provider: string]: string[] } {
    return {
      'index-tts2': [
        'zh-CN-female-pro',
        'zh-CN-male-pro',
        'zh-CN-female-general',
        'zh-CN-male-general'
      ],
      aliyun: ['siqi', 'xiaoyun', 'xiaogang', 'ruoxi', 'xiaowei'],
      azure: [
        'zh-CN-XiaoxiaoNeural',
        'zh-CN-YunxiNeural',
        'zh-CN-YunjianNeural',
        'zh-CN-XiaoyiNeural',
        'zh-CN-YunyangNeural'
      ],
      baidu: ['度小宇', '度小美', '度逍遥', '度丫丫'],
      volcengine: [
        'zh_female_qingxin',
        'zh_female_wanrou',
        'zh_female_tianmei',
        'zh_female_zhiyin',
        'zh_male_chunhou',
        'zh_male_zhuangzhong'
      ],
    };
  }

  /**
   * 记录TTS使用情况
   */
  private async recordUsage(record: TTSUsageRecord): Promise<void> {
    try {
      await prisma.tTSUsageRecord.create({
        data: {
          provider: record.provider,
          textLength: record.textLength,
          audioLength: record.audioLength,
          cost: record.cost,
          sessionId: record.sessionId,
          status: record.status,
          errorMsg: record.errorMsg,
        },
      });
    } catch (error) {
      console.error('记录TTS使用情况失败:', error);
    }
  }

  getMode(): 'server' | 'client' {
    return this.mode;
  }
}

export const ttsService = new TTSService(); 
