import { createFileRoute } from "@tanstack/react-router";
import { Channel, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/collect")({
  component: Collect,
});

type HoverInfo = {
  displayX: number;
  displayY: number;
  pixelX: number;
  pixelY: number;
  r: number;
  g: number;
  b: number;
};

function Collect() {
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const frameChannelRef = useRef<Channel<ArrayBuffer> | null>(null);
  const pendingBitmapRef = useRef<ImageBitmap | null>(null);
  const videoSizeRef = useRef({ width: 0, height: 0 });
  const lastPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

  function closeBitmap(bitmap: ImageBitmap | null) {
    bitmap?.close();
  }

  function samplePixelAt(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      setHoverInfo(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setHoverInfo(null);
      return;
    }

    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;
    const clampedX = Math.min(Math.max(relativeX, 0), 0.999999);
    const clampedY = Math.min(Math.max(relativeY, 0), 0.999999);
    const pixelX = Math.floor(clampedX * canvas.width);
    const pixelY = Math.floor(clampedY * canvas.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      setHoverInfo(null);
      return;
    }

    const pixel = context.getImageData(pixelX, pixelY, 1, 1).data;
    setHoverInfo({
      displayX: clientX - rect.left,
      displayY: clientY - rect.top,
      pixelX,
      pixelY,
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
    });
  }

  function drawPendingFrame() {
    const canvas = canvasRef.current;
    const bitmap = pendingBitmapRef.current;
    if (!canvas || !bitmap) {
      rafIdRef.current = null;
      return;
    }

    pendingBitmapRef.current = null;
    const context = canvas.getContext("2d");
    if (!context) {
      closeBitmap(bitmap);
      rafIdRef.current = null;
      return;
    }

    if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    videoSizeRef.current = { width: bitmap.width, height: bitmap.height };
    closeBitmap(bitmap);

    if (lastPointerRef.current) {
      samplePixelAt(lastPointerRef.current.clientX, lastPointerRef.current.clientY);
    }

    rafIdRef.current = null;
  }

  function scheduleDraw() {
    if (rafIdRef.current !== null) {
      return;
    }
    rafIdRef.current = requestAnimationFrame(drawPendingFrame);
  }

  function clearFrameState() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    closeBitmap(pendingBitmapRef.current);
    pendingBitmapRef.current = null;
    videoSizeRef.current = { width: 0, height: 0 };
    lastPointerRef.current = null;
    setHoverInfo(null);

    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  async function startCollect() {
    setError(null);
    try {
      clearFrameState();
      const frameChannel = new Channel<ArrayBuffer>((payload) => {
        const blob = new Blob([payload], { type: "image/jpeg" });
        void createImageBitmap(blob)
          .then((bitmap) => {
            closeBitmap(pendingBitmapRef.current);
            pendingBitmapRef.current = bitmap;
            scheduleDraw();
            setError(null);
          })
          .catch((bitmapError) => {
            setError(`解码视频帧失败: ${String(bitmapError)}`);
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
      void invoke("stop_camera_stream");
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800">采集视频</h1>

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

      <div className="w-full max-w-2xl">
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-inner relative flex items-center justify-center">
          {collecting ? (
            <>
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
                onMouseMove={(event) => {
                  lastPointerRef.current = {
                    clientX: event.clientX,
                    clientY: event.clientY,
                  };
                  samplePixelAt(event.clientX, event.clientY);
                }}
                onMouseLeave={() => {
                  lastPointerRef.current = null;
                  setHoverInfo(null);
                }}
              />
              {hoverInfo && (
                <>
                  <div
                    className="absolute inset-y-0 w-px bg-lime-400/90 pointer-events-none"
                    style={{ left: `${hoverInfo.displayX}px` }}
                  />
                  <div
                    className="absolute inset-x-0 h-px bg-lime-400/90 pointer-events-none"
                    style={{ top: `${hoverInfo.displayY}px` }}
                  />
                  <div className="absolute left-3 top-3 pointer-events-none rounded-lg bg-black/70 px-3 py-2 text-xs text-white backdrop-blur-sm">
                    <p>
                      坐标: ({hoverInfo.pixelX}, {hoverInfo.pixelY}) / {videoSizeRef.current.width} x{" "}
                      {videoSizeRef.current.height}
                    </p>
                    <p>
                      RGB: ({hoverInfo.r}, {hoverInfo.g}, {hoverInfo.b})
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm">点击「开始采集」以显示画面</p>
          )}
        </div>
      </div>
    </div>
  );
}
