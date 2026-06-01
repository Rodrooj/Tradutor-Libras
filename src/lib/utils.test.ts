/**
 * Testes Unitários: lib/utils.ts
 * ================================
 * Cobertura: 100%
 * 
 * Testa todas as funções utilitárias:
 * - cn() — mesclagem de classes CSS
 * - formatPercent() — formatação de porcentagem
 * - formatTime() — formatação de hora
 */

import { describe, it, expect } from 'vitest';
import { cn, formatPercent, formatTime } from './utils';

// =========================================================================
// cn — className merger
// =========================================================================

describe('cn - className merger', () => {
  it('deve mesclar múltiplas classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deve mesclar três ou mais classes', () => {
    expect(cn('a', 'b', 'c', 'd')).toBe('a b c d');
  });

  it('deve remover valores undefined', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('deve remover valores null', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar');
  });

  it('deve remover valores false', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
  });

  it('deve lidar com classes condicionais', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled')).toBe(
      'btn btn-active'
    );
  });

  it('deve retornar string vazia para entrada vazia', () => {
    expect(cn()).toBe('');
  });

  it('deve retornar string vazia quando todos os valores são falsy', () => {
    expect(cn(undefined, null, false)).toBe('');
  });

  it('deve lidar com uma única classe', () => {
    expect(cn('only-one')).toBe('only-one');
  });

  it('deve preservar classes com hífens e underscores', () => {
    expect(cn('my-class', 'another_class', 'third-class_v2')).toBe(
      'my-class another_class third-class_v2'
    );
  });

  it('deve lidar com string vazia como input', () => {
    // String vazia é falsy, então será filtrada
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });
});

// =========================================================================
// formatPercent — formatação de porcentagem
// =========================================================================

describe('formatPercent', () => {
  it('deve formatar 0.75 como "75.0%"', () => {
    expect(formatPercent(0.75)).toBe('75.0%');
  });

  it('deve formatar 1.0 como "100.0%"', () => {
    expect(formatPercent(1.0)).toBe('100.0%');
  });

  it('deve formatar 0 como "0.0%"', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('deve formatar valores com precisão de uma casa decimal', () => {
    expect(formatPercent(0.333)).toBe('33.3%');
  });

  it('deve formatar valores pequenos corretamente', () => {
    expect(formatPercent(0.001)).toBe('0.1%');
  });

  it('deve formatar 0.5 como "50.0%"', () => {
    expect(formatPercent(0.5)).toBe('50.0%');
  });

  it('deve arredondar corretamente', () => {
    expect(formatPercent(0.9999)).toBe('100.0%');
  });

  it('deve formatar 0.125 como "12.5%"', () => {
    expect(formatPercent(0.125)).toBe('12.5%');
  });
});

// =========================================================================
// formatTime — formatação de hora
// =========================================================================

describe('formatTime', () => {
  it('deve formatar uma data com hora, minuto e segundo', () => {
    const date = new Date('2026-06-01T14:30:45');
    const result = formatTime(date);
    // O formato exato depende do locale, mas deve conter os números
    expect(result).toMatch(/14:30:45/);
  });

  it('deve formatar meia-noite corretamente', () => {
    const date = new Date('2026-06-01T00:00:00');
    const result = formatTime(date);
    expect(result).toMatch(/00:00:00/);
  });

  it('deve formatar meio-dia corretamente', () => {
    const date = new Date('2026-06-01T12:00:00');
    const result = formatTime(date);
    expect(result).toMatch(/12:00:00/);
  });

  it('deve retornar uma string não vazia', () => {
    const date = new Date();
    const result = formatTime(date);
    expect(result.length).toBeGreaterThan(0);
  });

  it('deve usar formato de 2 dígitos para hora', () => {
    const date = new Date('2026-06-01T09:05:03');
    const result = formatTime(date);
    expect(result).toMatch(/09:05:03/);
  });
});
