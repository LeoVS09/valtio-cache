import {proxy, subscribe} from 'valtio';

import {ISyncDB, injectDb} from './sync-db';
import {plainDeepClone} from './plain-deep-clone';
import { deepMerge } from './merge';

/**
 * Default prefix used for local storage keys to avoid collisions.
 * Uses library version and name as prefix.
 */
export const DEFAULT_PREFIX = 'valtio/v1.0/'

/**
 * Configuration options for the cache function.
 */
export interface CacheOptions {
  /** 
   * Unique key to retrieve and save proxy state in local storage.
   * Must be unique per proxy definition to avoid conflicts.
   */
  key: string;
  /** 
   * Prefix to use for the local storage key.
   * Can be used for versioning or to avoid key collisions between different applications.
   * @default 'valtio/v0.1/'
   */
  prefix?: string;
  /** 
   * If true, will not save to or retrieve application data from storage.
   * Usually set by environment variables for development or testing.
   * @default false
   */
  skipCache?: boolean;
  /** 
   * Custom database instance to use for caching.
   * If not provided, will use the default local storage database.
   */
  db?: ISyncDB;

  /** 
   * Fix for "TypeError: proxyState is not iterable" error 
   * that can be caused by incorrect build process,
   * allow to provide proxy function directly from 'valtio' package
   * @default valtio.proxy
   * */
  proxyFunction?: typeof proxy
}

/**
 * Creates a cached valtio proxy that automatically persists state to local storage.
 * 
 * The function merges any existing cached data with the initial object and
 * automatically saves state changes to the specified storage key.
 * 
 * @template T - The type of the object to be cached
 * @param keyOrOptions - Either a string key or a CacheOptions object for configuration
 * @param initialObject - The initial state object. If cache exists, cached values will be merged into this object
 * @returns A valtio proxy that automatically syncs with local storage
 * 
 * @example
 * ```typescript
 * // Simple usage with string key
 * const userState = cache('user-preferences', {
 *   theme: 'light',
 *   language: 'en'
 * });
 * 
 * // Advanced usage with options
 * const appState = cache({
 *   key: 'app-state',
 *   prefix: 'myapp/v1/',
 *   skipCache: process.env.NODE_ENV === 'test'
 * }, {
 *   isLoading: false,
 *   data: null
 * });
 * 
 * // State changes are automatically persisted
 * userState.theme = 'dark'; // Automatically saved to localStorage
 * ```
 */
export const cache = <T extends object>(
  keyOrOptions: string | CacheOptions,
  initialObject?: T,
): T => {
  const {
    key, 
    prefix = DEFAULT_PREFIX, 
    skipCache = false,
    db = injectDb(),
    proxyFunction = proxy
  } = typeof keyOrOptions === 'string' ? {key: keyOrOptions} : keyOrOptions;

  if (skipCache) {
    return proxyFunction(initialObject);
  }

  const fullKey = `${prefix}${key}`;
  // Update initial object state fields with local storage copy
  // It is important to update, instead of clone initial object,
  // because it can contain logic in methods and getters that need to be preserved
  deepMerge(initialObject, db.get(fullKey) || {});
  const state = proxyFunction(initialObject) as T;

  subscribe(state, () => {
    // Deep clone object without methods, getters and setters
    const cloned = plainDeepClone(state);
    db.set(fullKey, cloned);
  });

  return state;
};