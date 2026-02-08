/**
 * Remotion Root 组件
 * 定义所有的 Composition
 */

import { Composition } from "remotion";
import { CaptionedVideo, calculateCaptionedVideoMetadata, captionedVideoSchema } from "../components/remotion/subtitles";
import { MultiClipComposition, calculateMultiClipMetadata, multiClipCompositionSchema } from "../components/remotion/MultiClipComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 字幕视频 Composition */}
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo as any}
        calculateMetadata={calculateCaptionedVideoMetadata}
        schema={captionedVideoSchema}
        defaultProps={{
          src: "",
          subtitles: [],
          fontSize: 60,
          fontColor: "white",
          highlightColor: "#FFE600",  // 抖音爆款黄色
          outlineColor: "black",
          outlineSize: 5,
          subtitleY: 80,
          originalVolume: 1,
          subtitleBgEnabled: false,
          watermarkUrl: null,
        }}
        width={1080}
        height={1920}
        fps={30}
      />

      {/* 多片段组合 Composition */}
      <Composition
        id="MultiClipComposition"
        component={MultiClipComposition as any}
        calculateMetadata={calculateMultiClipMetadata}
        schema={multiClipCompositionSchema}
        defaultProps={{
          clips: [],
          transition: "none",
          transitionDurationMs: 500,
          fontSize: 60,
          fontColor: "white",
          highlightColor: "#FFE600",
          outlineColor: "black",
          outlineSize: 5,
          subtitleY: 80,
          watermarkUrl: null,
        }}
        width={1080}
        height={1920}
        fps={30}
      />
    </>
  );
};
