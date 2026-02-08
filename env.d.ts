/// <reference types="next" />
/// <reference types="next/image-types/global" />

// ============================================
// 环境变量类型定义
// ============================================

namespace NodeJS {
  interface ProcessEnv {
    // ------------------------------------------
    // 应用基础配置
    // ------------------------------------------
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly PORT: string;
    readonly NEXT_PUBLIC_APP_URL: string;

    // ------------------------------------------
    // Gemini 3 API 配置
    // ------------------------------------------
    readonly GEMINI_API_KEY?: string;
    readonly YUNWU_API_ENDPOINT?: string;
    readonly YUNWU_API_KEY?: string;
    readonly GEMINI_MODEL?: string;
    readonly GEMINI_TEMPERATURE?: string;
    readonly GEMINI_MAX_TOKENS?: string;
    readonly GEMINI_VIDEO_MAX_DURATION_SECONDS?: string;
    readonly GEMINI_VIDEO_SAMPLE_FRAME_COUNT?: string;

    // ------------------------------------------
    // ElevenLabs API 配置
    // ------------------------------------------
    readonly ELEVENLABS_API_KEY?: string;
    readonly ELEVENLABS_API_ENDPOINT?: string;
    readonly ELEVENLABS_DEFAULT_VOICE?: string;
    readonly ELEVENLABS_DEFAULT_MODEL?: string;
    readonly ELEVENLABS_OUTPUT_FORMAT?: string;
    readonly ELEVENLABS_STABILITY?: string;
    readonly ELEVENLABS_SIMILARITY_BOOST?: string;

    // ------------------------------------------
    // 数据库配置
    // ------------------------------------------
    readonly DATABASE_URL: string;

    // ------------------------------------------
    // 文件存储路径配置
    // ------------------------------------------
    readonly UPLOAD_DIR: string;
    readonly RAW_ASSETS_DIR: string;
    readonly PROCESSED_DIR: string;
    readonly OUTPUT_DIR: string;
    readonly TEMP_DIR: string;

    // ------------------------------------------
    // FFmpeg 配置
    // ------------------------------------------
    readonly FFMPEG_PATH?: string;
    readonly FFPROBE_PATH?: string;
    readonly DEFAULT_VIDEO_FPS?: string;
    readonly DEFAULT_VIDEO_CRF?: string;
    readonly DEFAULT_VIDEO_PRESET?: string;
    readonly DEFAULT_AUDIO_BITRATE?: string;

    // ------------------------------------------
    // 任务队列配置
    // ------------------------------------------
    readonly REDIS_HOST?: string;
    readonly REDIS_PORT?: string;
    readonly REDIS_PASSWORD?: string;
    readonly REDIS_DB?: string;
    readonly MAX_CONCURRENT_JOBS?: string;
    readonly JOB_RETRY_ATTEMPTS?: string;
    readonly JOB_RETRY_DELAY?: string;

    // ------------------------------------------
    // WebSocket 配置
    // ------------------------------------------
    readonly WS_PORT?: string;
    readonly WS_HEARTBEAT_INTERVAL?: string;

    // ------------------------------------------
    // 日志配置
    // ------------------------------------------
    readonly LOG_LEVEL: string;
    readonly LOG_DIR: string;
    readonly LOG_MAX_FILES?: string;
    readonly LOG_MAX_SIZE?: string;

    // ------------------------------------------
    // 安全配置
    // ------------------------------------------
    readonly JWT_SECRET: string;
    readonly RATE_LIMIT_MAX_REQUESTS?: string;
    readonly RATE_LIMIT_WINDOW_MS?: string;

    // ------------------------------------------
    // 第三方服务（可选）
    // ------------------------------------------
    readonly ALIYUN_OSS_ENABLED?: string;
    readonly ALIYUN_OSS_REGION?: string;
    readonly ALIYUN_OSS_ACCESS_KEY_ID?: string;
    readonly ALIYUN_OSS_ACCESS_KEY_SECRET?: string;
    readonly ALIYUN_OSS_BUCKET?: string;
    readonly CDN_ENABLED?: string;
    readonly CDN_DOMAIN?: string;

    // ------------------------------------------
    // 开发工具配置
    // ------------------------------------------
    readonly DEV_HOT_RELOAD?: string;
    readonly DEBUG?: string;
    readonly REMOTION_STUDIO_PORT?: string;
  }
}
