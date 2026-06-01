/**
 * Testes de Componente: pages/LibrasTranslator.tsx
 * ==================================================
 * Cobertura: ~90%
 * 
 * Testa o componente principal do tradutor:
 * - Renderização de todos os elementos da interface
 * - Estado inicial do sistema
 * - Controles da câmera
 * - Painel de status
 * - Histórico de predições
 * - Toggle de som
 * - Instruções de uso
 * - Navegação
 * - Acessibilidade
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock de useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock do módulo libras para evitar import de TF.js
vi.mock('../lib/libras', () => ({
  FrameBuffer: class MockFrameBuffer {
    size = 0;
    push = vi.fn();
    isFull = vi.fn().mockReturnValue(false);
    getData = vi.fn().mockReturnValue([]);
    clear = vi.fn();
  },
  extractLandmarks: vi.fn().mockReturnValue(new Float32Array(99)),
  runInference: vi.fn().mockResolvedValue(new Float32Array(10)),
  classifySignal: vi.fn().mockReturnValue(null),
  speakSignal: vi.fn().mockReturnValue(null),
  loadModelAssets: vi.fn().mockImplementation(() => new Promise(() => {})),
  SIGNAL_EMOJIS: {
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
  },
  NUM_FRAMES: 30,
}));

import LibrasTranslator from './LibrasTranslator';

function renderTranslator() {
  return render(
    <MemoryRouter>
      <LibrasTranslator />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  // Reset window.Pose (simula MediaPipe não carregado)
  (window as any).Pose = undefined;
  (window as any).drawConnectors = undefined;
  (window as any).drawLandmarks = undefined;
  (window as any).POSE_CONNECTIONS = undefined;
  
  // Limpar scripts residuais do head
  document.head.innerHTML = '';

  
  // Mock document.createElement para scripts para evitar carregamento assíncrono que quebra o act()
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'script') {
      const script = originalCreateElement('script');
      Object.defineProperty(script, 'src', {
        set: () => {},
        get: () => '',
      });
      setTimeout(() => {
        if (script.onload) script.onload(new Event('load'));
      }, 0);
      return script;
    }
    return originalCreateElement(tagName);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =========================================================================
// Renderização da Interface
// =========================================================================

describe('Renderização da Interface', () => {
  it('deve renderizar o header com logo', () => {
    renderTranslator();
    const emojis = screen.getAllByText('🤟');
    expect(emojis.length).toBeGreaterThan(0);
    expect(screen.getByText('Tradutor Libras')).toBeInTheDocument();
  });

  it('deve renderizar o título "Tradutor de Libras"', () => {
    renderTranslator();
    expect(screen.getByText('Tradutor de Libras')).toBeInTheDocument();
  });

  it('deve renderizar a descrição da página', () => {
    renderTranslator();
    expect(
      screen.getByText(/Posicione-se em frente à câmera/)
    ).toBeInTheDocument();
  });

  it('deve renderizar o botão "Voltar"', () => {
    renderTranslator();
    expect(screen.getByText('Voltar')).toBeInTheDocument();
  });

  it('deve renderizar o footer', () => {
    renderTranslator();
    expect(screen.getByText(/IA em Tempo Real/)).toBeInTheDocument();
  });
});

// =========================================================================
// Controles da Câmera
// =========================================================================

describe('Controles da Câmera', () => {
  it('deve renderizar botão "Iniciar Câmera" ou "Carregando modelo..."', () => {
    renderTranslator();
    const startBtn = document.getElementById('start-camera-btn');
    expect(startBtn).not.toBeNull();
    // Pode estar como "Carregando modelo..." ou "Iniciar Câmera" dependendo do estado
    expect(startBtn!.textContent).toMatch(/Iniciar Câmera|Carregando modelo/);
  });

  it('deve renderizar botão "Parar"', () => {
    renderTranslator();
    const stopBtn = document.getElementById('stop-camera-btn');
    expect(stopBtn).not.toBeNull();
    expect(screen.getByText('Parar')).toBeInTheDocument();
  });

  it('botão "Parar" deve estar desabilitado quando câmera não está ativa', () => {
    renderTranslator();
    const stopBtn = document.getElementById('stop-camera-btn') as HTMLButtonElement;
    expect(stopBtn.disabled).toBe(true);
  });

  it('deve renderizar botão de toggle de som', () => {
    renderTranslator();
    const soundBtn = document.getElementById('toggle-sound-btn');
    expect(soundBtn).not.toBeNull();
  });

  it('deve ter botão de som com title "Desativar som" inicialmente', () => {
    renderTranslator();
    const soundBtn = document.getElementById('toggle-sound-btn');
    expect(soundBtn!.getAttribute('title')).toBe('Desativar som');
  });

  it('deve trocar title ao clicar no botão de som', () => {
    renderTranslator();
    const soundBtn = document.getElementById('toggle-sound-btn')!;
    
    // Inicialmente "Desativar som"
    expect(soundBtn.getAttribute('title')).toBe('Desativar som');
    
    // Clicar para desativar
    fireEvent.click(soundBtn);
    expect(soundBtn.getAttribute('title')).toBe('Ativar som');
    
    // Clicar para reativar
    fireEvent.click(soundBtn);
    expect(soundBtn.getAttribute('title')).toBe('Desativar som');
  });
});

// =========================================================================
// Placeholder de Vídeo
// =========================================================================

describe('Placeholder de Vídeo', () => {
  it('deve mostrar placeholder quando câmera não está ativa', () => {
    renderTranslator();
    expect(screen.getByText('Câmera não iniciada')).toBeInTheDocument();
  });

  it('deve mostrar instrução para iniciar câmera', () => {
    renderTranslator();
    expect(
      screen.getByText(/Clique em "Iniciar Câmera" para começar/)
    ).toBeInTheDocument();
  });

  it('deve ter elemento de vídeo', () => {
    renderTranslator();
    const video = document.getElementById('translator-video');
    expect(video).not.toBeNull();
    expect(video!.tagName).toBe('VIDEO');
  });

  it('deve ter canvas overlay', () => {
    renderTranslator();
    const canvas = document.getElementById('translator-canvas');
    expect(canvas).not.toBeNull();
    expect(canvas!.tagName).toBe('CANVAS');
  });
});

// =========================================================================
// Painel de Status
// =========================================================================

describe('Painel de Status', () => {
  it('deve renderizar card de status do sistema', () => {
    renderTranslator();
    const statusCard = document.getElementById('status-card');
    expect(statusCard).not.toBeNull();
    expect(screen.getByText('Status do Sistema')).toBeInTheDocument();
  });

  it('deve mostrar status do Modelo LSTM', () => {
    renderTranslator();
    expect(screen.getByText('Modelo LSTM')).toBeInTheDocument();
  });

  it('deve mostrar status do MediaPipe Pose', () => {
    renderTranslator();
    expect(screen.getByText('MediaPipe Pose')).toBeInTheDocument();
  });

  it('deve mostrar status da Câmera', () => {
    renderTranslator();
    expect(screen.getByText('Câmera')).toBeInTheDocument();
  });

  it('deve mostrar status da Síntese de Voz', () => {
    renderTranslator();
    expect(screen.getByText('Síntese de Voz')).toBeInTheDocument();
  });

  it('câmera deve mostrar "Inativa" inicialmente', () => {
    renderTranslator();
    expect(screen.getByText('Inativa')).toBeInTheDocument();
  });
});

// =========================================================================
// Card de Predição
// =========================================================================

describe('Card de Predição', () => {
  it('deve renderizar card de predição', () => {
    renderTranslator();
    const predictionCard = document.getElementById('prediction-card');
    expect(predictionCard).not.toBeNull();
  });

  it('deve mostrar mensagem padrão quando não há predição', () => {
    renderTranslator();
    expect(
      screen.getByText('Inicie a câmera para começar')
    ).toBeInTheDocument();
  });

  it('deve mostrar emoji 🤟 como placeholder', () => {
    renderTranslator();
    const card = document.getElementById('prediction-card');
    expect(card!.textContent).toContain('🤟');
  });
});

// =========================================================================
// Histórico
// =========================================================================

describe('Histórico', () => {
  it('deve renderizar card de histórico', () => {
    renderTranslator();
    const historyCard = document.getElementById('history-card');
    expect(historyCard).not.toBeNull();
  });

  it('deve mostrar título "Histórico"', () => {
    renderTranslator();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
  });

  it('deve mostrar mensagem quando não há sinais', () => {
    renderTranslator();
    expect(
      screen.getByText('Nenhum sinal reconhecido ainda')
    ).toBeInTheDocument();
  });

  it('não deve mostrar botão "Limpar" quando histórico está vazio', () => {
    renderTranslator();
    const clearBtn = document.getElementById('clear-history-btn');
    expect(clearBtn).toBeNull();
  });
});

// =========================================================================
// Instruções
// =========================================================================

describe('Instruções de Uso', () => {
  it('deve renderizar card de instruções', () => {
    renderTranslator();
    const instructionsCard = document.getElementById('instructions-card');
    expect(instructionsCard).not.toBeNull();
  });

  it('deve mostrar título "Como usar"', () => {
    renderTranslator();
    expect(screen.getByText('Como usar')).toBeInTheDocument();
  });

  it('deve listar 4 passos', () => {
    renderTranslator();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('passo 1 deve mencionar "Iniciar Câmera"', () => {
    renderTranslator();
    expect(
      screen.getByText(/Clique em "Iniciar Câmera" e permita o acesso/)
    ).toBeInTheDocument();
  });

  it('passo 3 deve mencionar exemplos de sinais', () => {
    renderTranslator();
    expect(
      screen.getByText(/Faça um sinal de Libras/)
    ).toBeInTheDocument();
  });

  it('passo 4 deve mencionar reconhecimento automático', () => {
    renderTranslator();
    expect(
      screen.getByText(/será reconhecido e falado automaticamente/)
    ).toBeInTheDocument();
  });
});

// =========================================================================
// Navegação
// =========================================================================

describe('Navegação', () => {
  it('deve navegar para "/" ao clicar "Voltar"', () => {
    renderTranslator();
    const backBtn = document.getElementById('translator-back-button');
    expect(backBtn).not.toBeNull();
    fireEvent.click(backBtn!);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('deve navegar para "/" ao clicar no logo do header', () => {
    renderTranslator();
    const logo = document.getElementById('translator-header-logo');
    expect(logo).not.toBeNull();
    fireEvent.click(logo!);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

// =========================================================================
// Estado de Carregamento do Modelo
// =========================================================================

describe('Estado de Carregamento do Modelo', () => {
  it('deve mostrar erro quando modelo falha ao carregar', async () => {
    // Override the mock for this specific test to reject
    const { loadModelAssets } = await import('../lib/libras');
    (loadModelAssets as any).mockImplementationOnce(() => Promise.reject(new Error('Test: model not available')));

    renderTranslator();
    
    await waitFor(() => {
      expect(screen.getByText(/Falha ao carregar o modelo de IA/)).toBeInTheDocument();
    });
  });
});

// =========================================================================
// IDs Únicos (requisito para testes E2E)
// =========================================================================

describe('IDs Únicos para automação', () => {
  it('deve ter ID unique para vídeo', () => {
    renderTranslator();
    expect(document.getElementById('translator-video')).not.toBeNull();
  });

  it('deve ter ID unique para canvas', () => {
    renderTranslator();
    expect(document.getElementById('translator-canvas')).not.toBeNull();
  });

  it('deve ter ID unique para botão iniciar', () => {
    renderTranslator();
    expect(document.getElementById('start-camera-btn')).not.toBeNull();
  });

  it('deve ter ID unique para botão parar', () => {
    renderTranslator();
    expect(document.getElementById('stop-camera-btn')).not.toBeNull();
  });

  it('deve ter ID unique para toggle de som', () => {
    renderTranslator();
    expect(document.getElementById('toggle-sound-btn')).not.toBeNull();
  });

  it('deve ter ID unique para card de status', () => {
    renderTranslator();
    expect(document.getElementById('status-card')).not.toBeNull();
  });

  it('deve ter ID unique para card de predição', () => {
    renderTranslator();
    expect(document.getElementById('prediction-card')).not.toBeNull();
  });

  it('deve ter ID unique para card de histórico', () => {
    renderTranslator();
    expect(document.getElementById('history-card')).not.toBeNull();
  });

  it('deve ter ID unique para card de instruções', () => {
    renderTranslator();
    expect(document.getElementById('instructions-card')).not.toBeNull();
  });
});

// =========================================================================
// Acessibilidade
// =========================================================================

describe('Acessibilidade', () => {
  it('deve ter um h1 na página', () => {
    renderTranslator();
    const h1 = document.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toContain('Tradutor de Libras');
  });

  it('vídeo deve ter autoPlay e playsInline', () => {
    renderTranslator();
    const video = document.getElementById('translator-video') as HTMLVideoElement;
    expect(video.autoplay).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
  });

  it('vídeo deve estar muted', () => {
    renderTranslator();
    const video = document.getElementById('translator-video') as HTMLVideoElement;
    expect(video.muted).toBe(true);
  });

  it('logo do header deve ser clicável (role=button)', () => {
    renderTranslator();
    const logo = document.getElementById('translator-header-logo');
    expect(logo!.getAttribute('role')).toBe('button');
  });

  it('logo do header deve ter tabIndex=0', () => {
    renderTranslator();
    const logo = document.getElementById('translator-header-logo');
    expect(logo!.getAttribute('tabindex')).toBe('0');
  });
});
