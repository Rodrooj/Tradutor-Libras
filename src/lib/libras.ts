/**
 * Módulo de processamento de Libras
 * ===================================
 * 
 * Lógica core do pipeline de IA:
 * 1. Extração de landmarks do MediaPipe Pose
 * 2. Normalização com StandardScaler (Z-Score)
 * 3. Classificação via modelo LSTM
 * 4. Síntese de voz via Web Speech API
 */

import * as tf from '@tensorflow/tfjs';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const NUM_FRAMES = 30;
export const NUM_LANDMARKS = 33;
export const NUM_COORDS = 3;
export const NUM_FEATURES = NUM_LANDMARKS * NUM_COORDS; // 99
export const NUM_CLASSES = 11;
export const CONFIDENCE_THRESHOLD = 0.7;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ScalerParams {
  mean: number[];
  scale: number[];
}

export interface ClassMapping {
  [key: string]: string;
}

export interface PredictionResult {
  signal: string;
  classIndex: number;
  confidence: number;
  timestamp: Date;
}

export interface ModelAssets {
  model: tf.LayersModel;
  scaler: ScalerParams;
  classMapping: ClassMapping;
}

// ---------------------------------------------------------------------------
// Extração de Landmarks
// ---------------------------------------------------------------------------

/**
 * Extrai os 33 landmarks (x, y, z) do resultado do MediaPipe Pose.
 * Retorna um Float32Array com 99 valores.
 */
export function extractLandmarks(poseLandmarks: any[]): Float32Array {
  const features = new Float32Array(NUM_FEATURES);
  
  for (let i = 0; i < NUM_LANDMARKS; i++) {
    if (i < poseLandmarks.length) {
      const landmark = poseLandmarks[i];
      features[i * 3] = landmark.x ?? 0;
      features[i * 3 + 1] = landmark.y ?? 0;
      features[i * 3 + 2] = landmark.z ?? 0;
    }
    // Se landmark não existe, fica como 0
  }
  
  return features;
}

// ---------------------------------------------------------------------------
// Normalização (StandardScaler)
// ---------------------------------------------------------------------------

/**
 * Aplica normalização Z-Score usando parâmetros pré-calculados.
 * normalized = (value - mean) / scale
 */
export function normalizeFeatures(
  features: Float32Array,
  scaler: ScalerParams
): Float32Array {
  const normalized = new Float32Array(features.length);
  
  for (let i = 0; i < features.length; i++) {
    const scale = scaler.scale[i] || 1;
    normalized[i] = (features[i] - scaler.mean[i]) / scale;
  }
  
  return normalized;
}

// ---------------------------------------------------------------------------
// Buffer de Frames
// ---------------------------------------------------------------------------

/**
 * Cria e gerencia um buffer circular de frames.
 */
export class FrameBuffer {
  private buffer: Float32Array[] = [];
  private maxSize: number;
  
  constructor(maxSize: number = NUM_FRAMES) {
    this.maxSize = maxSize;
  }
  
