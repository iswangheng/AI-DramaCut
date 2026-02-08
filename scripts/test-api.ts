// ============================================
// API 配置测试脚本
// 用于验证 Gemini 和 ElevenLabs API 是否配置正确
// ============================================

// 加载环境变量
import dotenv from 'dotenv';
import path from 'path';

// 加载 .env.local 文件
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('⚠️  警告: 无法加载 .env.local 文件:', result.error.message);
  console.log('   将使用系统环境变量或默认值\n');
} else {
  console.log('✅ 已加载 .env.local 文件\n');
}

// ============================================
// 测试结果接口
// ============================================
interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

// ============================================
// 测试函数
// ============================================

/**
 * 测试配置加载
 */
function testConfig(config: any): TestResult {
  try {
    return {
      name: '配置加载',
      success: true,
      message: '✅ 配置加载成功',
      data: {
        env: config.env,
        debug: config.debug,
        logLevel: config.logLevel,
        yunwuEndpoint: process.env.YUNWU_API_ENDPOINT,
        hasYunwuKey: !!process.env.YUNWU_API_KEY,
        hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
      },
    };
  } catch (error) {
    return {
      name: '配置加载',
      success: false,
      message: '❌ 配置加载失败',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 测试 Gemini API 连接
 */
async function testGeminiApi(geminiClient: any): Promise<TestResult> {
  try {
    console.log('  → 正在测试 Gemini API 连接...');

    // 发送一个简单的测试请求
    const response = await geminiClient.callApi(
      '请用一句话介绍你自己。',
      '你是一个 AI 助手。'
    );

    if (response.success) {
      return {
        name: 'Gemini API',
        success: true,
        message: '✅ Gemini API 连接成功',
        data: {
          usage: response.usage,
          preview: (response.data as string)?.substring(0, 100) + '...',
        },
      };
    } else {
      return {
        name: 'Gemini API',
        success: false,
        message: '❌ Gemini API 连接失败',
        error: response.error,
      };
    }
  } catch (error) {
    return {
      name: 'Gemini API',
      success: false,
      message: '❌ Gemini API 测试异常',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 测试 ElevenLabs API 连接
 */
async function testElevenLabsApi(elevenlabsClient: any): Promise<TestResult> {
  try {
    console.log('  → 正在测试 ElevenLabs API 连接...');

    // 获取可用的语音列表
    const response = await elevenlabsClient.getVoices();

    if (response.success && response.data) {
      const voices = response.data as any;
      const voiceList = voices.voices || voices;
      return {
        name: 'ElevenLabs API',
        success: true,
        message: '✅ ElevenLabs API 连接成功',
        data: {
          voiceCount: Array.isArray(voiceList) ? voiceList.length : 0,
          preview: Array.isArray(voiceList)
            ? voiceList.slice(0, 3).map((v: any) => v.name)
            : [],
        },
      };
    } else {
      return {
        name: 'ElevenLabs API',
        success: false,
        message: '❌ ElevenLabs API 连接失败',
        error: response.error,
      };
    }
  } catch (error) {
    return {
      name: 'ElevenLabs API',
      success: false,
      message: '❌ ElevenLabs API 测试异常',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 测试 ElevenLabs TTS 生成（如果 API Key 可用）
 */
async function testElevenLabsTTS(elevenlabsClient: any): Promise<TestResult> {
  try {
    // 检查是否有 ElevenLabs API Key
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY === 'your-elevenlabs-api-key-here') {
      return {
        name: 'ElevenLabs TTS',
        success: false,
        message: '⚠️  跳过 ElevenLabs TTS 测试（未配置 API Key）',
      };
    }

    console.log('  → 正在测试 ElevenLabs TTS 生成...');

    const response = await elevenlabsClient.textToSpeech({
      text: '你好，这是一个测试。',
    });

    if (response.success && response.data) {
      return {
        name: 'ElevenLabs TTS',
        success: true,
        message: '✅ ElevenLabs TTS 生成成功',
        data: {
          duration: response.data.durationMs,
          format: response.data.format,
          sampleRate: response.data.sampleRate,
          wordCount: response.data.wordTimestamps.length,
        },
      };
    } else {
      return {
        name: 'ElevenLabs TTS',
        success: false,
        message: '❌ ElevenLabs TTS 生成失败',
        error: response.error,
      };
    }
  } catch (error) {
    return {
      name: 'ElevenLabs TTS',
      success: false,
      message: '❌ ElevenLabs TTS 测试异常',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// ============================================
// 主测试流程
// ============================================
async function runTests(): Promise<void> {
  console.log('\n🧪 DramaGen AI API 配置测试\n');
  console.log('='.repeat(60));

  // 动态导入模块
  const { geminiClient, elevenlabsClient, config } = await importModules();

  const results: TestResult[] = [];

  // 测试 1: 配置加载
  console.log('\n📋 测试 1: 配置加载');
  results.push(testConfig(config));

  // 测试 2: Gemini API
  console.log('\n📋 测试 2: Gemini API 连接');
  results.push(await testGeminiApi(geminiClient));

  // 测试 3: ElevenLabs API
  console.log('\n📋 测试 3: ElevenLabs API 连接');
  results.push(await testElevenLabsApi(elevenlabsClient));

  // 测试 4: ElevenLabs TTS
  console.log('\n📋 测试 4: ElevenLabs TTS 生成');
  results.push(await testElevenLabsTTS(elevenlabsClient));

  // ============================================
  // 输出测试结果
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 测试结果汇总\n');

  let successCount = 0;
  let failCount = 0;

  results.forEach((result) => {
    console.log(`${result.message}`);
    if (result.data) {
      console.log(`  数据: ${JSON.stringify(result.data, null, 2).split('\n').join('\n  ')}`);
    }
    if (result.error) {
      console.log(`  错误: ${result.error}`);
    }
    console.log();

    if (result.success) {
      successCount++;
    } else if (result.message.includes('跳过')) {
      // 跳过的测试不计入失败
    } else {
      failCount++;
    }
  });

  console.log('='.repeat(60));
  console.log(`\n✅ 成功: ${successCount} | ❌ 失败: ${failCount}\n`);

  // 提供配置建议
  if (failCount > 0) {
    console.log('🔧 配置建议:\n');

    if (!process.env.YUNWU_API_KEY) {
      console.log('  1. 请在 .env.local 中配置 YUNWU_API_KEY');
    }

    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY === 'your-elevenlabs-api-key-here') {
      console.log('  2. 请在 .env.local 中配置 ELEVENLABS_API_KEY');
      console.log('     获取地址: https://elevenlabs.io\n');
    }
  }
}

// 动态导入配置模块（在环境变量加载之后）
async function importModules() {
  const { geminiClient } = await import('../lib/api/gemini');
  const { elevenlabsClient } = await import('../lib/api/elevenlabs');
  const { config } = await import('../lib/config');

  return { geminiClient, elevenlabsClient, config };
}

// 运行测试
runTests().catch((error) => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
