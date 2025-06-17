import { describe, it, expect } from 'vitest';
import { deepMerge } from '../merge';

describe('deepMerge', () => {
  describe('primitive values', () => {
    it('should merge primitive values into object', () => {
      const target = { a: 1, b: 'hello' };
      const source = { c: 3, d: 'world' };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ a: 1, b: 'hello', c: 3, d: 'world' });
    });

    it('should overwrite existing primitive values', () => {
      const target = { a: 1, b: 'hello' };
      const source = { a: 2, b: 'world' };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ a: 2, b: 'world' });
    });

    it('should handle null values (null typeof is object, no enumerable props)', () => {
      const target = { a: 1, b: 'hello' };
      const source = { a: null, c: null };
      
      deepMerge(target, source);
      
      // null has typeof 'object' but no enumerable properties
      // When target[key] exists and is truthy, deepMerge tries to merge recursively
      // but since null has no properties, nothing happens for existing keys
      expect(target).toEqual({ a: 1, b: 'hello', c: null });
    });

    it('should handle undefined values', () => {
      const target = { a: 1, b: 'hello' };
      const source = { a: undefined, c: undefined };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ a: undefined, b: 'hello', c: undefined });
    });

    it('should handle boolean values', () => {
      const target = { a: true };
      const source = { a: false, b: true };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ a: false, b: true });
    });

    it('should handle number zero and empty string', () => {
      const target = { a: 1, b: 'test' };
      const source = { a: 0, b: '', c: 0, d: '' };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ a: 0, b: '', c: 0, d: '' });
    });
  });

  describe('arrays', () => {
    it('should replace arrays completely', () => {
      const target = { arr: [1, 2, 3] };
      const source = { arr: [4, 5] };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ arr: [4, 5] });
    });

    it('should add new arrays', () => {
      const target = { a: 1 };
      const source = { arr: [1, 2, 3] };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ a: 1, arr: [1, 2, 3] });
    });

    it('should replace array with empty array', () => {
      const target = { arr: [1, 2, 3] };
      const source = { arr: [] };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ arr: [] });
    });

    it('should handle nested arrays', () => {
      const target = { nested: [[1, 2], [3, 4]] };
      const source = { nested: [[5, 6]] };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ nested: [[5, 6]] });
    });
  });

  describe('objects', () => {
    it('should deep merge nested objects', () => {
      const target = { 
        user: { 
          name: 'John', 
          age: 30 
        } 
      };
      const source = { 
        user: { 
          age: 31, 
          email: 'john@example.com' 
        } 
      };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ 
        user: { 
          name: 'John', 
          age: 31, 
          email: 'john@example.com' 
        } 
      });
    });

    it('should handle deeply nested objects', () => {
      const target = {
        level1: {
          level2: {
            level3: {
              value: 'original'
            }
          }
        }
      };
      const source = {
        level1: {
          level2: {
            level3: {
              value: 'updated',
              newValue: 'added'
            },
            newLevel3: {
              value: 'new'
            }
          }
        }
      };
      
      deepMerge(target, source);
      
      expect(target).toEqual({
        level1: {
          level2: {
            level3: {
              value: 'updated',
              newValue: 'added'
            },
            newLevel3: {
              value: 'new'
            }
          }
        }
      });
    });

    it('should replace object with primitive when target key does not exist', () => {
      const target = {};
      const source = { newKey: { nested: 'value' } };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ newKey: { nested: 'value' } });
    });

    it('should not replace object with null (null is treated as object)', () => {
      const target = { obj: { a: 1 } };
      const source = { obj: null };
      
      deepMerge(target, source);
      
      // null has typeof 'object', so it tries to merge recursively
      // but null has no enumerable properties, so the object stays unchanged
      expect(target).toEqual({ obj: { a: 1 } });
    });

    it('should replace object with array', () => {
      const target = { obj: { a: 1 } };
      const source = { obj: [1, 2, 3] };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ obj: [1, 2, 3] });
    });
  });

  describe('mixed data types', () => {
    it('should handle mixed object with arrays, primitives, and nested objects', () => {
      const target = {
        id: 1,
        name: 'Original',
        tags: ['old-tag'],
        config: {
          theme: 'dark',
          notifications: true
        },
        metadata: {
          created: '2023-01-01',
          updated: '2023-01-01'
        }
      };

      const source = {
        name: 'Updated',
        tags: ['new-tag', 'another-tag'],
        config: {
          theme: 'light',
          language: 'en'
        },
        metadata: {
          updated: '2023-12-01',
          version: '1.0.0'
        },
        newField: 'added'
      };

      deepMerge(target, source);

      expect(target).toEqual({
        id: 1,
        name: 'Updated',
        tags: ['new-tag', 'another-tag'],
        config: {
          theme: 'light',
          notifications: true,
          language: 'en'
        },
        metadata: {
          created: '2023-01-01',
          updated: '2023-12-01',
          version: '1.0.0'
        },
        newField: 'added'
      });
    });

    it('should handle replacing object with primitive', () => {
      const target = { config: { theme: 'dark' } };
      const source = { config: 'simple-string' };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ config: 'simple-string' });
    });

    it('should throw error when trying to merge object into primitive', () => {
      const target = { config: 'simple-string' };
      const source = { config: { theme: 'dark' } };
      
      expect(() => deepMerge(target, source)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty source object', () => {
      const target = { a: 1, b: 2 };
      const source = {};
      
      deepMerge(target, source);
      
      expect(target).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty target object', () => {
      const target = {};
      const source = { a: 1, b: { c: 2 } };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ a: 1, b: { c: 2 } });
    });

    it('should not mutate source object', () => {
      const target = { a: 1 };
      const source = { b: { c: 2 } };
      const originalSource = JSON.parse(JSON.stringify(source));
      
      deepMerge(target, source);
      
      expect(source).toEqual(originalSource);
    });

    it('should handle Date objects by preserving original (no enumerable props)', () => {
      const target = { date: new Date('2023-01-01') };
      const source = { date: new Date('2023-12-01') };
      
      deepMerge(target, source);
      
      // Date objects are treated as objects and merged recursively
      // This keeps the original date because Date objects don't have enumerable properties
      expect(target.date).toEqual(new Date('2023-01-01'));
    });

    it('should handle RegExp objects by preserving original (no enumerable props)', () => {
      const target = { pattern: /old/g };
      const source = { pattern: /new/i };
      
      deepMerge(target, source);
      
      // RegExp objects are treated as objects and merged recursively
      // This keeps the original pattern because RegExp objects don't have enumerable properties
      expect(target.pattern).toEqual(/old/g);
    });

    it('should handle function values', () => {
      const targetFn = () => 'target';
      const sourceFn = () => 'source';
      const target = { fn: targetFn };
      const source = { fn: sourceFn };
      
      deepMerge(target, source);
      
      expect(target.fn).toBe(sourceFn);
      expect(target.fn()).toBe('source');
    });

    it('should handle circular reference protection (basic case)', () => {
      const target = { a: 1 };
      const source: any = { b: 2 };
      source.self = source; // Create circular reference
      
      // This should not throw an error and should handle the circular reference
      expect(() => deepMerge(target, source)).not.toThrow();
    });
  });

  describe('mutation behavior', () => {
    it('should mutate the target object in place', () => {
      const original = { a: 1, b: { c: 2 } };
      const target = original;
      const source = { b: { d: 3 } };
      
      deepMerge(target, source);
      
      expect(target).toBe(original); // Same reference
      expect(target).toEqual({ a: 1, b: { c: 2, d: 3 } });
    });

    it('should preserve existing object references when possible', () => {
      const nestedObj = { existing: 'value' };
      const target = { nested: nestedObj, other: 'data' };
      const source = { nested: { new: 'value' }, other: 'updated' };
      
      deepMerge(target, source);
      
      expect(target.nested).toBe(nestedObj); // Same reference preserved
      expect(target.nested).toEqual({ existing: 'value', new: 'value' });
    });
  });

  describe('valtio-specific behavior', () => {
    it('should handle object replacement when target property is falsy', () => {
      const target = { config: null };
      const source = { config: { theme: 'dark' } };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ config: { theme: 'dark' } });
    });

    it('should handle object replacement when target property is undefined', () => {
      const target = { config: undefined };
      const source = { config: { theme: 'dark' } };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ config: { theme: 'dark' } });
    });

    it('should handle object replacement when target property is false', () => {
      const target = { config: false };
      const source = { config: { theme: 'dark' } };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ config: { theme: 'dark' } });
    });

    it('should handle object replacement when target property is 0', () => {
      const target = { config: 0 };
      const source = { config: { theme: 'dark' } };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ config: { theme: 'dark' } });
    });

    it('should handle object replacement when target property is empty string', () => {
      const target = { config: '' };
      const source = { config: { theme: 'dark' } };
      
      deepMerge(target, source);
      
      expect(target).toEqual({ config: { theme: 'dark' } });
    });
  });
}); 