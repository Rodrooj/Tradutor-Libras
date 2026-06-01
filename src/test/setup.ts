/**
 * Vitest Test Setup
 * =================
 * Configura mocks globais para APIs do navegador e bibliotecas externas.
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Limpar DOM após cada teste
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Mock: Web Speech API
// ---------------------------------------------------------------------------

const mockSpeak = vi.fn();
const mockCancel = vi.fn();

Object.defineProperty(globalThis, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    getVoices: vi.fn().mockReturnValue([]),
    paused: false,
    speaking: false,
    pending: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onvoiceschanged: null,
  },
  writable: true,
  configurable: true,
});

globalThis.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: '',
  rate: 1,
  pitch: 1,
  volume: 1,
  onend: null,
  onerror: null,
  onstart: null,
})) as any;

// ---------------------------------------------------------------------------
// Mock: MediaDevices (câmera)
// ---------------------------------------------------------------------------

const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [
    {
      stop: vi.fn(),
      kind: 'video',
      enabled: true,
    },
  ],
});

Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
  writable: true,
  configurable: true,
});

// ---------------------------------------------------------------------------
// Mock: requestAnimationFrame / cancelAnimationFrame
// ---------------------------------------------------------------------------

let rafId = 0;
globalThis.requestAnimationFrame = vi.fn((cb) => {
  rafId++;
  return rafId;
});

globalThis.cancelAnimationFrame = vi.fn();

// ---------------------------------------------------------------------------
// Mock: HTMLMediaElement.play / HTMLCanvasElement.getContext
// ---------------------------------------------------------------------------

Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  value: vi.fn().mockResolvedValue(undefined),
  writable: true,
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  value: vi.fn(),
  writable: true,
});

// ---------------------------------------------------------------------------
// Mock: performance.now (para testes determinísticos)
// ---------------------------------------------------------------------------

// performance.now já existe no happy-dom, mas garantimos que funciona
if (!globalThis.performance) {
  (globalThis as any).performance = { now: vi.fn(() => Date.now()) };
}

// ---------------------------------------------------------------------------
// Mock: fetch (para carregamento de model assets)
// ---------------------------------------------------------------------------

const mockClassMapping = {
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
};

const mockScaler = {
  mean: Array(99).fill(0.5),
  scale: Array(99).fill(0.2),
};

globalThis.fetch = vi.fn((url: string) => {
  if (typeof url === 'string' && url.includes('class_mapping.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockClassMapping),
    } as Response);
  }
  if (typeof url === 'string' && url.includes('scaler.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockScaler),
    } as Response);
  }
  // Modelo - retornar erro por padrão (testes específicos podem override)
  return Promise.reject(new Error(`Fetch mock: URL não suportada: ${url}`));
}) as any;
