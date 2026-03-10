use std::sync::Mutex;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use image::codecs::jpeg::JpegEncoder;
use image::ColorType;
use nokhwa::pixel_format::RgbFormat;
use nokhwa::utils::{
    CameraFormat, CameraIndex, FrameFormat, RequestedFormat, RequestedFormatType, Resolution,
};
use nokhwa::Camera;
use tauri::{AppHandle, Emitter, State};

struct CameraState {
    stop_tx: Arc<Mutex<Option<std::sync::mpsc::Sender<()>>>>,
}

#[tauri::command]
fn start_camera_stream(app: AppHandle, state: State<'_, CameraState>) -> Result<(), String> {
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
        let request_candidates = [
            RequestedFormatType::Closest(CameraFormat::new(
                Resolution::new(1920, 1080),
                FrameFormat::MJPEG,
                30,
            )),
            RequestedFormatType::Closest(CameraFormat::new(
                Resolution::new(1280, 720),
                FrameFormat::MJPEG,
                30,
            )),
            RequestedFormatType::Closest(CameraFormat::new(
                Resolution::new(1280, 720),
                FrameFormat::YUYV,
                30,
            )),
            RequestedFormatType::HighestFrameRate(30),
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

        loop {
            if stop_rx.try_recv().is_ok() {
                break;
            }

            match camera.frame() {
                Ok(frame) => {
                    let rgb = match frame.decode_image::<RgbFormat>() {
                        Ok(image) => image,
                        Err(e) => {
                            let _ = app.emit("camera-error", format!("解码视频帧失败: {e}"));
                            continue;
                        }
                    };
                    let mut encoded = Vec::new();
                    let mut encoder = JpegEncoder::new_with_quality(&mut encoded, 92);
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
                    let payload = BASE64.encode(encoded);
                    let _ = app.emit("camera-frame", payload);
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
