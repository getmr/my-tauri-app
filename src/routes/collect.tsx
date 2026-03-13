import { createFileRoute } from "@tanstack/react-router";
import { Channel, invoke } from "@tauri-apps/api/core";
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
  const currentFrameRef = useRef<string | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const frameChannelRef = useRef<Channel<ArrayBuffer> | null>(null);

  function revokeUrl(url: string | null) {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  function clearFrameState() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    revokeUrl(pendingFrameRef.current);
    revokeUrl(currentFrameRef.current);
    pendingFrameRef.current = null;
    currentFrameRef.current = null;
    if (imageRef.current) {
      imageRef.current.src = "";
    }
  }

  async function startCollect() {
    setError(null);
    try {
      clearFrameState();
      const frameChannel = new Channel<ArrayBuffer>((payload) => {
        const nextUrl = URL.createObjectURL(new Blob([payload], { type: "image/jpeg" }));
        revokeUrl(pendingFrameRef.current);
        pendingFrameRef.current = nextUrl;
        if (rafIdRef.current !== null) {
          return;
        }
        rafIdRef.current = requestAnimationFrame(() => {
          if (imageRef.current && pendingFrameRef.current) {
            imageRef.current.src = pendingFrameRef.current;
            revokeUrl(currentFrameRef.current);
            currentFrameRef.current = pendingFrameRef.current;
            setError(null);
          }
          pendingFrameRef.current = null;
          rafIdRef.current = null;
        });
      });
      frameChannelRef.current = frameChannel;
      await invoke("start_camera_stream", { onFrame: frameChannel });
      setCollecting(true);
    } catch (e) {
      frameChannelRef.current = null;
      clearFrameState();
      setError(`无法启动后台摄像头: ${String(e)}`);
    }
  }

  async function stopCollect() {
    await invoke("stop_camera_stream");
    frameChannelRef.current = null;
    clearFrameState();
    setCollecting(false);
  }

  useEffect(() => {
    let unlistenError: UnlistenFn | null = null;

    const bindEvents = async () => {
      unlistenError = await listen<string>("camera-error", (event) => {
        setError(event.payload);
      });
    };
    void bindEvents();

    return () => {
      if (unlistenError) {
        unlistenError();
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      frameChannelRef.current = null;
      clearFrameState();
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
