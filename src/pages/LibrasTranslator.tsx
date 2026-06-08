import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  ArrowLeft,
  AlertCircle,
  Clock,
  Loader2,
  Info,
  Trash2,
} from 'lucide-react';
import {
  FrameBuffer,
  extractLandmarks,
  runInference,
  classifySignal,
  speakSignal,
  loadModelAssets,
  SIGNAL_EMOJIS,
  NUM_FRAMES,
  type ModelAssets,
  type PredictionResult,
} from '../lib/libras';
import { cn, formatPercent, formatTime } from '../lib/utils';

// MediaPipe types
declare global {
  interface Window {
    Pose: any;
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
  }
}

export default function LibrasTranslator() {
  const navigate = useNavigate();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameBufferRef = useRef(new FrameBuffer());
  const modelAssetsRef = useRef<ModelAssets | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const poseRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastPredictionTimeRef = useRef<number>(0);
  const isProcessingRef = useRef(false);

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);
  const [fps, setFps] = useState(0);
  const [bufferProgress, setBufferProgress] = useState(0);

  // FPS tracking
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });

  // ---- Load MediaPipe via CDN ----
  useEffect(() => {
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
    ];

    let loadedCount = 0;

    scripts.forEach((src) => {
      // Skip if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        loadedCount++;
        if (loadedCount === scripts.length) setMediaPipeLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        loadedCount++;
        if (loadedCount === scripts.length) {
          setMediaPipeLoaded(true);
        }
      };
      script.onerror = () => {
        setError('Falha ao carregar MediaPipe. Verifique sua conexão com a internet.');
      };
      document.head.appendChild(script);
    });
  }, []);

  // ---- Load Model ----
  useEffect(() => {
    async function loadModel() {
      try {
        const assets = await loadModelAssets();
        modelAssetsRef.current = assets;
        setModelLoaded(true);
      } catch (err) {
        console.error('Erro ao carregar modelo:', err);
        setError(
          'Falha ao carregar o modelo de IA. Certifique-se de que os arquivos do modelo estão em /public/libras_model_tfjs/'
        );
      } finally {
        setModelLoading(false);
      }
    }

    loadModel();
  }, []);

  // ---- Initialize MediaPipe Pose ----
  const initializePose = useCallback(() => {
    if (!window.Pose || poseRef.current) return;

    const pose = new window.Pose({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onPoseResults);
    poseRef.current = pose;
  }, []);

  useEffect(() => {
    if (mediaPipeLoaded) {
      initializePose();
    }
  }, [mediaPipeLoaded, initializePose]);

  // ---- Pose Results Callback ----
  const onPoseResults = useCallback(
    async (results: any) => {
      // Draw landmarks on canvas
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.poseLandmarks && window.drawConnectors && window.drawLandmarks) {
          // Draw connections
          window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
            color: 'rgba(139, 92, 246, 0.4)',
            lineWidth: 2,
          });
          // Draw landmarks
          window.drawLandmarks(ctx, results.poseLandmarks, {
            color: 'rgba(6, 182, 212, 0.8)',
            lineWidth: 1,
            radius: 3,
          });
        }
      }

      // Extract landmarks and add to buffer
      if (results.poseLandmarks) {
        const features = extractLandmarks(results.poseLandmarks);
        const buffer = frameBufferRef.current;
        buffer.push(features);
        setBufferProgress(buffer.size / NUM_FRAMES);

        // Run inference when buffer is full
        if (buffer.isFull() && modelAssetsRef.current && !isProcessingRef.current) {
          const now = performance.now();
          // Throttle: min 2000ms between predictions to allow narrator to finish
          if (now - lastPredictionTimeRef.current > 2000) {
            isProcessingRef.current = true;
            lastPredictionTimeRef.current = now;

            try {
              const frames = buffer.getData();
              const output = await runInference(
                modelAssetsRef.current.model,
                frames,
                modelAssetsRef.current.scaler
              );

              const prediction = classifySignal(
                output,
                modelAssetsRef.current.classMapping
              );

              if (prediction) {
                setCurrentPrediction(prediction);
                setPredictions((prev) => [prediction, ...prev].slice(0, 20));

                // Speak the signal, unless it is "Parado"
                if (soundEnabledRef.current && prediction.signal !== 'Parado') {
                  speakSignal(prediction.signal, {
                    onEnd: () => setIsSpeaking(false),
                  });
                  setIsSpeaking(true);
                }
              }

              // Clear half the buffer for overlapping windows
              buffer.shift(NUM_FRAMES / 2);
            } catch (err) {
              console.error('Erro na inferência:', err);
            } finally {
              isProcessingRef.current = false;
            }
          }
        }
      }

      // FPS counter
      fpsCounterRef.current.frames++;
      const now = performance.now();
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.frames);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }
    },
    [] // Dependencies optimized using refs
  );

  // Update the pose callback when onPoseResults changes
  useEffect(() => {
    if (poseRef.current) {
      poseRef.current.onResults(onPoseResults);
    }
  }, [onPoseResults]);

  // ---- Processing Loop ----
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const pose = poseRef.current;

    if (video && pose && video.readyState >= 2) {
      try {
        await pose.send({ image: video });
      } catch (err) {
        // MediaPipe can throw on some frames, just skip
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, []);

  // ---- Start Camera ----
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsRunning(true);
      frameBufferRef.current.clear();
      setBufferProgress(0);
      animationFrameRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setError(
        'Não foi possível acessar a câmera. Verifique as permissões do navegador.'
      );
    }
  }, [processFrame]);

  // ---- Stop Camera ----
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsRunning(false);
    setFps(0);
    setBufferProgress(0);
    frameBufferRef.current.clear();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      stopCamera();
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
      if (modelAssetsRef.current?.model) {
        modelAssetsRef.current.model.dispose();
      }
    };
  }, [stopCamera]);

  // ---- Derived state ----
  const isReady = modelLoaded && mediaPipeLoaded;

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div
            className="header-logo"
            onClick={() => {
              stopCamera();
              navigate('/');
            }}
            role="button"
            tabIndex={0}
            id="translator-header-logo"
          >
            <span className="header-logo-icon">🤟</span>
            <span>Tradutor Libras</span>
          </div>
          <nav className="header-nav">
            <button
              className="btn btn-secondary"
              onClick={() => {
                stopCamera();
                navigate('/');
              }}
              id="translator-back-button"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: 'var(--space-6)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {/* Page Title */}
          <div className="animate-fade-in-up" style={{ marginBottom: 'var(--space-6)' }}>
            <h1 style={{
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 800,
              background: 'var(--gradient-text)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Tradutor de Libras
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
              Posicione-se em frente à câmera e faça sinais de Libras para tradução em tempo real
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="error-alert animate-fade-in" style={{ marginBottom: 'var(--space-4)' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Layout */}
          <div className="translator-layout">
            {/* Video Section */}
            <div className="animate-fade-in-up">
              {/* Video Container */}
              <div className="translator-video-container">
                <video
                  ref={videoRef}
                  className="translator-video"
                  autoPlay
                  playsInline
                  muted
                  id="translator-video"
                />
                <canvas
                  ref={canvasRef}
                  className="translator-canvas-overlay"
                  id="translator-canvas"
                />

                {!isRunning && (
                  <div className="translator-video-placeholder">
                    <Camera size={64} className="translator-video-placeholder-icon" />
                    <span>Câmera não iniciada</span>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      Clique em "Iniciar Câmera" para começar
                    </span>
                  </div>
                )}

                {/* FPS overlay */}
                {isRunning && (
                  <div style={{
                    position: 'absolute',
                    top: 'var(--space-3)',
                    left: 'var(--space-3)',
                    background: 'rgba(0,0,0,0.7)',
                    padding: 'var(--space-1) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: fps >= 25 ? 'var(--color-success)' : 'var(--color-warning)',
                    fontFamily: 'monospace',
                    zIndex: 10,
                  }}>
                    {fps} FPS
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="translator-controls" style={{ marginTop: 'var(--space-4)' }}>
                <button
                  className="btn btn-primary"
                  onClick={startCamera}
                  disabled={isRunning || !isReady}
                  id="start-camera-btn"
                  style={{ flex: 1 }}
                >
                  {modelLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Carregando modelo...
                    </>
                  ) : (
                    <>
                      <Camera size={18} />
                      Iniciar Câmera
                    </>
                  )}
                </button>

                <button
                  className="btn btn-danger"
                  onClick={stopCamera}
                  disabled={!isRunning}
                  id="stop-camera-btn"
                >
                  <CameraOff size={18} />
                  Parar
                </button>

                <button
                  className={cn('btn btn-secondary')}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Desativar som' : 'Ativar som'}
                  id="toggle-sound-btn"
                >
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
              </div>

              {/* Buffer progress */}
              {isRunning && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    marginBottom: 'var(--space-1)',
                  }}>
                    <span>Buffer de frames</span>
                    <span>{Math.round(bufferProgress * 100)}%</span>
                  </div>
                  <div className="confidence-bar-container">
                    <div
                      className="confidence-bar"
                      style={{ width: `${bufferProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="translator-sidebar animate-fade-in-up delay-200">
              {/* System Status */}
              <div className="glass-card" id="status-card">
                <h3 style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}>
                  <Info size={16} />
                  Status do Sistema
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <StatusItem
                    label="Modelo LSTM"
                    status={modelLoaded ? 'success' : modelLoading ? 'warning' : 'error'}
                    detail={modelLoaded ? 'Carregado' : modelLoading ? 'Carregando...' : 'Erro'}
                  />
                  <StatusItem
                    label="MediaPipe Pose"
                    status={mediaPipeLoaded ? 'success' : 'warning'}
                    detail={mediaPipeLoaded ? '33 landmarks' : 'Carregando...'}
                  />
                  <StatusItem
                    label="Câmera"
                    status={isRunning ? 'success' : 'error'}
                    detail={isRunning ? `Ativa • ${fps} FPS` : 'Inativa'}
                  />
                  <StatusItem
                    label="Síntese de Voz"
                    status={isSpeaking ? 'success' : soundEnabled ? 'success' : 'warning'}
                    detail={isSpeaking ? 'Falando...' : soundEnabled ? 'pt-BR' : 'Desativado'}
                  />
                </div>
              </div>

              {/* Current Prediction */}
              <div className="glass-card prediction-card" id="prediction-card">
                {currentPrediction ? (
                  <div className="animate-scale-in">
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>
                      {SIGNAL_EMOJIS[currentPrediction.signal] ?? '🤟'}
                    </div>
                    <div className="prediction-signal">{currentPrediction.signal}</div>
                    <div className="prediction-confidence">
                      Confiança: {formatPercent(currentPrediction.confidence)}
                    </div>
                    <div className="confidence-bar-container" style={{ maxWidth: '200px', margin: '0 auto' }}>
                      <div
                        className="confidence-bar"
                        style={{ width: `${currentPrediction.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)', opacity: 0.3 }}>🤟</div>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>
                      {isRunning
                        ? 'Aguardando detecção de sinal...'
                        : 'Inicie a câmera para começar'}
                    </p>
                  </div>
                )}
              </div>

              {/* History */}
              <div className="glass-card" id="history-card">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--space-4)',
                }}>
                  <h3 style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}>
                    <Clock size={16} />
                    Histórico
                  </h3>
                  {predictions.length > 0 && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setPredictions([])}
                      id="clear-history-btn"
                    >
                      <Trash2 size={12} />
                      Limpar
                    </button>
                  )}
                </div>

                {predictions.length > 0 ? (
                  <div className="history-list">
                    {predictions.map((pred, i) => (
                      <div key={`${pred.timestamp.getTime()}-${i}`} className="history-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span>{SIGNAL_EMOJIS[pred.signal] ?? '🤟'}</span>
                          <div>
                            <div className="history-signal">{pred.signal}</div>
                            <div className="history-confidence">
                              {formatPercent(pred.confidence)}
                            </div>
                          </div>
                        </div>
                        <div className="history-time">
                          {formatTime(pred.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                    Nenhum sinal reconhecido ainda
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="glass-card" id="instructions-card">
                <h3 style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 700,
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}>
                  <Info size={16} />
                  Como usar
                </h3>

                <ol className="instructions-list">
                  <li>
                    <span className="instructions-step">1</span>
                    Clique em "Iniciar Câmera" e permita o acesso
                  </li>
                  <li>
                    <span className="instructions-step">2</span>
                    Posicione-se de frente, com corpo visível
                  </li>
                  <li>
                    <span className="instructions-step">3</span>
                    Faça um sinal de Libras (ex: Olá, Obrigado)
                  </li>
                  <li>
                    <span className="instructions-step">4</span>
                    O sinal será reconhecido e falado automaticamente
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-text">
            🤟 Tradutor de Libras para Áudio — IA em Tempo Real
          </div>
          <div className="footer-text">
            10 sinais • LSTM • MediaPipe • Edge Computing
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---- Sub-components ----

function StatusItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: 'success' | 'warning' | 'error';
  detail: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 'var(--font-size-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span className={`status-dot status-dot-${status}`} />
        <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <span style={{
        fontSize: 'var(--font-size-xs)',
        color: status === 'success'
          ? 'var(--color-success)'
          : status === 'warning'
            ? 'var(--color-warning)'
            : 'var(--color-text-muted)',
      }}>
        {detail}
      </span>
    </div>
  );
}
