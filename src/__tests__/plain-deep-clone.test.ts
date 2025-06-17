import { expect, test, describe } from 'vitest'
import { plainDeepClone, isPlainField } from '../plain-deep-clone'

describe('plainDeepClone', () => {
  test('should return the same value for null and undefined', () => {
    expect(plainDeepClone(null as any)).toBe(null)
    expect(plainDeepClone(undefined as any)).toBe(undefined)
  })

  test('should clone simple objects with primitive values', () => {
    const original = { a: 1, b: 'hello', c: true }
    const cloned = plainDeepClone(original)
    
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.a).toBe(1)
    expect(cloned.b).toBe('hello')
    expect(cloned.c).toBe(true)
  })

  test('should clone nested objects', () => {
    const original = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 'nested'
        }
      }
    }
    const cloned = plainDeepClone(original)
    
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.b).not.toBe(original.b)
    expect(cloned.b.d).not.toBe(original.b.d)
    expect(cloned.b.d.e).toBe('nested')
  })

  test('should clone arrays', () => {
    const original = {
      numbers: [1, 2, 3],
      strings: ['a', 'b', 'c'],
      mixed: [1, 'hello', true]
    }
    const cloned = plainDeepClone(original)
    
    expect(cloned).toEqual(original)
    expect(cloned.numbers).toEqual([1, 2, 3])
    expect(cloned.strings).toEqual(['a', 'b', 'c'])
    expect(cloned.mixed).toEqual([1, 'hello', true])
  })

  test('should filter out methods', () => {
    const original = {
      a: 1,
      method: function() { return 'hello' },
      arrow: () => 'world',
      b: 'text'
    }
    const cloned = plainDeepClone(original)
    
    expect(cloned.a).toBe(1)
    expect(cloned.b).toBe('text')
    expect(cloned.method).toBeUndefined()
    expect(cloned.arrow).toBeUndefined()
    expect('method' in cloned).toBe(false)
    expect('arrow' in cloned).toBe(false)
  })

  test('should filter out getters and setters', () => {
    const original = {
      a: 1,
      b: 'text'
    }
    
    Object.defineProperty(original, 'getter', {
      get() { return 'getter value' },
      enumerable: true
    })
    
    Object.defineProperty(original, 'setter', {
      set(value) { /* do nothing */ },
      enumerable: true
    })
    
    Object.defineProperty(original, 'getterSetter', {
      get() { return 'getter setter value' },
      set(value) { /* do nothing */ },
      enumerable: true
    })
    
    const cloned = plainDeepClone(original)
    
    expect(cloned.a).toBe(1)
    expect(cloned.b).toBe('text')
    expect((cloned as any).getter).toBeUndefined()
    expect((cloned as any).setter).toBeUndefined()
    expect((cloned as any).getterSetter).toBeUndefined()
    expect('getter' in cloned).toBe(false)
    expect('setter' in cloned).toBe(false)
    expect('getterSetter' in cloned).toBe(false)
  })

  test('should handle complex nested structures with mixed types', () => {
    const original = {
      user: {
        id: 1,
        name: 'John',
        settings: {
          theme: 'dark',
          notifications: true
        },
        tags: ['admin', 'user']
      },
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2', meta: { priority: 'high' } }
      ],
      config: {
        version: '1.0.0',
        features: {
          experimental: false
        }
      }
    }
    
    const cloned = plainDeepClone(original)
    
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.user).not.toBe(original.user)
    expect(cloned.user.settings).not.toBe(original.user.settings)
    expect(cloned.items).not.toBe(original.items)
    expect(cloned.config).not.toBe(original.config)
    expect(cloned.config.features).not.toBe(original.config.features)
  })

  test('should handle objects with null and undefined values', () => {
    const original = {
      a: null,
      b: undefined,
      c: 'value',
      nested: {
        x: null,
        y: undefined,
        z: 42
      }
    }
    
    const cloned = plainDeepClone(original)
    
    expect(cloned).toEqual(original)
    expect(cloned.a).toBe(null)
    expect(cloned.b).toBe(undefined)
    expect(cloned.c).toBe('value')
    expect(cloned.nested.x).toBe(null)
    expect(cloned.nested.y).toBe(undefined)
    expect(cloned.nested.z).toBe(42)
  })

  test('should handle empty objects and arrays', () => {
    const original = {
      emptyObj: {},
      emptyArray: [],
      nested: {
        anotherEmpty: {}
      }
    }
    
    const cloned = plainDeepClone(original)
    
    expect(cloned).toEqual(original)
    expect(cloned.emptyObj).toEqual({})
    expect(cloned.emptyArray).toEqual([])
    expect(cloned.nested.anotherEmpty).toEqual({})
  })
})

