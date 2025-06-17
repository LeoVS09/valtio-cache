/**
 * Deep clone object without methods, getter and setters,
 * Specifically tailored deep clone implementation for valtio proxy.
 * */
export function plainDeepClone<T extends object>(target: T): T {
  if (!target) {
    return target;
  }

  const keys = Object.keys(target).filter(key => isPlainField(target, key));

  const result: any = {};
  for (const key of keys) {
    const value = (target as any)[key];
    if (Array.isArray(value)) {
      // Clone arrays by creating new array and recursively cloning elements
      result[key] = value.map(item => 
        item && typeof item === 'object' ? plainDeepClone(item) : item
      );
      continue;
    }
    
    if (typeof value !== 'object' || value === null) {
      result[key] = value;
      continue;
    }

    // value is object
    result[key] = plainDeepClone(value);
  }

  return result;
}

/**
 * Determine if object field is simple field,
 * in other terms not a method, getter or setter
 */
export const isPlainField = (target: object, key: string): boolean => {
  // First check if the value itself is a function (for inherited methods)
  const value = (target as any)[key];
  if (typeof value === 'function') {
    return false;
  }

  const desc = Object.getOwnPropertyDescriptor(target, key);
  if (!desc) {
    // if it not exists, then probably it is plain
    return true;
  }

  // if it getter or setter
  if (desc.get || desc.set) {
    return false;
  }

  // is it value function, then it is method
  return typeof desc.value !== 'function';
};