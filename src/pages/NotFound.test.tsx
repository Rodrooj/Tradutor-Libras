/**
 * Testes de Componente: pages/NotFound.tsx
 * ==========================================
 * Cobertura: 100%
 * 
 * Testa renderização e navegação do componente 404.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

// Mock de useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderNotFound() {
  return render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>
  );
}

// =========================================================================
// Renderização
// =========================================================================

describe('Renderização', () => {
  it('deve renderizar o código 404', () => {
    renderNotFound();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('deve renderizar a mensagem de erro', () => {
    renderNotFound();
    expect(
      screen.getByText(/Página não encontrada/)
    ).toBeInTheDocument();
  });

  it('deve renderizar o logo no header', () => {
    renderNotFound();
    expect(screen.getByText('🤟')).toBeInTheDocument();
    expect(screen.getByText('Tradutor Libras')).toBeInTheDocument();
  });

  it('deve renderizar botão "Voltar ao Início"', () => {
    renderNotFound();
    expect(screen.getByText('Voltar ao Início')).toBeInTheDocument();
  });

  it('deve renderizar botão "Abrir Tradutor"', () => {
    renderNotFound();
    expect(screen.getByText('Abrir Tradutor')).toBeInTheDocument();
  });
});

// =========================================================================
// Navegação
// =========================================================================

describe('Navegação', () => {
  it('deve navegar para "/" ao clicar "Voltar ao Início"', () => {
    renderNotFound();
    const btn = screen.getByText('Voltar ao Início');
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('deve navegar para "/tradutor" ao clicar "Abrir Tradutor"', () => {
    renderNotFound();
    const btn = screen.getByText('Abrir Tradutor');
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/tradutor');
  });

  it('deve navegar para "/" ao clicar no logo', () => {
    renderNotFound();
    const logo = screen.getByRole('button', { name: /Tradutor Libras/i });
    fireEvent.click(logo);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

// =========================================================================
// Acessibilidade
// =========================================================================

describe('Acessibilidade', () => {
  it('logo deve ter role="button"', () => {
    renderNotFound();
    const logo = screen.getByRole('button', { name: /Tradutor Libras/i });
    expect(logo).toBeInTheDocument();
  });

  it('logo deve ter tabIndex=0', () => {
    renderNotFound();
    const logo = screen.getByRole('button', { name: /Tradutor Libras/i });
    expect(logo.getAttribute('tabindex')).toBe('0');
  });

  it('deve ter dois botões de ação', () => {
    renderNotFound();
    const buttons = screen.getAllByRole('button');
    // Logo (role=button) + 2 botões de ação = 3
    expect(buttons.length).toBe(3);
  });
});

// =========================================================================
// Estilização
// =========================================================================

describe('Estilização', () => {
  it('deve usar classe "not-found"', () => {
    renderNotFound();
    const container = document.querySelector('.not-found');
    expect(container).not.toBeNull();
  });

  it('deve usar classe "not-found-code" para o 404', () => {
    renderNotFound();
    const code = document.querySelector('.not-found-code');
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe('404');
  });

  it('deve ter animação de entrada', () => {
    renderNotFound();
    const container = document.querySelector('.animate-fade-in-up');
    expect(container).not.toBeNull();
  });
});
