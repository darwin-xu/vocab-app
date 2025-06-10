// Basic test to verify the environment is working
import { describe, it, expect } from 'vitest';

describe('Basic Environment Test', () => {
    it('should have localStorage available', () => {
        expect(typeof localStorage).toBe('object');
        expect(localStorage.getItem).toBeDefined();
        expect(localStorage.setItem).toBeDefined();
    });

    it('should have document available', () => {
        expect(typeof document).toBe('object');
        expect(document.createElement).toBeDefined();
    });

    it('should have window available', () => {
        expect(typeof window).toBe('object');
    });
});
