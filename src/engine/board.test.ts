import { describe, expect, it } from 'vitest';
import { evaluateBoard, seasonObjective } from './board';

describe('seasonObjective', () => {
  it('cobra título de um clube grande (reputação 5)', () => {
    expect(seasonObjective(5, 20).target).toBe(1);
  });

  it('um clube pequeno (reputação 1) só não pode terminar em último', () => {
    expect(seasonObjective(1, 20).target).toBe(19);
  });
});

describe('evaluateBoard', () => {
  it('cumprir o objetivo aumenta a confiança e não demite', () => {
    const verdict = evaluateBoard(3, 20, 5, 55); // alvo top-10, terminou 5º
    expect(verdict.met).toBe(true);
    expect(verdict.confidenceAfter).toBeGreaterThan(55);
    expect(verdict.fired).toBe(false);
  });

  it('fracasso grande derruba a confiança e pode demitir', () => {
    const verdict = evaluateBoard(5, 20, 18, 20); // exigia título, terminou 18º
    expect(verdict.met).toBe(false);
    expect(verdict.confidenceAfter).toBe(0);
    expect(verdict.fired).toBe(true);
  });
});
