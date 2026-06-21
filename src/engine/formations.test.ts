import { describe, it, expect } from 'vitest';
import { FORMATION_IDS, FORMATIONS } from './formations';

describe('formations', () => {
  it('toda formação tem 11 slots com exatamente 1 goleiro', () => {
    for (const id of FORMATION_IDS) {
      const slots = FORMATIONS[id];
      expect(slots).toHaveLength(11);
      expect(slots.filter((slot) => slot.subPos === 'GK')).toHaveLength(1);
    }
  });

  it('coordenadas ficam dentro do campo (0–100)', () => {
    for (const id of FORMATION_IDS) {
      for (const slot of FORMATIONS[id]) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x).toBeLessThanOrEqual(100);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeLessThanOrEqual(100);
      }
    }
  });
});
