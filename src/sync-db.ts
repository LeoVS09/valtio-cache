export const isOnServer = () =>
  typeof window === 'undefined';

/** Inject db instance if possible, otherwise return empty db */
export const injectDb = () => {
  if (isOnServer()) {
    console.debug('Ignore server side persistance by default, avoid window related erros')
    return new DumbDb();
  }

  return new LocalStorageDB();
};

export interface ISyncDB {
  get<T = string>(key: string): T | null;
  set<T = string>(key: string, value: T): void;
}

/**
 * Simple synchronous key-value database
 * Wrapper around local storge
 * Adds namespaces and JSON serialisation support
 */
export class LocalStorageDB implements ISyncDB {

  constructor(private storage: Storage = localStorage) {}

  get<T = string>(key: string): T | null {
    const value = this.storage.getItem(key);
    if (!value) {
      return value as null;
    }

    return JSON.parse(value) as T;
  }

  set<T = string>(key: string,value: T): void {
    const serialized: string =
      typeof value !== 'string' ? JSON.stringify(value) : value;

      this.storage.setItem(key, serialized);
  }
}

/** Empty imlementation of PersistDB that can be used during pre-rendering step in server side */
export class DumbDb implements ISyncDB {
  get(): null {
    return null;
  }

  set(): void {
    return;
  }
}