describe('isPlainField', () => {
  test('should return true for regular properties', () => {
    const obj = { a: 1, b: 'string', c: true, d: null, e: undefined }
    
    expect(isPlainField(obj, 'a')).toBe(true)
    expect(isPlainField(obj, 'b')).toBe(true)
    expect(isPlainField(obj, 'c')).toBe(true)
    expect(isPlainField(obj, 'd')).toBe(true)
    expect(isPlainField(obj, 'e')).toBe(true)
  })

  test('should return false for methods', () => {
    const obj = {
      regular: 'value',
      method: function() { return 'hello' },
      arrow: () => 'world'
    }
    
    expect(isPlainField(obj, 'regular')).toBe(true)
    expect(isPlainField(obj, 'method')).toBe(false)
    expect(isPlainField(obj, 'arrow')).toBe(false)
  })

  test('should return false for getters', () => {
    const obj = { regular: 'value' }
    
    Object.defineProperty(obj, 'getter', {
      get() { return 'getter value' },
      enumerable: true
    })
    
    expect(isPlainField(obj, 'regular')).toBe(true)
    expect(isPlainField(obj, 'getter')).toBe(false)
  })

  test('should return false for setters', () => {
    const obj = { regular: 'value' }
    
    Object.defineProperty(obj, 'setter', {
      set(value) { /* do nothing */ },
      enumerable: true
    })
    
    expect(isPlainField(obj, 'regular')).toBe(true)
    expect(isPlainField(obj, 'setter')).toBe(false)
  })

  test('should return false for getter-setter combinations', () => {
    const obj = { regular: 'value' }
    
    Object.defineProperty(obj, 'getterSetter', {
      get() { return 'value' },
      set(value) { /* do nothing */ },
      enumerable: true
    })
    
    expect(isPlainField(obj, 'regular')).toBe(true)
    expect(isPlainField(obj, 'getterSetter')).toBe(false)
  })

  test('should return true for non-existent properties', () => {
    const obj = { a: 1 }
    
    expect(isPlainField(obj, 'nonexistent')).toBe(true)
  })

  test('should handle inherited properties', () => {
    class Parent {
      parentMethod() { return 'parent' }
      parentProp = 'parent value'
    }
    
    class Child extends Parent {
      childMethod() { return 'child' }
      childProp = 'child value'
    }
    
    const instance = new Child()
    
    expect(isPlainField(instance, 'childProp')).toBe(true)
    expect(isPlainField(instance, 'parentProp')).toBe(true)
    expect(isPlainField(instance, 'childMethod')).toBe(false)
    expect(isPlainField(instance, 'parentMethod')).toBe(false)
  })

  test('should handle objects with symbol keys', () => {
    const sym = Symbol('test')
    const obj = {
      regular: 'value',
      [sym]: 'symbol value'
    }
    
    expect(isPlainField(obj, 'regular')).toBe(true)
    // Symbol keys are not enumerable by Object.keys by default
    expect(isPlainField(obj, sym.toString())).toBe(true)
  })

  test('should handle configurable and enumerable properties', () => {
    const obj = { regular: 'value' }
    
    Object.defineProperty(obj, 'nonConfigurable', {
      value: 'test',
      configurable: false,
      enumerable: true
    })
    
    Object.defineProperty(obj, 'nonEnumerable', {
      value: 'test',
      configurable: true,
      enumerable: false
    })
    
    expect(isPlainField(obj, 'regular')).toBe(true)
    expect(isPlainField(obj, 'nonConfigurable')).toBe(true)
    expect(isPlainField(obj, 'nonEnumerable')).toBe(true)
  })
}) 