  /**
   * Adiciona um frame ao buffer.
   */
  push(frame: Float32Array): void {
    this.buffer.push(frame);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  /**
   * Verifica se o buffer está cheio.
   */
  isFull(): boolean {
    return this.buffer.length >= this.maxSize;
  }
  
  /**
   * Retorna os dados do buffer como um array 2D.
   */
  getData(): Float32Array[] {
    return [...this.buffer];
  }
  
  /**
   * Remove os primeiros `count` frames do buffer (sliding window).
   */
  shift(count: number): void {
    const toRemove = Math.min(count, this.buffer.length);
    this.buffer.splice(0, toRemove);
  }
  
  /**
   * Limpa o buffer.
   */
  clear(): void {
    this.buffer = [];
  }
  
  /**
   * Retorna o tamanho atual do buffer.
   */
  get size(): number {
    return this.buffer.length;
  }
}

// ---------------------------------------------------------------------------
// Classificação
// ---------------------------------------------------------------------------

/**
 * Encontra a classe com maior probabilidade e aplica threshold de confiança.
 * Retorna null se a confiança estiver abaixo do threshold.
 */
export function classifySignal(
  output: Float32Array | number[],
  classMapping: ClassMapping,
  threshold: number = CONFIDENCE_THRESHOLD
): PredictionResult | null {
  let maxConfidence = 0;
  let predictedClass = 0;
  
  for (let i = 0; i < output.length; i++) {
    if (output[i] > maxConfidence) {
      maxConfidence = output[i];
      predictedClass = i;
    }
  }
  
  // Float32Array perde precisão (0.7 vira 0.699999988...), então usamos um pequeno epsilon
  if (maxConfidence < threshold - 1e-6) {
    return null;
  }
  
  const signal = mapClassToSignal(predictedClass, classMapping);
  
  return {
    signal,
    classIndex: predictedClass,
    confidence: maxConfidence,
    timestamp: new Date(),
  };
}

/**
 * Mapeia um índice de classe para o nome do sinal.
 */
export function mapClassToSignal(
  classIndex: number,
  classMapping: ClassMapping
): string {
  return classMapping[String(classIndex)] ?? 'Desconhecido';
}

// ---------------------------------------------------------------------------
// Inferência do Modelo
// ---------------------------------------------------------------------------

/**
 * Executa inferência no modelo LSTM com uma sequência de frames.
 */
export async function runInference(
  model: tf.LayersModel,
  frames: Float32Array[],
  scaler: ScalerParams
): Promise<Float32Array> {
  // Normalizar cada frame
  const normalizedFrames = frames.map(frame => normalizeFeatures(frame, scaler));
  
  // Criar tensor 3D: [1, NUM_FRAMES, NUM_FEATURES]
  const inputData = new Float32Array(NUM_FRAMES * NUM_FEATURES);
  for (let i = 0; i < normalizedFrames.length; i++) {
    inputData.set(normalizedFrames[i], i * NUM_FEATURES);
  }
  
  const inputTensor = tf.tensor3d(inputData, [1, NUM_FRAMES, NUM_FEATURES]);
  let outputTensor: tf.Tensor | undefined;
  
  try {
    // Executar inferência
    outputTensor = model.predict(inputTensor) as tf.Tensor;
    const outputData = await outputTensor.data();
    return new Float32Array(outputData);
  } finally {
    // Limpar tensores
    inputTensor.dispose();
    if (outputTensor) {
      outputTensor.dispose();
    }
  }
}

// ---------------------------------------------------------------------------
// Carregamento de Assets
// ---------------------------------------------------------------------------

/**
 * Carrega todos os assets necessários para o pipeline de IA.
 */
export async function loadModelAssets(): Promise<ModelAssets> {
  // Carregar em paralelo
  const [model, scalerResponse, mappingResponse] = await Promise.all([
    tf.loadLayersModel('/libras_model_tfjs/model.json'),
    fetch('/scaler.json'),
    fetch('/class_mapping.json'),
  ]);
  
  if (!scalerResponse.ok) {
    throw new Error(`Falha ao carregar scaler.json: ${scalerResponse.status} ${scalerResponse.statusText}`);
  }
  if (!mappingResponse.ok) {
    throw new Error(`Falha ao carregar class_mapping.json: ${mappingResponse.status} ${mappingResponse.statusText}`);
  }
  
  const scaler: ScalerParams = await scalerResponse.json();
  const classMapping: ClassMapping = await mappingResponse.json();
  
  return { model, scaler, classMapping };
}

// ---------------------------------------------------------------------------
// Síntese de Voz
// ---------------------------------------------------------------------------

/**
 * Reproduz um sinal usando a Web Speech API.
 */
export function speakSignal(
  signal: string,
  options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onEnd?: () => void;
  }
): SpeechSynthesisUtterance | null {
  if (!('speechSynthesis' in window) || !window.speechSynthesis) {
    console.warn('Web Speech API não suportada neste navegador.');
    return null;
  }
  
  // Cancelar fala anterior
  window.speechSynthesis.cancel();
  
  // Formatar sinal para fala
  const text = signal.replace(/_/g, ' ');
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = options?.rate ?? 0.9;
  utterance.pitch = options?.pitch ?? 1;
  utterance.volume = options?.volume ?? 1;
  
  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }
  
  window.speechSynthesis.speak(utterance);
  
  return utterance;
}

// ---------------------------------------------------------------------------
// Mapeamento de sinais para emojis (para UI)
// ---------------------------------------------------------------------------

export const SIGNAL_EMOJIS: Record<string, string> = {
  'Olá': '👋',
  'Obrigado': '🙏',
  'Água': '💧',
  'Ajuda': '🆘',
  'Sim': '✅',
  'Não': '❌',
  'Tudo bem': '👍',
  'Tchau': '👋',
  'Desculpa': '😔',
  'Por favor': '🤲',
  'Parado': '🧍',
};
