import React, { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export const PoseTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLyingDown, setIsLyingDown] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let poseLandmarker: PoseLandmarker | null = null;
    let animationFrameId: number;
    let lastFrameTime = performance.now();

    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });

      setIsModelLoaded(true);
      startWebcam();
    };

    const startWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            renderLoop();
          };
        }
      }
    };

    const renderLoop = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      setFps(Math.round(1000 / delta));
      lastFrameTime = now;

      if (videoRef.current && canvasRef.current && poseLandmarker) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const startTimeMs = performance.now();
          const results = poseLandmarker.detectForVideo(video, startTimeMs);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const drawingUtils = new DrawingUtils(ctx);

          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];

            // Vẽ khung xương 33 điểm
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
              color: '#00FF00',
              lineWidth: 4
            });
            drawingUtils.drawLandmarks(landmarks, {
              color: '#FF0000',
              lineWidth: 2,
              radius: 5
            });

            // Phân tích tư thế Nằm vs Đứng
            const nose = landmarks[0];
            const leftHip = landmarks[23];
            const rightHip = landmarks[24];
            
            const midHipY = (leftHip.y + rightHip.y) / 2;
            const midHipX = (leftHip.x + rightHip.x) / 2;

            const deltaX = Math.abs(nose.x - midHipX);
            const deltaY = Math.abs(nose.y - midHipY);
            
            setIsLyingDown(deltaX > deltaY);
          }
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    initMediaPipe();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '960px', margin: '0 auto' }}>
      {!isModelLoaded && <h3 style={{ color: '#fff' }}>Đang tải mô hình AI Vision...</h3>}
      
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 10,
        background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '10px 15px',
        borderRadius: '8px', fontFamily: 'monospace'
      }}>
        <p>FPS: {fps}</p>
        <p>Trạng thái: <strong style={{ color: isLyingDown ? '#FF5555' : '#55FF55' }}>
          {isLyingDown ? 'NẰM NGỬA / BẤT TỈNH' : 'ĐỨNG / NGỒI'}
        </strong></p>
      </div>

      <video ref={videoRef} style={{ display: 'none' }} playsInline />
      <canvas ref={canvasRef} style={{ width: '100%', borderRadius: '12px', background: '#111' }} />
    </div>
  );
};