/**
 * Testes de Componente: pages/Home.tsx
 * ======================================
 * Cobertura: ~95%
 * 
 * Testa renderização e navegação do componente Home:
 * - Renderização de todos os elementos visuais
 * - Botões de navegação
 * - Seções de conteúdo (features, pipeline, tech, sinais)
 * - Acessibilidade
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

// Helper para renderizar com router
function renderHome(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Home />
    </MemoryRouter>
  );
}

// Mock de useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// =========================================================================
// Renderização do Header
// =========================================================================

describe('Header', () => {
  it('deve renderizar o logo com emoji 🤟', () => {
    renderHome();
    const emojis = screen.getAllByText('🤟');
    expect(emojis.length).toBeGreaterThan(0);
  });

  it('deve renderizar o nome "Tradutor Libras"', () => {
    renderHome();
    expect(screen.getByText('Tradutor Libras')).toBeInTheDocument();
  });

  it('deve renderizar o botão "Abrir Tradutor"', () => {
    renderHome();
    expect(screen.getByText('Abrir Tradutor')).toBeInTheDocument();
  });

  it('deve ter o logo como botão clicável', () => {
    renderHome();
    const logo = screen.getByRole('button', { name: /Tradutor Libras/i });
    expect(logo).toBeInTheDocument();
  });

  it('deve navegar para home ao clicar no logo', () => {
    renderHome();
    const logo = document.getElementById('header-logo');
    expect(logo).not.toBeNull();
    fireEvent.click(logo!);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('deve navegar para tradutor ao clicar em "Abrir Tradutor"', () => {
    renderHome();
    const btn = document.getElementById('header-open-translator');
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);
    expect(mockNavigate).toHaveBeenCalledWith('/tradutor');
  });
});

// =========================================================================
// Hero Section
// =========================================================================

describe('Hero Section', () => {
  it('deve renderizar o badge de tecnologia', () => {
    renderHome();
    expect(screen.getAllByText(/Inteligência Artificial/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Edge Computing/)[0]).toBeInTheDocument();
  });

  it('deve renderizar o título principal', () => {
    renderHome();
    expect(screen.getByText(/Tradução de/)).toBeInTheDocument();
    expect(screen.getAllByText(/Libras para Áudio/)[0]).toBeInTheDocument();
    expect(screen.getByText(/em Tempo Real/)).toBeInTheDocument();
  });

  it('deve renderizar a descrição', () => {
    renderHome();
    expect(
      screen.getByText(/Um sistema de IA que utiliza a câmera/)
    ).toBeInTheDocument();
  });

  it('deve renderizar botão "Comece Agora"', () => {
    renderHome();
    expect(screen.getByText('Comece Agora')).toBeInTheDocument();
  });

  it('deve renderizar link "Saiba Mais"', () => {
    renderHome();
    expect(screen.getByText('Saiba Mais')).toBeInTheDocument();
  });

  it('deve navegar para tradutor ao clicar "Comece Agora"', () => {
    renderHome();
    const btn = document.getElementById('hero-cta');
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);
    expect(mockNavigate).toHaveBeenCalledWith('/tradutor');
  });

  it('link "Saiba Mais" deve ter href #features', () => {
    renderHome();
    const link = document.getElementById('hero-learn-more');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('#features');
  });
});

// =========================================================================
// Features Section
// =========================================================================

describe('Features Section', () => {
  it('deve renderizar título "Por que usar?"', () => {
    renderHome();
    expect(screen.getByText('Por que usar?')).toBeInTheDocument();
  });

  it('deve renderizar 3 feature cards', () => {
    renderHome();
    expect(document.getElementById('feature-card-0')).not.toBeNull();
    expect(document.getElementById('feature-card-1')).not.toBeNull();
    expect(document.getElementById('feature-card-2')).not.toBeNull();
  });

  it('deve renderizar feature "Tempo Real"', () => {
    renderHome();
    expect(screen.getByText('Tempo Real')).toBeInTheDocument();
    expect(screen.getByText(/Latência inferior a 50ms/)).toBeInTheDocument();
  });

  it('deve renderizar feature "Privacidade Total"', () => {
    renderHome();
    expect(screen.getByText('Privacidade Total')).toBeInTheDocument();
    expect(screen.getByText(/Processamento 100% local/)).toBeInTheDocument();
  });

  it('deve renderizar feature "Funciona Offline"', () => {
    renderHome();
    expect(screen.getByText('Funciona Offline')).toBeInTheDocument();
    expect(screen.getByText(/toda a IA roda no seu dispositivo/)).toBeInTheDocument();
  });
});

// =========================================================================
// Pipeline Section
// =========================================================================

describe('Pipeline Section', () => {
  it('deve renderizar título "Arquitetura do Pipeline"', () => {
    renderHome();
    expect(screen.getByText('Arquitetura do Pipeline')).toBeInTheDocument();
  });

  it('deve renderizar subtítulo com "5 etapas"', () => {
    renderHome();
    expect(screen.getByText(/5 etapas de processamento/)).toBeInTheDocument();
  });

  it('deve renderizar todos os 5 passos do pipeline', () => {
    renderHome();
    expect(screen.getByText('Câmera')).toBeInTheDocument();
    expect(screen.getByText('MediaPipe')).toBeInTheDocument();
    expect(screen.getByText('Buffer')).toBeInTheDocument();
    expect(screen.getByText('LSTM')).toBeInTheDocument();
    expect(screen.getByText('Áudio')).toBeInTheDocument();
  });

  it('deve renderizar detalhes técnicos de cada passo', () => {
    renderHome();
    expect(screen.getByText('30 FPS')).toBeInTheDocument();
    expect(screen.getByText('33 Landmarks')).toBeInTheDocument();
    expect(screen.getByText('30 Frames')).toBeInTheDocument();
    expect(screen.getByText('67K params')).toBeInTheDocument();
    expect(screen.getByText('pt-BR')).toBeInTheDocument();
  });

  it('deve renderizar setas entre os passos', () => {
    renderHome();
    const arrows = screen.getAllByText('→');
    // 4 setas entre 5 passos
    expect(arrows.length).toBe(4);
  });
});

// =========================================================================
// Tech Stack Section
// =========================================================================

describe('Tech Stack Section', () => {
  it('deve renderizar título "Tecnologias Utilizadas"', () => {
    renderHome();
    expect(screen.getByText('Tecnologias Utilizadas')).toBeInTheDocument();
  });

  it('deve renderizar 4 tech cards', () => {
    renderHome();
    expect(document.getElementById('tech-card-0')).not.toBeNull();
    expect(document.getElementById('tech-card-1')).not.toBeNull();
    expect(document.getElementById('tech-card-2')).not.toBeNull();
    expect(document.getElementById('tech-card-3')).not.toBeNull();
  });

  it('deve renderizar as 4 tecnologias', () => {
    renderHome();
    expect(screen.getByText('MediaPipe Pose')).toBeInTheDocument();
    expect(screen.getByText('TensorFlow.js')).toBeInTheDocument();
    expect(screen.getByText('Web Speech API')).toBeInTheDocument();
    expect(screen.getByText('React + TypeScript')).toBeInTheDocument();
  });
});

// =========================================================================
// Signals Section
// =========================================================================

describe('Signals Section', () => {
  it('deve renderizar título "Sinais Reconhecidos"', () => {
    renderHome();
    expect(screen.getByText('Sinais Reconhecidos')).toBeInTheDocument();
  });

  it('deve renderizar 10 signal cards', () => {
    renderHome();
    for (let i = 0; i < 10; i++) {
      expect(document.getElementById(`signal-card-${i}`)).not.toBeNull();
    }
  });

  it('deve renderizar todos os nomes de sinais', () => {
    renderHome();
    const signals = ['Olá', 'Obrigado', 'Água', 'Ajuda', 'Sim', 'Não', 'Tudo bem', 'Tchau', 'Desculpa', 'Por favor'];
    for (const signal of signals) {
      expect(screen.getByText(signal)).toBeInTheDocument();
    }
  });

  it('deve renderizar botão "Experimentar Agora"', () => {
    renderHome();
    expect(screen.getByText('Experimentar Agora')).toBeInTheDocument();
  });

  it('deve navegar para tradutor ao clicar "Experimentar Agora"', () => {
    renderHome();
    const btn = document.getElementById('signals-cta');
    expect(btn).not.toBeNull();
    fireEvent.click(btn!);
    expect(mockNavigate).toHaveBeenCalledWith('/tradutor');
  });
});

// =========================================================================
// Footer
// =========================================================================

describe('Footer', () => {
  it('deve renderizar texto do footer', () => {
    renderHome();
    expect(screen.getByText(/Projeto Acadêmico de IA/)).toBeInTheDocument();
  });

  it('deve renderizar créditos', () => {
    renderHome();
    expect(screen.getByText(/quebrar barreiras de comunicação/)).toBeInTheDocument();
  });

  it('deve ter id "footer"', () => {
    renderHome();
    expect(document.getElementById('footer')).not.toBeNull();
  });
});

// =========================================================================
// Acessibilidade
// =========================================================================

describe('Acessibilidade', () => {
  it('deve ter um h1 na página', () => {
    renderHome();
    const h1 = document.querySelector('h1');
    expect(h1).not.toBeNull();
  });

  it('deve ter botões com texto legível', () => {
    renderHome();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.textContent!.trim().length).toBeGreaterThan(0);
    }
  });

  it('header-logo deve ter tabIndex 0', () => {
    renderHome();
    const logo = document.getElementById('header-logo');
    expect(logo!.getAttribute('tabindex')).toBe('0');
  });

  it('header-logo deve ter role="button"', () => {
    renderHome();
    const logo = document.getElementById('header-logo');
    expect(logo!.getAttribute('role')).toBe('button');
  });
});
