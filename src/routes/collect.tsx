import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/collect")({
  component: Collect,
});

function Collect() {
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pendingFrameRef = useRef<string | null>(null);
  const rafIdRef = useRef<number | null>(null);

  async function startCollect() {
    setError(null);
    try {
      await invoke("start_camera_stream");
      setCollecting(true);
    } catch (e) {
      setError(`无法启动后台摄像头: ${String(e)}`);
    }
  }

  async function stopCollect() {
    await invoke("stop_camera_stream");
    if (imageRef.current) {
      imageRef.current.src = "";
    }
    setCollecting(false);
  }

  useEffect(() => {
    let unlistenFrame: UnlistenFn | null = null;
    let unlistenError: UnlistenFn | null = null;

    const bindEvents = async () => {
      unlistenFrame = await listen<string>("camera-frame", (event) => {
        pendingFrameRef.current = `data:image/jpeg;base64,${event.payload}`;
        if (rafIdRef.current !== null) {
          return;
        }
        rafIdRef.current = requestAnimationFrame(() => {
          if (imageRef.current && pendingFrameRef.current) {
            imageRef.current.src = pendingFrameRef.current;
            setError(null);
          }
          pendingFrameRef.current = null;
          rafIdRef.current = null;
        });
      });
      unlistenError = await listen<string>("camera-error", (event) => {
        setError(event.payload);
      });
    };
    void bindEvents();

    return () => {
      if (unlistenFrame) {
        unlistenFrame();
      }
      if (unlistenError) {
        unlistenError();
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      invoke("stop_camera_stream");
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
        {collecting && (
          <img ref={imageRef} alt="摄像头视频流" className="w-full h-full object-cover" />
        )}
        {!collecting && (
          <p className="text-gray-400 text-sm">点击「开始采集」以显示画面</p>
        )}
      </div>
    </div>
  );
}
