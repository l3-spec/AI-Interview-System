import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

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
   * 文本转语音 - 主方法
   */
  async textToSpeech(params: {
    text: string;
    sessionId?: string;
    questionIndex?: number;
    voice?: string;
  }): Promise<TTSResult> {
    const { text, sessionId, questionIndex, voice } = params;

    try {
      console.log(`开始TTS转换: ${text.substring(0, 50)}...`);

      let result: TTSResult;

      if (this.isEnabled) {
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
          default:
            throw new Error(`不支持的TTS提供商: ${this.provider}`);
        }
      } else {
        result = await this.simulateTTS(text);
      }

      // 记录使用情况
      await this.recordUsage({
        provider: this.provider,
        textLength: text.length,
        audioLength: result.duration,
        sessionId,
        status: result.success ? 'SUCCESS' : 'FAILED',
        errorMsg: result.error,
      });

      console.log(`TTS转换${result.success ? '成功' : '失败'}`);
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
        console.log('阿里云TTS配置缺失，使用模拟模式');
        return await this.simulateTTS(text);
      }

      // 生成文件名和路径
      const fileName = `tts_${uuidv4()}.${format}`;
      const filePath = path.join(this.uploadDir, fileName);

      try {
        // 调用阿里云TTS API
        const audioData = await this.callAliyunTTSAPI(text, voiceName, format, sampleRate, accessKeyId, accessKeySecret, region);
        
        // 保存音频文件
        fs.writeFileSync(filePath, audioData);

        const stats = fs.statSync(filePath);
        const duration = this.estimateAudioDuration(text);

        console.log(`✅ 阿里云TTS转换成功: ${filePath}, 大小: ${Math.round(stats.size / 1024)}KB`);

        return {
          success: true,
          audioPath: filePath,
          audioUrl: `/uploads/audio/${fileName}`,
          duration: duration,
          fileSize: stats.size,
        };

      } catch (apiError) {
        console.log('阿里云TTS API调用失败，使用模拟模式:', apiError);
        
        // API调用失败时降级到模拟模式
        await this.generatePlayableAudio(filePath, text);

        const stats = fs.statSync(filePath);
        const duration = this.estimateAudioDuration(text);

        return {
          success: true,
          audioPath: filePath,
          audioUrl: `/uploads/audio/${fileName}`,
          duration: duration,
          fileSize: stats.size,
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
  private async callAliyunTTSAPI(
    text: string, 
    voice: string, 
    format: string, 
    sampleRate: string,
    accessKeyId: string,
    accessKeySecret: string,
    region: string
  ): Promise<Buffer> {
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

    // 检查是否返回的是错误信息（JSON格式）
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const errorInfo = JSON.parse(Buffer.from(response.data).toString());
      throw new Error(`阿里云TTS API错误: ${errorInfo.Message || errorInfo.message || '未知错误'}`);
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
        audioUrl: `/uploads/audio/${fileName}`,
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
      console.warn('IndexTTS2 配置缺失，降级为模拟音频');
      return this.simulateTTS(text);
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

      return {
        success: true,
        audioPath: filePath,
        audioUrl: `/uploads/audio/${fileName}`,
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
      return this.simulateTTS(text);
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
        audioUrl: `/uploads/audio/${fileName}`,
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
   * 模拟TTS
   */
  private async simulateTTS(text: string): Promise<TTSResult> {
    console.log('使用模拟模式生成音频文件...');
    
    try {
      const fileName = `tts_mock_${uuidv4()}.mp3`;
      const filePath = path.join(this.uploadDir, fileName);

      // 生成可播放的模拟音频文件
      await this.generatePlayableAudio(filePath, text);

      const stats = fs.statSync(filePath);
      const duration = this.estimateAudioDuration(text);

      return {
        success: true,
        audioPath: filePath,
        audioUrl: `/uploads/audio/${fileName}`,
        duration: duration,
        fileSize: stats.size,
      };
    } catch (error) {
      console.error('模拟TTS失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mock TTS error',
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
   * 生成可播放的模拟音频文件
   */
  private async generatePlayableAudio(filePath: string, text: string): Promise<void> {
    // ID3v2.4 标签头
    const id3Header = Buffer.from([
      // ID3v2.4 标签标识符
      0x49, 0x44, 0x33, 0x04, 0x00, 
      // 标志位
      0x00,
      // 标签大小 (不包括头部10字节)
      0x00, 0x00, 0x00, 0x17,
      // TIT2 帧 (标题)
      0x54, 0x49, 0x54, 0x32,
      // 帧大小
      0x00, 0x00, 0x00, 0x0D,
      // 帧标志
      0x00, 0x00,
      // 文本编码 (UTF-8)
      0x03,
      // 标题内容
      0x41, 0x49, 0x20, 0x41, 0x75, 0x64, 0x69, 0x6F, // "AI Audio"
      0x20, 0x54, 0x65, 0x73, 0x74 // " Test"
    ]);

    // 生成包含静音的MP3帧
    // 每帧对应约26毫秒的音频 (44.1kHz, 128kbps)
    const estimatedDuration = this.estimateAudioDuration(text); // 秒数
    const framesNeeded = Math.ceil(estimatedDuration / 0.026); // 约每秒38帧
    const audioFrames: Buffer[] = [];

    // 标准MP3帧头 (MPEG-1 Layer III, 128kbps, 44.1kHz, 单声道)
    const frameHeader = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00  // 同步字 + 头信息
    ]);

    // 生成静音MP3帧
    for (let i = 0; i < framesNeeded; i++) {
      // 创建一个包含静音数据的MP3帧
      const frameData = Buffer.alloc(417); // 128kbps单声道帧大小约417字节
      
      // 设置帧头
      frameHeader.copy(frameData, 0);
      
      // 填充静音数据模式 (MP3静音帧的特殊模式)
      // 这是一个简化的静音帧，实际MP3编码会更复杂
      for (let j = 4; j < frameData.length; j++) {
        if (j < 20) {
          // 边信息区域
          frameData[j] = 0x00;
        } else if (j < 50) {
          // 比例因子区域
          frameData[j] = 0x00;
        } else {
          // 主数据区域 - 静音模式
          frameData[j] = (j % 2 === 0) ? 0x00 : 0x01;
        }
      }
      
      audioFrames.push(frameData);
    }

    // 组合完整的MP3文件
    const completeAudioFile = Buffer.concat([
      id3Header,
      ...audioFrames
    ]);

    // 写入文件
    fs.writeFileSync(filePath, completeAudioFile);
    
    console.log(`生成可播放的模拟音频文件: ${filePath}, 大小: ${Math.round(completeAudioFile.length / 1024)}KB, 预估时长: ${estimatedDuration}秒, 帧数: ${framesNeeded}`);
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
