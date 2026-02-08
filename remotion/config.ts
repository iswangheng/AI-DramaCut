/**
 * Remotion 配置
 * 定义视频渲染的全局设置
 *
 * 注意：Remotion 4.0+ 的配置方式已更改
 * 大部分配置应该在 Composition 级别设置
 */

import { Config } from "@remotion/cli/config";

// 设置输出格式为 JPEG
Config.setVideoImageFormat("jpeg");

// 覆盖已存在的输出文件
Config.setOverwriteOutput(true);

// 注意：以下配置在 Remotion 4.0+ 中已移除或更改
// - setOutputDir: 在渲染时指定输出目录
// - setLogLevel: 使用环境变量 REMOTION_LOG_LEVEL
// - setFps: 在 Composition 定义时设置
