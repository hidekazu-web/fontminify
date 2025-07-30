import { describe, it, expect } from 'vitest';

describe('basic functionality', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const text = 'FontMinify';
    expect(text.toLowerCase()).toBe('fontminify');
    expect(text.length).toBe(10);
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });
});