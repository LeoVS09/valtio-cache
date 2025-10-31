import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { proxy, subscribe } from 'valtio';
import { cache, cacheFactory, type CacheOptions } from '../cache';
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

  describe('subscribeFunction option', () => {
    it('should use custom subscribe function when provided', async () => {
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        // Call the original subscribe function
        return subscribe(state, callback);
      });

      const initialState = { count: 0 };
      const options: CacheOptions = {
        key: 'subscribe-fn-test',
        db: mockDb,
        subscribeFunction: mockSubscribeFunction as any
      };

      const result = cache(options, initialState);

      expect(mockSubscribeFunction).toHaveBeenCalledTimes(1);
      expect(mockSubscribeFunction).toHaveBeenCalledWith(result, expect.any(Function));

      // Trigger state change to verify subscribe is working
      result.count = 5;

      // Wait for subscription to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/subscribe-fn-test', { count: 5 });
    });

    it('should use custom subscribe function with skipCache enabled', () => {
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });

      const initialState = { count: 5 };
      const options: CacheOptions = {
        key: 'subscribe-skip-test',
        db: mockDb,
        skipCache: true,
        subscribeFunction: mockSubscribeFunction as any
      };

      const result = cache(options, initialState);

      // Subscribe should not be called when skipCache is true
      expect(mockSubscribeFunction).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
      expect(result.count).toBe(5);
    });

    it('should work with custom subscribe function and cached data', async () => {
      const cachedData = { count: 10 };
      mockGet.mockReturnValue(cachedData);

      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });

      const initialState = { count: 0 };
      const options: CacheOptions = {
        key: 'subscribe-cached-test',
        db: mockDb,
        subscribeFunction: mockSubscribeFunction as any
      };

      const result = cache(options, initialState);

      expect(mockSubscribeFunction).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/subscribe-cached-test');
      expect(result.count).toBe(10);

      // Verify subscribe callback works
      result.count = 20;
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/subscribe-cached-test', { count: 20 });
    });

    it('should use both custom proxy and subscribe functions together', async () => {
      const mockProxyFunction = vi.fn((obj: any) => {
        return proxy(obj);
      });

      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });

      const initialState = { value: 'test' };
      const options: CacheOptions = {
        key: 'both-custom-test',
        db: mockDb,
        proxyFunction: mockProxyFunction as any,
        subscribeFunction: mockSubscribeFunction as any
      };

      const result = cache(options, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(mockSubscribeFunction).toHaveBeenCalledWith(result, expect.any(Function));

      result.value = 'updated';
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/both-custom-test', { value: 'updated' });
    });

    it('should use custom subscribe function with all options combined', async () => {
      const customDb: ISyncDB = {
        get: vi.fn().mockReturnValue({ value: 'cached' }),
        set: vi.fn(),
      };

      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });

      const options: CacheOptions = {
        key: 'complex-subscribe-test',
        prefix: 'custom/v2/',
        db: customDb,
        subscribeFunction: mockSubscribeFunction as any
      };

      const initialState = { value: 'initial' };
      const result = cache(options, initialState);

      expect(mockSubscribeFunction).toHaveBeenCalled();
      expect(customDb.get).toHaveBeenCalledWith('custom/v2/complex-subscribe-test');
      expect(result.value).toBe('cached');

      result.value = 'modified';
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(customDb.set).toHaveBeenCalledWith('custom/v2/complex-subscribe-test', { value: 'modified' });
    });

    it('should properly trigger db.set through custom subscribe function', async () => {
      let subscribeCallback: (() => void) | null = null;

      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        subscribeCallback = callback;
        return subscribe(state, callback);
      });

      const initialState = { counter: 0 };
      const options: CacheOptions = {
        key: 'trigger-test',
        db: mockDb,
        subscribeFunction: mockSubscribeFunction as any
      };

      const result = cache(options, initialState);

      expect(subscribeCallback).not.toBeNull();
      expect(mockSubscribeFunction).toHaveBeenCalledWith(result, expect.any(Function));

      result.counter = 99;
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/trigger-test', { counter: 99 });
    });
  });
});

