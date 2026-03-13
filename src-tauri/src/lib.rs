use std::sync::Mutex;
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use image::codecs::jpeg::JpegEncoder;
use image::ColorType;
use nokhwa::pixel_format::RgbFormat;
use nokhwa::utils::{
    CameraFormat, CameraIndex, FrameFormat, RequestedFormat, RequestedFormatType, Resolution,
};
use nokhwa::Camera;
use tauri::ipc::{Channel, Response};
use tauri::{AppHandle, Emitter, State};

struct CameraState {
    stop_tx: Arc<Mutex<Option<std::sync::mpsc::Sender<()>>>>,
}

#[tauri::command]
fn start_camera_stream(
    app: AppHandle,
    state: State<'_, CameraState>,
    on_frame: Channel<Response>,
) -> Result<(), String> {
    stop_camera_stream(state.clone())?;

    let (stop_tx, stop_rx) = std::sync::mpsc::channel::<()>();
    {
        let mut guard = state
            .stop_tx
            .lock()
            .map_err(|_| "无法访问摄像头状态".to_string())?;
        *guard = Some(stop_tx);
    }

    thread::spawn(move || {
        const TARGET_FPS: u32 = 15;
        const FRAME_INTERVAL: Duration = Duration::from_millis(1000 / TARGET_FPS as u64);

        let request_candidates = [
            RequestedFormatType::Closest(CameraFormat::new(
                Resolution::new(640, 480),
                FrameFormat::MJPEG,
                30,
            )),
            RequestedFormatType::Closest(CameraFormat::new(
                Resolution::new(1280, 720),
                FrameFormat::MJPEG,
                24,
            )),
            RequestedFormatType::Closest(CameraFormat::new(
                Resolution::new(640, 480),
                FrameFormat::YUYV,
                30,
            )),
            RequestedFormatType::HighestFrameRate(TARGET_FPS),
            RequestedFormatType::AbsoluteHighestFrameRate,
            RequestedFormatType::None,
        ];

        let mut open_errors = Vec::new();
        let mut maybe_camera = None;

        for requested_type in request_candidates {
            let requested = RequestedFormat::new::<RgbFormat>(requested_type);
            match Camera::new(CameraIndex::Index(0), requested) {
                Ok(mut camera) => match camera.open_stream() {
                    Ok(()) => {
                        maybe_camera = Some(camera);
                        break;
                    }
                    Err(e) => open_errors.push(format!("{requested_type}: {e}")),
                },
                Err(e) => open_errors.push(format!("{requested_type}: {e}")),
            }
        }

        let mut camera = match maybe_camera {
            Some(camera) => camera,
            None => {
                let _ = app.emit(
                    "camera-error",
                    format!("打开摄像头失败，所有格式尝试均失败: {}", open_errors.join(" | ")),
                );
                return;
            }
        };

        let selected_format = camera.camera_format();
        let selected_frame_format = selected_format.format();
        let mut last_emit_at: Option<Instant> = None;

        loop {
            if stop_rx.try_recv().is_ok() {
                break;
            }

            match camera.frame() {
                Ok(frame) => {
                    let now = Instant::now();
                    if let Some(last_emit) = last_emit_at {
                        if now.duration_since(last_emit) < FRAME_INTERVAL {
                            continue;
                        }
                    }
                    last_emit_at = Some(now);

                    let payload = if selected_frame_format == FrameFormat::MJPEG {
                        frame.buffer().to_vec()
                    } else {
                        let rgb = match frame.decode_image::<RgbFormat>() {
                            Ok(image) => image,
                            Err(e) => {
                                let _ = app.emit("camera-error", format!("解码视频帧失败: {e}"));
                                continue;
                            }
                        };

                        let mut encoded =
                            Vec::with_capacity((rgb.width() * rgb.height() / 4) as usize);
                        let mut encoder = JpegEncoder::new_with_quality(&mut encoded, 80);
                        if encoder
                            .encode(
                                rgb.as_raw(),
                                rgb.width(),
                                rgb.height(),
                                ColorType::Rgb8.into(),
                            )
                            .is_err()
                        {
                            let _ = app.emit("camera-error", "编码视频帧失败");
                            continue;
                        }

                        encoded
                    };

                    let _ = on_frame.send(Response::new(payload));
                }
                Err(e) => {
                    let _ = app.emit("camera-error", format!("读取摄像头帧失败: {e}"));
                    thread::sleep(Duration::from_millis(100));
                }
            }
        }

        let _ = camera.stop_stream();
    });

    Ok(())
}

#[tauri::command]
fn stop_camera_stream(state: State<'_, CameraState>) -> Result<(), String> {
    let sender = {
        let mut guard = state
            .stop_tx
            .lock()
            .map_err(|_| "无法访问摄像头状态".to_string())?;
        guard.take()
    };

    if let Some(tx) = sender {
        let _ = tx.send(());
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CameraState {
            stop_tx: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_camera_stream,
            stop_camera_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
