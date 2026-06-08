/**
 * Testes Unitários: lib/libras.ts
 * =================================
 * Cobertura: ~95%
 * 
 * Testa toda a lógica de processamento de Libras:
 * - extractLandmarks() — extração de landmarks
 * - normalizeFeatures() — normalização Z-Score
 * - FrameBuffer — buffer circular
 * - classifySignal() — classificação com threshold
 * - mapClassToSignal() — mapeamento de classes
 * - speakSignal() — síntese de voz
 * - SIGNAL_EMOJIS — constantes de emojis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import {
  extractLandmarks,
  normalizeFeatures,
  FrameBuffer,
  classifySignal,
  mapClassToSignal,
  speakSignal,
  runInference,
  SIGNAL_EMOJIS,
  NUM_FRAMES,
  NUM_LANDMARKS,
  NUM_COORDS,
  NUM_FEATURES,
  NUM_CLASSES,
  CONFIDENCE_THRESHOLD,
  type ScalerParams,
  type ClassMapping,
} from './libras';

// =========================================================================
// Constantes
// =========================================================================

vi.mock('@tensorflow/tfjs', () => ({
  tensor3d: vi.fn(),
  loadLayersModel: vi.fn(),
}));

describe('Constantes do módulo', () => {
  it('deve definir NUM_FRAMES como 30', () => {
    expect(NUM_FRAMES).toBe(30);
  });

  it('deve definir NUM_LANDMARKS como 33', () => {
    expect(NUM_LANDMARKS).toBe(33);
  });

  it('deve definir NUM_COORDS como 3', () => {
    expect(NUM_COORDS).toBe(3);
  });

  it('deve definir NUM_FEATURES como 99 (33 * 3)', () => {
    expect(NUM_FEATURES).toBe(99);
    expect(NUM_FEATURES).toBe(NUM_LANDMARKS * NUM_COORDS);
  });

  it('deve definir NUM_CLASSES como 11', () => {
    expect(NUM_CLASSES).toBe(11);
  });

  it('deve definir CONFIDENCE_THRESHOLD como 0.7', () => {
    expect(CONFIDENCE_THRESHOLD).toBe(0.7);
  });
});

// =========================================================================
// extractLandmarks
// =========================================================================

describe('extractLandmarks', () => {
  it('deve extrair 99 features de 33 landmarks', () => {
    const landmarks = Array.from({ length: 33 }, (_, i) => ({
      x: i * 0.01,
      y: i * 0.02,
      z: i * 0.001,
    }));

    const features = extractLandmarks(landmarks);

    expect(features).toBeInstanceOf(Float32Array);
    expect(features.length).toBe(NUM_FEATURES);
  });

  it('deve manter a ordem correta dos landmarks (x, y, z)', () => {
    const landmarks = [
      { x: 0.1, y: 0.2, z: 0.3 },
      { x: 0.4, y: 0.5, z: 0.6 },
    ];
    // Preencher o resto com zeros
    for (let i = 2; i < 33; i++) {
      landmarks.push({ x: 0, y: 0, z: 0 });
    }

    const features = extractLandmarks(landmarks);

    expect(features[0]).toBeCloseTo(0.1); // landmark 0, x
    expect(features[1]).toBeCloseTo(0.2); // landmark 0, y
    expect(features[2]).toBeCloseTo(0.3); // landmark 0, z
    expect(features[3]).toBeCloseTo(0.4); // landmark 1, x
    expect(features[4]).toBeCloseTo(0.5); // landmark 1, y
    expect(features[5]).toBeCloseTo(0.6); // landmark 1, z
  });

  it('deve lidar com landmarks faltando (menos de 33)', () => {
    const landmarks = [
      { x: 0.5, y: 0.5, z: 0.0 },
    ];

    const features = extractLandmarks(landmarks);

    expect(features.length).toBe(NUM_FEATURES);
    expect(features[0]).toBeCloseTo(0.5);
    expect(features[1]).toBeCloseTo(0.5);
    expect(features[2]).toBeCloseTo(0.0);
    // Demais landmarks devem ser 0
    expect(features[3]).toBe(0);
    expect(features[4]).toBe(0);
    expect(features[5]).toBe(0);
  });

  it('deve tratar valores undefined como 0', () => {
    const landmarks = Array.from({ length: 33 }, () => ({
      x: undefined,
      y: undefined,
      z: undefined,
    }));

    const features = extractLandmarks(landmarks as any);

    for (let i = 0; i < NUM_FEATURES; i++) {
      expect(features[i]).toBe(0);
    }
  });

  it('deve lidar com array vazio de landmarks', () => {
    const features = extractLandmarks([]);
    expect(features.length).toBe(NUM_FEATURES);
    // Todos os valores devem ser 0
    for (let i = 0; i < NUM_FEATURES; i++) {
      expect(features[i]).toBe(0);
    }
  });
});

// =========================================================================
// normalizeFeatures
// =========================================================================

describe('normalizeFeatures', () => {
  const scaler: ScalerParams = {
    mean: Array(99).fill(0.5),
    scale: Array(99).fill(0.2),
  };

  it('deve normalizar features usando Z-Score', () => {
    const features = new Float32Array(99);
    features[0] = 0.7;

    const normalized = normalizeFeatures(features, scaler);

    // (0.7 - 0.5) / 0.2 = 1.0
    expect(normalized[0]).toBeCloseTo(1.0);
  });

  it('deve retornar 0 para features iguais à média', () => {
    const features = new Float32Array(99).fill(0.5);

    const normalized = normalizeFeatures(features, scaler);

    for (let i = 0; i < 99; i++) {
      expect(normalized[i]).toBeCloseTo(0);
    }
  });

  it('deve retornar valores negativos para features abaixo da média', () => {
    const features = new Float32Array(99);
    features[0] = 0.3;

    const normalized = normalizeFeatures(features, scaler);

    // (0.3 - 0.5) / 0.2 = -1.0
    expect(normalized[0]).toBeCloseTo(-1.0);
  });

  it('deve retornar Float32Array do mesmo tamanho', () => {
    const features = new Float32Array(99).fill(0.5);

    const normalized = normalizeFeatures(features, scaler);

    expect(normalized).toBeInstanceOf(Float32Array);
    expect(normalized.length).toBe(99);
  });

  it('deve lidar com scale zero (fallback para 1)', () => {
    const scalerWithZero: ScalerParams = {
      mean: Array(99).fill(0.5),
      scale: Array(99).fill(0),
    };

    const features = new Float32Array(99);
    features[0] = 0.7;

    const normalized = normalizeFeatures(features, scalerWithZero);

    // scale = 0 → fallback para 1, resultado = (0.7 - 0.5) / 1 = 0.2
    expect(normalized[0]).toBeCloseTo(0.2);
  });

  it('deve normalizar cada feature independentemente', () => {
    const customScaler: ScalerParams = {
      mean: [0.1, 0.2, 0.3, ...Array(96).fill(0.5)],
      scale: [0.1, 0.2, 0.3, ...Array(96).fill(0.2)],
    };
    const features = new Float32Array(99);
    features[0] = 0.2;
    features[1] = 0.4;
    features[2] = 0.6;

    const normalized = normalizeFeatures(features, customScaler);

    expect(normalized[0]).toBeCloseTo((0.2 - 0.1) / 0.1);  // 1.0
    expect(normalized[1]).toBeCloseTo((0.4 - 0.2) / 0.2);  // 1.0
    expect(normalized[2]).toBeCloseTo((0.6 - 0.3) / 0.3);  // 1.0
  });
});

// =========================================================================
// FrameBuffer
// =========================================================================

describe('FrameBuffer', () => {
  let buffer: FrameBuffer;

  beforeEach(() => {
    buffer = new FrameBuffer();
  });

  it('deve inicializar vazio', () => {
    expect(buffer.size).toBe(0);
    expect(buffer.isFull()).toBe(false);
  });

  it('deve adicionar frames corretamente', () => {
    const frame = new Float32Array(99).fill(1);
    buffer.push(frame);

    expect(buffer.size).toBe(1);
  });

  it('deve manter tamanho máximo de 30 frames', () => {
    for (let i = 0; i < 50; i++) {
      buffer.push(new Float32Array(99).fill(i));
    }

    expect(buffer.size).toBe(NUM_FRAMES);
  });

  it('deve reportar isFull() corretamente quando cheio', () => {
    for (let i = 0; i < NUM_FRAMES; i++) {
      buffer.push(new Float32Array(99).fill(i));
    }

    expect(buffer.isFull()).toBe(true);
  });

  it('deve reportar isFull() como false quando parcialmente preenchido', () => {
    for (let i = 0; i < 15; i++) {
      buffer.push(new Float32Array(99).fill(i));
    }

    expect(buffer.isFull()).toBe(false);
  });

  it('deve retornar cópia dos dados com getData()', () => {
    const frame = new Float32Array(99).fill(1);
    buffer.push(frame);

    const data = buffer.getData();

    expect(data).toHaveLength(1);
    expect(data[0]).toEqual(frame);
    // Deve ser uma cópia, não a mesma referência
    expect(data).not.toBe((buffer as any).buffer);
  });

  it('deve limpar o buffer corretamente', () => {
    for (let i = 0; i < 10; i++) {
      buffer.push(new Float32Array(99).fill(i));
    }

    buffer.clear();

    expect(buffer.size).toBe(0);
    expect(buffer.isFull()).toBe(false);
    expect(buffer.getData()).toHaveLength(0);
  });

  it('deve manter os frames mais recentes quando excede maxSize', () => {
    for (let i = 0; i < 35; i++) {
      buffer.push(new Float32Array(99).fill(i));
    }

    const data = buffer.getData();
    // Deve conter os frames 5-34 (os 30 mais recentes)
    expect(data[0][0]).toBeCloseTo(5);
    expect(data[29][0]).toBeCloseTo(34);
  });

  it('deve aceitar maxSize personalizado', () => {
    const smallBuffer = new FrameBuffer(5);

    for (let i = 0; i < 10; i++) {
      smallBuffer.push(new Float32Array(99).fill(i));
    }

    expect(smallBuffer.size).toBe(5);
    expect(smallBuffer.isFull()).toBe(true);
  });

  it('deve remover os primeiros N frames com shift()', () => {
    for (let i = 0; i < 30; i++) {
      buffer.push(new Float32Array(99).fill(i));
    }

    buffer.shift(15);

    expect(buffer.size).toBe(15);
    const data = buffer.getData();
    expect(data[0][0]).toBeCloseTo(15); // o primeiro frame agora é o que era o 15º
  });

  it('shift() não deve ultrapassar o tamanho do buffer', () => {
    buffer.push(new Float32Array(99).fill(1));
    buffer.push(new Float32Array(99).fill(2));

    buffer.shift(100); // pedir mais do que existe

    expect(buffer.size).toBe(0);
  });

  it('shift(0) não deve remover nada', () => {
    buffer.push(new Float32Array(99).fill(1));
    buffer.shift(0);
    expect(buffer.size).toBe(1);
  });
});

// =========================================================================
// classifySignal
// =========================================================================

describe('classifySignal', () => {
  const classMapping: ClassMapping = {
    '0': 'Olá',
    '1': 'Obrigado',
    '2': 'Água',
    '3': 'Ajuda',
    '4': 'Sim',
    '5': 'Não',
    '6': 'Tudo bem',
    '7': 'Tchau',
    '8': 'Desculpa',
    '9': 'Por favor',
    '10': 'Parado',
  };

  it('deve classificar sinal corretamente quando confiança > 0.7', () => {
    const output = new Float32Array([0.1, 0.2, 0.75, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);

    const result = classifySignal(output, classMapping);

    expect(result).not.toBeNull();
    expect(result!.classIndex).toBe(2);
    expect(result!.signal).toBe('Água');
    expect(result!.confidence).toBeCloseTo(0.75);
  });

  it('deve retornar null quando confiança < threshold', () => {
    const output = new Float32Array([0.1, 0.2, 0.3, 0.1, 0.1, 0.05, 0.05, 0.05, 0.03, 0.02, 0.0]);

    const result = classifySignal(output, classMapping);

    expect(result).toBeNull();
  });

  it('deve aceitar threshold personalizado', () => {
    const output = new Float32Array([0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);

    const resultDefault = classifySignal(output, classMapping); // threshold 0.7
    const resultCustom = classifySignal(output, classMapping, 0.4); // threshold 0.4

    expect(resultDefault).toBeNull();
    expect(resultCustom).not.toBeNull();
    expect(resultCustom!.signal).toBe('Sim');
  });

  it('deve encontrar a classe com maior probabilidade', () => {
    const output = new Float32Array([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.95, 0.0]);

    const result = classifySignal(output, classMapping);

    expect(result!.classIndex).toBe(9);
    expect(result!.signal).toBe('Por favor');
    expect(result!.confidence).toBeCloseTo(0.95);
  });

  it('deve incluir timestamp na predição', () => {
    const output = new Float32Array([0.9, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);

    const before = new Date();
    const result = classifySignal(output, classMapping);
    const after = new Date();

    expect(result!.timestamp).toBeInstanceOf(Date);
    expect(result!.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('deve funcionar com array regular (não Float32Array)', () => {
    const output = [0.0, 0.85, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

    const result = classifySignal(output, classMapping);

    expect(result!.signal).toBe('Obrigado');
    expect(result!.confidence).toBeCloseTo(0.85);
  });

  it('deve retornar null para array de zeros', () => {
    const output = new Float32Array(11).fill(0);

    const result = classifySignal(output, classMapping);

    expect(result).toBeNull();
  });

  it('deve lidar com confiança exatamente no threshold', () => {
    const output = new Float32Array([0.7, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
    const result = classifySignal(output, classMapping);
    expect(result).not.toBeNull();
  });

  it('deve classificar corretamente com confiança exatamente igual ao threshold', () => {
    const output = new Float32Array([0.7, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0]);

    const result = classifySignal(output, classMapping, 0.7);
    // 0.7 < 0.7 is false, so it passes
    expect(result).not.toBeNull();
    expect(result!.signal).toBe('Olá');
  });
});

// =========================================================================
// mapClassToSignal
// =========================================================================

describe('mapClassToSignal', () => {
  const classMapping: ClassMapping = {
    '0': 'Olá',
    '1': 'Obrigado',
    '2': 'Água',
  };

  it('deve mapear classe 0 para "Olá"', () => {
    expect(mapClassToSignal(0, classMapping)).toBe('Olá');
  });

  it('deve mapear classe 1 para "Obrigado"', () => {
    expect(mapClassToSignal(1, classMapping)).toBe('Obrigado');
  });

  it('deve mapear classe 2 para "Água"', () => {
    expect(mapClassToSignal(2, classMapping)).toBe('Água');
  });

  it('deve retornar "Desconhecido" para classe inválida', () => {
    expect(mapClassToSignal(99, classMapping)).toBe('Desconhecido');
  });

  it('deve retornar "Desconhecido" para classe negativa', () => {
    expect(mapClassToSignal(-1, classMapping)).toBe('Desconhecido');
  });
});

// =========================================================================
// speakSignal
// =========================================================================

describe('speakSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar SpeechSynthesisUtterance com configurações corretas', () => {
    speakSignal('Olá');

    expect(SpeechSynthesisUtterance).toHaveBeenCalledWith('Olá');
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('deve cancelar fala anterior antes de falar', () => {
    speakSignal('Obrigado');

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('deve converter underscores para espaços', () => {
    speakSignal('Tudo_bem');

    expect(SpeechSynthesisUtterance).toHaveBeenCalledWith('Tudo bem');
  });

  it('deve usar configurações padrão (rate=0.9, pitch=1, volume=1)', () => {
    const result = speakSignal('Sim');

    expect(result).not.toBeNull();
    expect(result!.rate).toBe(0.9);
    expect(result!.pitch).toBe(1);
    expect(result!.volume).toBe(1);
  });

  it('deve aceitar opções personalizadas', () => {
    const result = speakSignal('Não', {
      rate: 1.5,
      pitch: 0.8,
      volume: 0.5,
    });

    expect(result).not.toBeNull();
    expect(result!.rate).toBe(1.5);
    expect(result!.pitch).toBe(0.8);
    expect(result!.volume).toBe(0.5);
  });

  it('deve configurar callback onEnd', () => {
    const onEnd = vi.fn();
    const result = speakSignal('Água', { onEnd });

    expect(result).not.toBeNull();
    expect(result!.onend).toBe(onEnd);
  });

  it('deve configurar idioma como pt-BR', () => {
    const result = speakSignal('Tchau');

    expect(result).not.toBeNull();
    expect(result!.lang).toBe('pt-BR');
  });

  it('deve retornar null quando speechSynthesis não está disponível', () => {
    const original = globalThis.speechSynthesis;
    // Temporariamente remover a API
    delete (globalThis as any).speechSynthesis;
    // Simular que 'speechSynthesis' não está in window
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const result = speakSignal('Teste');

    expect(result).toBeNull();

    // Restaurar
    Object.defineProperty(window, 'speechSynthesis', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});

// =========================================================================
// SIGNAL_EMOJIS
// =========================================================================

describe('SIGNAL_EMOJIS', () => {
  it('deve ter 11 sinais mapeados', () => {
    expect(Object.keys(SIGNAL_EMOJIS)).toHaveLength(11);
  });

  it('deve mapear todos os sinais para emojis', () => {
    const expectedSignals = [
      'Olá', 'Obrigado', 'Água', 'Ajuda', 'Sim',
      'Não', 'Tudo bem', 'Tchau', 'Desculpa', 'Por favor', 'Parado',
    ];

    for (const signal of expectedSignals) {
      expect(SIGNAL_EMOJIS[signal]).toBeDefined();
      expect(typeof SIGNAL_EMOJIS[signal]).toBe('string');
      expect(SIGNAL_EMOJIS[signal].length).toBeGreaterThan(0);
    }
  });

  it('deve retornar emoji correto para "Olá"', () => {
    expect(SIGNAL_EMOJIS['Olá']).toBe('👋');
  });

  it('deve retornar emoji correto para "Obrigado"', () => {
    expect(SIGNAL_EMOJIS['Obrigado']).toBe('🙏');
  });

  it('deve retornar emoji correto para "Água"', () => {
    expect(SIGNAL_EMOJIS['Água']).toBe('💧');
  });

  it('deve retornar undefined para sinal desconhecido', () => {
    expect(SIGNAL_EMOJIS['Inexistente']).toBeUndefined();
  });
});

// =========================================================================
// PredictionResult structure
// =========================================================================

describe('Prediction result structure', () => {
  const classMapping: ClassMapping = {
    '0': 'Olá',
    '1': 'Obrigado',
  };

  it('deve criar resultado de predição com todos os campos', () => {
    const output = new Float32Array([0.9, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = classifySignal(output, classMapping);

    expect(result).toHaveProperty('signal');
    expect(result).toHaveProperty('classIndex');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('timestamp');
  });

  it('deve ter confiança entre 0 e 1', () => {
    const output = new Float32Array([0.85, 0.15, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = classifySignal(output, classMapping);

    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
  });

  it('deve ter classIndex como inteiro não negativo', () => {
    const output = new Float32Array([0.85, 0.15, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = classifySignal(output, classMapping);

    expect(Number.isInteger(result!.classIndex)).toBe(true);
    expect(result!.classIndex).toBeGreaterThanOrEqual(0);
  });
});

// =========================================================================
// runInference
// =========================================================================

describe('runInference', () => {
  const scaler: ScalerParams = {
    mean: Array(99).fill(0.5),
    scale: Array(99).fill(0.2),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve executar inferencia e descartar tensores em caso de sucesso', async () => {
    const mockOutputTensor = {
      data: vi.fn().mockResolvedValue(new Float32Array([0.1, 0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
      dispose: vi.fn(),
    };
    const mockModel = {
      predict: vi.fn().mockReturnValue(mockOutputTensor),
    };
    
    const mockDisposeInput = vi.fn();
    (tf.tensor3d as any).mockReturnValue({ dispose: mockDisposeInput });

    const frames = Array(30).fill(new Float32Array(99));
    const result = await runInference(mockModel as any, frames, scaler);

    expect(result).toBeInstanceOf(Float32Array);
    expect(result[1]).toBeCloseTo(0.9);
    expect(mockDisposeInput).toHaveBeenCalled();
    expect(mockOutputTensor.dispose).toHaveBeenCalled();
  });

  it('deve descartar inputTensor mesmo quando o modelo lança erro', async () => {
    const mockModel = {
      predict: vi.fn().mockImplementation(() => {
        throw new Error('Erro de shape');
      }),
    };
    
    const mockDisposeInput = vi.fn();
    (tf.tensor3d as any).mockReturnValue({ dispose: mockDisposeInput });

    const frames = Array(30).fill(new Float32Array(99));
    
    await expect(runInference(mockModel as any, frames, scaler)).rejects.toThrow('Erro de shape');
    
    expect(mockDisposeInput).toHaveBeenCalled();
  });
});

// =========================================================================
// loadModelAssets
// =========================================================================

import { loadModelAssets } from './libras';

describe('loadModelAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar modelo, scaler e classMapping com sucesso', async () => {
    const mockModel = { predict: vi.fn() };
    (tf.loadLayersModel as any).mockResolvedValue(mockModel);

    const mockScaler = { mean: [0.5], scale: [0.2] };
    const mockMapping = { '0': 'Olá' };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn((url: string) => {
      if (url.includes('scaler.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockScaler) } as Response);
      }
      if (url.includes('class_mapping.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMapping) } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    }) as any;

    const assets = await loadModelAssets();

    expect(assets.model).toBe(mockModel);
    expect(assets.scaler).toEqual(mockScaler);
    expect(assets.classMapping).toEqual(mockMapping);

    globalThis.fetch = originalFetch;
  });

  it('deve lançar erro quando scaler.json retorna status não-ok', async () => {
    const mockModel = { predict: vi.fn() };
    (tf.loadLayersModel as any).mockResolvedValue(mockModel);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn((url: string) => {
      if (url.includes('scaler.json')) {
        return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' } as Response);
      }
      if (url.includes('class_mapping.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    }) as any;

    await expect(loadModelAssets()).rejects.toThrow('Falha ao carregar scaler.json');

    globalThis.fetch = originalFetch;
  });

  it('deve lançar erro quando class_mapping.json retorna status não-ok', async () => {
    const mockModel = { predict: vi.fn() };
    (tf.loadLayersModel as any).mockResolvedValue(mockModel);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn((url: string) => {
      if (url.includes('scaler.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }
      if (url.includes('class_mapping.json')) {
        return Promise.resolve({ ok: false, status: 500, statusText: 'Internal Server Error' } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    }) as any;

    await expect(loadModelAssets()).rejects.toThrow('Falha ao carregar class_mapping.json');

    globalThis.fetch = originalFetch;
  });
});