describe('cacheFactory', () => {
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
    it('should create a cache function with proxy function', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const initialState = { count: 0 };
      const result = myCache({ key: 'test-key', db: mockDb }, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(result.count).toBe(0);
    });

    it('should create a cache function with subscribe function', async () => {
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });
      
      const myCache = cacheFactory({
        subscribeFunction: mockSubscribeFunction as any
      });

      const initialState = { count: 0 };
      const result = myCache({ key: 'test-key', db: mockDb }, initialState);

      expect(mockSubscribeFunction).toHaveBeenCalledWith(result, expect.any(Function));
      
      result.count = 5;
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/test-key', { count: 5 });
    });

    it('should create a cache function with both proxy and subscribe functions', async () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any,
        subscribeFunction: mockSubscribeFunction as any
      });

      const initialState = { count: 0 };
      const result = myCache({ key: 'test-key', db: mockDb }, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(mockSubscribeFunction).toHaveBeenCalledWith(result, expect.any(Function));
      
      result.count = 10;
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/test-key', { count: 10 });
    });
  });

  describe('string key parameter', () => {
    it('should work with string key', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const initialState = { count: 0 };
      const result = myCache('test-key', initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(result.count).toBe(0);
    });

    it('should convert string key to options object', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const initialState = { value: 'test' };
      myCache('my-string-key', initialState);

      expect(mockProxyFunction).toHaveBeenCalled();
    });
  });

  describe('options merging', () => {
    it('should merge factory options with instance options', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any,
        subscribeFunction: mockSubscribeFunction as any
      });

      const initialState = { count: 0 };
      const options: CacheOptions = {
        key: 'merge-test',
        prefix: 'custom/',
        db: mockDb
      };
      
      const result = myCache(options, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(mockSubscribeFunction).toHaveBeenCalledWith(result, expect.any(Function));
      expect(mockGet).toHaveBeenCalledWith('custom/merge-test');
    });

    it('should allow instance options to override factory options', () => {
      const factoryProxyFunction = vi.fn((obj: any) => proxy(obj));
      const instanceProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: factoryProxyFunction as any
      });

      const initialState = { count: 0 };
      const options: CacheOptions = {
        key: 'override-test',
        db: mockDb,
        proxyFunction: instanceProxyFunction as any
      };
      
      const result = myCache(options, initialState);

      // Instance option should override factory option
      expect(instanceProxyFunction).toHaveBeenCalledWith(initialState);
      expect(factoryProxyFunction).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });

    it('should preserve all cache options when using factory', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const cachedData = { count: 10 };
      mockGet.mockReturnValue(cachedData);

      const initialState = { count: 0 };
      const options: CacheOptions = {
        key: 'preserve-test',
        prefix: 'app/v1/',
        db: mockDb,
        skipCache: false
      };
      
      const result = myCache(options, initialState);

      expect(mockProxyFunction).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith('app/v1/preserve-test');
      expect(result.count).toBe(10);
    });
  });

  describe('skipCache behavior', () => {
    it('should skip cache when skipCache is true', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any,
        subscribeFunction: mockSubscribeFunction as any
      });

      const initialState = { count: 0 };
      const result = myCache({ key: 'skip-test', skipCache: true, db: mockDb }, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(mockSubscribeFunction).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
      expect(result.count).toBe(0);
    });

    it('should use cache when skipCache is false', async () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any,
        subscribeFunction: mockSubscribeFunction as any
      });

      const cachedData = { count: 5 };
      mockGet.mockReturnValue(cachedData);

      const initialState = { count: 0 };
      const result = myCache({ key: 'use-cache-test', skipCache: false, db: mockDb }, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(mockSubscribeFunction).toHaveBeenCalledWith(result, expect.any(Function));
      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/use-cache-test');
      expect(result.count).toBe(5);
    });
  });

  describe('cached data retrieval', () => {
    it('should retrieve and merge cached data', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const cachedData = { count: 20, theme: 'dark' };
      mockGet.mockReturnValue(cachedData);

      const initialState = { count: 0, name: 'test' };
      const result = myCache({ key: 'cached-test', db: mockDb }, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/cached-test');
      expect(result.count).toBe(20);
      expect(result.name).toBe('test');
      expect((result as any).theme).toBe('dark');
    });

    it('should handle null cached data', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      mockGet.mockReturnValue(null);

      const initialState = { count: 0 };
      const result = myCache({ key: 'null-cache-test', db: mockDb }, initialState);

      expect(result.count).toBe(0);
    });

    it('should handle empty cached data', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      mockGet.mockReturnValue({});

      const initialState = { count: 0, name: 'test' };
      const result = myCache({ key: 'empty-cache-test', db: mockDb }, initialState);

      expect(result.count).toBe(0);
      expect(result.name).toBe('test');
    });
  });

  describe('state persistence', () => {
    it('should persist state changes to database', async () => {
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });
      
      const myCache = cacheFactory({
        subscribeFunction: mockSubscribeFunction as any
      });

      const initialState = { count: 0 };
      const result = myCache({ key: 'persist-test', db: mockDb }, initialState);

      result.count = 42;
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/persist-test', { count: 42 });
    });

    it('should persist complex state changes', async () => {
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });
      
      const myCache = cacheFactory({
        subscribeFunction: mockSubscribeFunction as any
      });

      const initialState = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'light' }
      };
      const result = myCache({ key: 'complex-persist-test', db: mockDb }, initialState);

      result.user.age = 31;
      result.settings.theme = 'dark';
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/complex-persist-test', {
        user: { name: 'John', age: 31 },
        settings: { theme: 'dark' }
      });
    });
  });

  describe('prefix handling', () => {
    it('should use custom prefix from options', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const initialState = { count: 0 };
      myCache({ key: 'prefix-test', prefix: 'myapp/v2/', db: mockDb }, initialState);

      expect(mockGet).toHaveBeenCalledWith('myapp/v2/prefix-test');
    });

    it('should use default prefix when not specified', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const initialState = { count: 0 };
      myCache({ key: 'default-prefix-test', db: mockDb }, initialState);

      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/default-prefix-test');
    });

    it('should use empty prefix when explicitly set', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const initialState = { count: 0 };
      myCache({ key: 'no-prefix-test', prefix: '', db: mockDb }, initialState);

      expect(mockGet).toHaveBeenCalledWith('no-prefix-test');
    });
  });

  describe('real valtio functions', () => {
    it('should work with real valtio proxy and subscribe functions', async () => {
      const myCache = cacheFactory({
        proxyFunction: proxy,
        subscribeFunction: subscribe
      });

      const initialState = { count: 0 };
      const result = myCache({ key: 'real-valtio-test', db: mockDb }, initialState);

      expect(result.count).toBe(0);
      
      result.count = 100;
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/real-valtio-test', { count: 100 });
    });

    it('should work with real valtio and cached data', () => {
      const myCache = cacheFactory({
        proxyFunction: proxy,
        subscribeFunction: subscribe
      });

      const cachedData = { count: 50 };
      mockGet.mockReturnValue(cachedData);

      const initialState = { count: 0 };
      const result = myCache({ key: 'real-valtio-cached-test', db: mockDb }, initialState);

      expect(result.count).toBe(50);
      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/real-valtio-cached-test');
    });
  });

  describe('multiple instances', () => {
    it('should create independent cache instances', async () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any,
        subscribeFunction: mockSubscribeFunction as any
      });

      const state1 = myCache({ key: 'instance-1', db: mockDb }, { count: 0 });
      const state2 = myCache({ key: 'instance-2', db: mockDb }, { count: 10 });

      expect(mockProxyFunction).toHaveBeenCalledTimes(2);
      expect(mockSubscribeFunction).toHaveBeenCalledTimes(2);
      expect(state1.count).toBe(0);
      expect(state2.count).toBe(10);

      state1.count = 5;
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(state1.count).toBe(5);
      expect(state2.count).toBe(10);
    });

    it('should create independent cache instances with different keys', () => {
      const myCache = cacheFactory({
        proxyFunction: proxy,
        subscribeFunction: subscribe
      });

      const userState = myCache({ key: 'user', db: mockDb }, { name: 'John' });
      const appState = myCache({ key: 'app', db: mockDb }, { theme: 'light' });

      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/user');
      expect(mockGet).toHaveBeenCalledWith('valtio/v1.0/app');
      expect((userState as any).name).toBe('John');
      expect((appState as any).theme).toBe('light');
    });
  });

  describe('edge cases', () => {
    it('should handle factory with only proxyFunction', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const initialState = { count: 0 };
      const result = myCache({ key: 'only-proxy-test', db: mockDb }, initialState);

      expect(mockProxyFunction).toHaveBeenCalledWith(initialState);
      expect(result.count).toBe(0);
    });

    it('should handle factory with only subscribeFunction', async () => {
      const mockSubscribeFunction = vi.fn((state: any, callback: () => void) => {
        return subscribe(state, callback);
      });
      
      const myCache = cacheFactory({
        subscribeFunction: mockSubscribeFunction as any
      });

      const initialState = { count: 0 };
      const result = myCache({ key: 'only-subscribe-test', db: mockDb }, initialState);

      expect(mockSubscribeFunction).toHaveBeenCalledWith(result, expect.any(Function));
      
      result.count = 7;
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/only-subscribe-test', { count: 7 });
    });

    it('should handle empty factory options', () => {
      const myCache = cacheFactory({});

      const initialState = { count: 0 };
      const result = myCache({ key: 'empty-factory-test', db: mockDb }, initialState);

      expect(result.count).toBe(0);
    });

    it('should work with arrays as initial state', () => {
      const mockProxyFunction = vi.fn((obj: any) => proxy(obj));
      
      const myCache = cacheFactory({
        proxyFunction: mockProxyFunction as any
      });

      const initialArray = [1, 2, 3];
      const result = myCache({ key: 'array-test', db: mockDb }, initialArray);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(mockProxyFunction).toHaveBeenCalledWith(initialArray);
    });

    it('should preserve methods and getters from initial state', () => {
      const myCache = cacheFactory({
        proxyFunction: proxy,
        subscribeFunction: subscribe
      });

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
      const result = myCache({ key: 'with-methods-test', db: mockDb }, initialState);

      expect(typeof (result as any).increment).toBe('function');
      expect((result as any).doubled).toBe(0);
      (result as any).increment();
      expect((result as any).count).toBe(1);
      expect((result as any).doubled).toBe(2);
    });
  });

  describe('integration scenarios', () => {
    it('should work in a typical app setup scenario', async () => {
      // Simulate a typical setup where you create a cache factory once
      const myCache = cacheFactory({
        proxyFunction: proxy,
        subscribeFunction: subscribe
      });

      // Create multiple state stores
      const userPrefs = myCache({ key: 'user-prefs', db: mockDb }, {
        theme: 'light',
        language: 'en'
      });

      const appState = myCache({ key: 'app-state', db: mockDb }, {
        isLoading: false,
        data: null as any
      });

      expect(userPrefs.theme).toBe('light');
      expect(appState.isLoading).toBe(false);

      // Modify state
      userPrefs.theme = 'dark';
      appState.isLoading = true;

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/user-prefs', {
        theme: 'dark',
        language: 'en'
      });
      expect(mockSet).toHaveBeenCalledWith('valtio/v1.0/app-state', {
        isLoading: true,
        data: null
      });
    });

    it('should handle multiple factories with different configurations', () => {
      const factory1ProxyFunction = vi.fn((obj: any) => proxy(obj));
      const factory2ProxyFunction = vi.fn((obj: any) => proxy(obj));

      const cache1 = cacheFactory({
        proxyFunction: factory1ProxyFunction as any
      });

      const cache2 = cacheFactory({
        proxyFunction: factory2ProxyFunction as any
      });

      const state1 = cache1({ key: 'factory1-state', db: mockDb }, { value: 1 });
      const state2 = cache2({ key: 'factory2-state', db: mockDb }, { value: 2 });

      expect(factory1ProxyFunction).toHaveBeenCalledTimes(1);
      expect(factory2ProxyFunction).toHaveBeenCalledTimes(1);
      expect(state1.value).toBe(1);
      expect(state2.value).toBe(2);
    });
  });
}); 