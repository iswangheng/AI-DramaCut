/**
 * Remotion Root 组件
 * 定义所有的 Composition
 */

import { Composition } from "remotion";
import { CaptionedVideo, calculateCaptionedVideoMetadata, captionedVideoSchema } from "../components/remotion/subtitles";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 字幕视频 Composition */}
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
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
    </>
  );
};
