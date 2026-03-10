import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/collect")({
  component: Collect,
});

function Collect() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCollect() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCollecting(true);
    } catch {
      setError("无法访问摄像头，请检查权限设置。");
    }
  }

  function stopCollect() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCollecting(false);
  }

  useEffect(() => {
    if (collecting && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [collecting]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800">采集视频</h1>

      {/* 控制按钮 */}
      <button
        onClick={collecting ? stopCollect : startCollect}
        className={`px-8 py-2.5 rounded-full text-sm font-semibold text-white transition-all shadow-md ${
          collecting
            ? "bg-red-500 hover:bg-red-600"
            : "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 hover:opacity-90"
        }`}
      >
        {collecting ? "结束采集" : "开始采集"}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* 摄像头画面 */}
      <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-inner flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${collecting ? "block" : "hidden"}`}
        />
        {!collecting && (
          <p className="text-gray-400 text-sm">点击「开始采集」以显示画面</p>
        )}
      </div>
    </div>
  );
}
