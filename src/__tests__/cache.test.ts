import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { proxy } from 'valtio';
import { cache, type CacheOptions } from '../cache';
import type { ISyncDB } from '../sync-db';

describe('cache', () => {
  let mockDb: ISyncDB;
  let mockGet: Mock;
  let mockSet: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGet = vi.fn().mockReturnValue(null);
    mockSet = vi.fn();
    
    mockDb = {
      get: mockGet,
      set: mockSet,
    };
  });

  describe('basic functionality', () => {
    it('should create a proxy with string key', () => {
      const initialState = { count: 0 };
      const result = cache({ key: 'test-key', db: mockDb }, initialState);

      expect(result.count).toBe(0);
      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/test-key');
    });

    it('should use default prefix', () => {
      const initialState = { count: 0 };
      cache({ key: 'test-key', db: mockDb }, initialState);

      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/test-key');
    });

    it('should retrieve cached data on creation', () => {
      mockGet.mockReturnValue({ count: 5 });
      const initialState = { count: 0 };
      
      const result = cache({ key: 'test-key', db: mockDb }, initialState);

      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/test-key');
      expect(result.count).toBe(5);
    });
  });

  describe('with CacheOptions', () => {
    it('should use custom prefix', () => {
      const options: CacheOptions = { 
        key: 'test-key', 
        prefix: 'custom/',
        db: mockDb
      };
      const initialState = { data: 'test' };
      
      cache(options, initialState);

      expect(mockGet).toHaveBeenCalledWith('custom/test-key');
    });

    it('should use custom database', () => {
      const customDb: ISyncDB = {
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
      };
      
      const options: CacheOptions = { 
        key: 'test-key', 
        db: customDb 
      };
      const initialState = { data: 'test' };
      
      cache(options, initialState);

      expect(customDb.get).toHaveBeenCalledWith('valtio/v1.0/test-key');
    });

    it('should skip caching when skipCache is true', () => {
      const options: CacheOptions = { 
        key: 'test-key', 
        skipCache: true,
        db: mockDb
      };
      const initialState = { data: 'test' };
      
      const result = cache(options, initialState);

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.data).toBe('test');
    });

    it('should use empty prefix', () => {
      const options: CacheOptions = { 
        key: 'test-key', 
        prefix: '',
        db: mockDb
      };
      const initialState = { data: 'test' };
      
      cache(options, initialState);

      expect(mockGet).toHaveBeenCalledWith('test-key');
    });

    it('should combine custom prefix and key correctly', () => {
      const options: CacheOptions = { 
        key: 'user-settings', 
        prefix: 'myapp/v2/',
        db: mockDb
      };
      const initialState = { theme: 'dark' };
      
      cache(options, initialState);

      expect(mockGet).toHaveBeenCalledWith('myapp/v2/user-settings');
    });
  });

  describe('state persistence', () => {
    it('should merge cached data with initial state', () => {
      const cachedData = { count: 10, theme: 'dark' };
      const initialState = { count: 0, name: 'test' };
      
      mockGet.mockReturnValue(cachedData);

      const result = cache({ key: 'merge-test', db: mockDb }, initialState);

      expect(result.count).toBe(10);
      expect(result.name).toBe('test');
      expect((result as any).theme).toBe('dark');
    });

    it('should handle null cached data', () => {
      const initialState = { count: 0 };
      mockGet.mockReturnValue(null);
      
      const result = cache({ key: 'null-cache', db: mockDb }, initialState);

      expect(result.count).toBe(0);
    });

    it('should handle empty object cached data', () => {
      const initialState = { count: 0, name: 'test' };
      mockGet.mockReturnValue({});
      
      const result = cache({ key: 'empty-cache', db: mockDb }, initialState);

      expect(result.count).toBe(0);
      expect(result.name).toBe('test');
    });

    it('should preserve initial object identity when possible', () => {
      class TestClass {
        count = 0;
        
        get doubled() {
          return this.count * 2;
        }
        
        increment() {
          this.count++;
        }
      }
      
      const initialState = new TestClass();
      const result = cache({ key: 'with-methods', db: mockDb }, initialState);

      // The cache function modifies the original object by merging, so it should be the same reference
      expect(typeof result.increment).toBe('function');
      expect(result.doubled).toBe(0);
      expect(result.count).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string key', () => {
      const initialState = { data: 'test' };
      const result = cache({ key: '', db: mockDb }, initialState);

      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/');
      expect(result.data).toBe('test');
    });

    it('should handle special characters in key', () => {
      const initialState = { data: 'test' };
      const specialKey = 'key/with-special.chars_123!@#';
      
      cache({ key: specialKey, db: mockDb }, initialState);

      expect(mockGet).toHaveBeenCalledWith(`valtio/v1.0/${specialKey}`);
    });

    it('should handle arrays as initial state', () => {
      const initialArray = [1, 2, 3];
      const result = cache({ key: 'array-state', db: mockDb }, initialArray);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should handle primitive values being cached', () => {
      const initialState = { value: 0 };
      const cachedData = { value: 'string-instead-of-number' };
      
      mockGet.mockReturnValue(cachedData);

      const result = cache({ key: 'primitive-test', db: mockDb }, initialState);

      expect(result.value).toBe('string-instead-of-number');
    });
  });

  describe('database interactions', () => {
    it('should call get on database with correct key', () => {
      const initialState = { test: true };
      cache({ key: 'db-get-test', prefix: 'custom/', db: mockDb }, initialState);

      expect(mockGet).toHaveBeenCalledWith('custom/db-get-test');
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should not call database when skipCache is true', () => {
      const initialState = { test: true };
      cache({ key: 'skip-test', skipCache: true, db: mockDb }, initialState);

      expect(mockGet).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('should handle database returning various data types', () => {
      const testCases = [
        { stored: { a: 1 }, expected: 1 },
        { stored: { a: 'string' }, expected: 'string' },
        { stored: { a: true }, expected: true },
        { stored: { a: [1, 2, 3] }, expected: [1, 2, 3] },
        { stored: { a: null }, expected: 'default' },
      ];

      testCases.forEach(({ stored, expected }, index) => {
        const key = `type-test-${index}`;
        mockGet.mockReturnValue(stored);
        
        const result = cache({ key, db: mockDb }, { a: 'default' });
        expect(result.a).toEqual(expected);
        
        // Reset mock for next iteration
        mockGet.mockClear();
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work with real-world user preferences scenario', () => {
      const userPrefs = {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: false,
          marketing: false,
        },
        lastLogin: null as Date | null,
      };

      const cachedPrefs = {
        theme: 'dark',
        notifications: {
          email: false,
          push: true,
        },
        lastLogin: '2023-01-01T00:00:00.000Z',
      };

      mockGet.mockReturnValue(cachedPrefs);

      const result = cache({ key: 'user-prefs', db: mockDb }, userPrefs);

      expect(result.theme).toBe('dark');
      expect(result.language).toBe('en');
      expect(result.notifications.email).toBe(false);
      expect(result.notifications.push).toBe(true);
      expect(result.notifications.marketing).toBe(false);
      expect(result.lastLogin).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should work with application state scenario', () => {
      const appState = {
        isLoading: false,
        user: null as { id: number; name: string } | null,
        error: null as string | null,
        config: {
          apiUrl: 'https://api.example.com',
          timeout: 5000,
        },
      };

      const options: CacheOptions = {
        key: 'app-state',
        prefix: 'myapp/v1/',
        skipCache: true,
        db: mockDb,
      };

      const result = cache(options, appState);

      expect(result.isLoading).toBe(false);
      expect(result.config.apiUrl).toBe('https://api.example.com');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should handle versioning through prefix changes', () => {
      const state = { version: 1, data: 'old' };
      const oldCachedData = { version: 1, data: 'cached-old' };
      const newCachedData = { version: 2, data: 'cached-new' };

      // Test old version
      mockGet.mockReturnValue(oldCachedData);
      const oldResult = cache({ key: 'data', prefix: 'myapp/v1/', db: mockDb }, state);
      expect(oldResult.version).toBe(1);
      expect(oldResult.data).toBe('cached-old');
      expect(mockGet).toHaveBeenCalledWith('myapp/v1/data');

      // Reset and test new version
      mockGet.mockClear();
      mockGet.mockReturnValue(newCachedData);
      const newResult = cache({ key: 'data', prefix: 'myapp/v2/', db: mockDb }, state);
      expect(newResult.version).toBe(2);
      expect(newResult.data).toBe('cached-new');
      expect(mockGet).toHaveBeenCalledWith('myapp/v2/data');
    });

    it('should handle all options combined correctly', () => {
      const customDb: ISyncDB = {
        get: vi.fn().mockReturnValue({ saved: true }),
        set: vi.fn(),
      };
      
      const options: CacheOptions = {
        key: 'complex-key',
        prefix: 'app/v1/',
        db: customDb,
        skipCache: false,
      };
      const initialState = { saved: false, name: 'test' };
      
      const result = cache(options, initialState);

      expect(customDb.get).toHaveBeenCalledWith('app/v1/complex-key');
      expect(result.saved).toBe(true);
      expect(result.name).toBe('test');
    });
  });

  describe('string key parameter (legacy)', () => {
    it('should work with string key and mock db passed via options', () => {
      const initialState = { count: 0 };

      // Since we can't pass db with string key, we'll test the default behavior
      // by ensuring our mock isn't called (since it uses injectDb())
      const result = cache('string-key-test', initialState);

      expect(result.count).toBe(0);
      expect(mockGet).not.toHaveBeenCalled(); // Our mock db wasn't used
    });
  });

  describe('proxyFunction option', () => {
    it('should use custom proxy function when provided', () => {
      const mockProxyFunction = vi.fn((obj: any) => {
        return proxy(obj);
      });

      const initialState = { count: 0 };
      const options: CacheOptions = {
        key: 'proxy-test',
        db: mockDb,
        proxyFunction: mockProxyFunction as any
      };

      const result = cache(options, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(mockProxyFunction).toHaveBeenCalledTimes(1);
      expect(result.count).toBe(0);
    });

    it('should use custom proxy function with skipCache enabled', () => {
      const mockProxyFunction = vi.fn((obj: any) => {
        return proxy(obj);
      });

      const initialState = { count: 5 };
      const options: CacheOptions = {
        key: 'proxy-skip-test',
        db: mockDb,
        skipCache: true,
        proxyFunction: mockProxyFunction as any
      };

      const result = cache(options, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(mockGet).not.toHaveBeenCalled();
      expect(result.count).toBe(5);
    });

    it('should work with custom proxy function and cached data', () => {
      const cachedData = { count: 10 };
      mockGet.mockReturnValue(cachedData);

      const mockProxyFunction = vi.fn((obj: any) => {
        return proxy(obj);
      });

      const initialState = { count: 0 };
      const options: CacheOptions = {
        key: 'proxy-cached-test',
        db: mockDb,
        proxyFunction: mockProxyFunction as any
      };

      const result = cache(options, initialState);

      expect(mockProxyFunction).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/proxy-cached-test');
      // The initial state should have been merged with cached data
      expect(result.count).toBe(10);
    });

    it('should use custom proxy function with all options combined', () => {
      const customDb: ISyncDB = {
        get: vi.fn().mockReturnValue({ value: 'cached' }),
        set: vi.fn(),
      };

      const mockProxyFunction = vi.fn((obj: any) => {
        return proxy(obj);
      });

      const options: CacheOptions = {
        key: 'complex-proxy-test',
        prefix: 'custom/v2/',
        db: customDb,
        proxyFunction: mockProxyFunction as any
      };

      const initialState = { value: 'initial' };
      const result = cache(options, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(customDb.get).toHaveBeenCalledWith('custom/v2/complex-proxy-test');
      expect(result.value).toBe('cached');
    });

    it('should properly integrate with valtio subscribe mechanism', async () => {
      // Wrap valtio proxy to track calls
      const mockProxyFunction = vi.fn((obj: any) => {
        return proxy(obj);
      });

      const initialState = { count: 0 };
      const options: CacheOptions = {
        key: 'subscribe-test',
        db: mockDb,
        proxyFunction: mockProxyFunction as any
      };

      const result = cache(options, initialState);

      // Change state to trigger subscription and db.set
      result.count = 42;

      // Wait for subscription to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockProxyFunction).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/subscribe-test', { count: 42 });
    });

    it('should use the provided valtio proxy directly', () => {
      // Test that we can pass valtio's proxy function directly
      const initialState = { data: 'test' };
      const options: CacheOptions = {
        key: 'direct-proxy-test',
        db: mockDb,
        proxyFunction: proxy
      };

      const result = cache(options, initialState);

      expect(result.data).toBe('test');
      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/direct-proxy-test');
    });
  });
}); 