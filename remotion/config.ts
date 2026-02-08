/**
 * Remotion 配置
 * 定义视频渲染的全局设置
 */

import { Config } from "@remotion/cli/config";

// 设置输出格式为 JPEG
Config.setVideoImageFormat("jpeg");

// 覆盖已存在的输出文件
Config.setOverwriteOutput(true);

// 设置默认帧率
Config.setFps(30);

// 设置默认输出目录
Config.setOutputDir("./out");

// 设置日志级别
Config.setLogLevel("info");
