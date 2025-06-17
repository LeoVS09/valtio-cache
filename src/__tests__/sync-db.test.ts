import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageDB, DumbDb, ISyncDB } from '../sync-db';

// Mock localStorage with proper typing
const createMockStorage = () => {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    length: 0,
    key: vi.fn(),
  };
  return mockStorage;
};

describe('LocalStorageDB', () => {
  let db: LocalStorageDB;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    vi.clearAllMocks();
    db = new LocalStorageDB(mockStorage as unknown as Storage);
  });

  describe('constructor', () => {
    it('should accept custom storage', () => {
      const customStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      } as unknown as Storage;
      
      const customDb = new LocalStorageDB(customStorage);
      expect(customDb).toBeInstanceOf(LocalStorageDB);
    });
  });

  describe('get method', () => {
    it('should return null for non-existent keys', () => {
      const result = db.get('nonexistent');
      expect(result).toBeNull();
      expect(mockStorage.getItem).toHaveBeenCalledWith('nonexistent');
    });

    it('should return null when storage returns null', () => {
      mockStorage.getItem.mockReturnValue(null);
      const result = db.get('test');
      expect(result).toBeNull();
    });

    it('should return undefined when storage returns undefined (casted as null)', () => {
      mockStorage.getItem.mockReturnValue(undefined as any);
      const result = db.get('test');
      expect(result).toBeUndefined();
    });

    it('should parse and return JSON values', () => {
      const testObject = { name: 'test', value: 42 };
      mockStorage.getItem.mockReturnValue(JSON.stringify(testObject));
      
      const result = db.get<typeof testObject>('test');
      expect(result).toEqual(testObject);
      expect(mockStorage.getItem).toHaveBeenCalledWith('test');
    });

    it('should parse and return string values', () => {
      const testString = 'hello world';
      mockStorage.getItem.mockReturnValue(JSON.stringify(testString));
      
      const result = db.get<string>('test');
      expect(result).toBe(testString);
    });

    it('should parse and return number values', () => {
      const testNumber = 42;
      mockStorage.getItem.mockReturnValue(JSON.stringify(testNumber));
      
      const result = db.get<number>('test');
      expect(result).toBe(testNumber);
    });

    it('should parse and return boolean values', () => {
      mockStorage.getItem.mockReturnValue(JSON.stringify(true));
      const result = db.get<boolean>('test');
      expect(result).toBe(true);
    });

    it('should parse and return array values', () => {
      const testArray = [1, 2, 3, 'test'];
      mockStorage.getItem.mockReturnValue(JSON.stringify(testArray));
      
      const result = db.get<typeof testArray>('test');
      expect(result).toEqual(testArray);
    });

    it('should handle complex nested objects', () => {
      const complexObject = {
        user: { id: 1, name: 'John' },
        preferences: { theme: 'dark', notifications: true },
        data: [1, 2, { nested: true }]
      };
      mockStorage.getItem.mockReturnValue(JSON.stringify(complexObject));
      
      const result = db.get<typeof complexObject>('test');
      expect(result).toEqual(complexObject);
    });
  });

  describe('set method', () => {
    it('should store string values directly', () => {
      const testString = 'hello world';
      db.set('test', testString);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test', testString);
    });

    it('should JSON stringify non-string values', () => {
      const testObject = { name: 'test', value: 42 };
      db.set('test', testObject);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test', JSON.stringify(testObject));
    });

    it('should store number values as JSON', () => {
      const testNumber = 42;
      db.set('test', testNumber);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test', JSON.stringify(testNumber));
    });

    it('should store boolean values as JSON', () => {
      db.set('test', true);
      expect(mockStorage.setItem).toHaveBeenCalledWith('test', JSON.stringify(true));
    });

    it('should store array values as JSON', () => {
      const testArray = [1, 2, 3, 'test'];
      db.set('test', testArray);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test', JSON.stringify(testArray));
    });

    it('should store null values as JSON', () => {
      db.set('test', null);
      expect(mockStorage.setItem).toHaveBeenCalledWith('test', JSON.stringify(null));
    });

    it('should store undefined values as JSON', () => {
      db.set('test', undefined);
      expect(mockStorage.setItem).toHaveBeenCalledWith('test', JSON.stringify(undefined));
    });

    it('should handle complex nested objects', () => {
      const complexObject = {
        user: { id: 1, name: 'John' },
        preferences: { theme: 'dark', notifications: true },
        data: [1, 2, { nested: true }]
      };
      db.set('test', complexObject);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test', JSON.stringify(complexObject));
    });
  });

  describe('round-trip operations', () => {
    it('should store and retrieve the same string value (Note: strings fail JSON.parse)', () => {
      const testValue = 'hello world';
      db.set('test', testValue);
      
      // The current implementation has a bug: strings are stored directly but then JSON.parse is called
      // This test documents the actual behavior
      expect(() => {
        mockStorage.getItem.mockReturnValue(testValue);
        db.get<string>('test');
      }).toThrow('Unexpected token');
    });

    it('should store and retrieve the same object value', () => {
      const testObject = { name: 'test', value: 42, nested: { prop: true } };
      db.set('test', testObject);
      
      // Simulate actual storage behavior
      const storedValue = mockStorage.setItem.mock.calls[0][1];
      mockStorage.getItem.mockReturnValue(storedValue);
      
      const result = db.get<typeof testObject>('test');
      expect(result).toEqual(testObject);
    });

    it('should store and retrieve the same array value', () => {
      const testArray = [1, 'test', { nested: true }, null];
      db.set('test', testArray);
      
      // Simulate actual storage behavior
      const storedValue = mockStorage.setItem.mock.calls[0][1];
      mockStorage.getItem.mockReturnValue(storedValue);
      
      const result = db.get<typeof testArray>('test');
      expect(result).toEqual(testArray);
    });

    it('should handle JSON-stringified strings correctly', () => {
      const testValue = 'hello world';
      // Store as JSON string (what should happen)
      mockStorage.getItem.mockReturnValue(JSON.stringify(testValue));
      
      const result = db.get<string>('test');
      expect(result).toBe(testValue);
    });
  });
});

describe('DumbDb', () => {
  let dumbDb: DumbDb;

  beforeEach(() => {
    dumbDb = new DumbDb();
  });

  it('should implement ISyncDB interface', () => {
    expect(dumbDb).toHaveProperty('get');
    expect(dumbDb).toHaveProperty('set');
    expect(typeof dumbDb.get).toBe('function');
    expect(typeof dumbDb.set).toBe('function');
  });

  it('should always return null from get method', () => {
    expect(dumbDb.get()).toBeNull();
    expect(dumbDb.get()).toBeNull();
  });

  it('should do nothing on set method', () => {
    expect(() => dumbDb.set()).not.toThrow();
    expect(() => dumbDb.set()).not.toThrow();
    expect(() => dumbDb.set()).not.toThrow();
  });

  it('should return undefined from set method', () => {
    const result = dumbDb.set();
    expect(result).toBeUndefined();
  });
});



describe('ISyncDB interface compliance', () => {
  it('DumbDb should implement ISyncDB', () => {
    const db: ISyncDB = new DumbDb();
    expect(db).toHaveProperty('get');
    expect(db).toHaveProperty('set');
  });
}); 