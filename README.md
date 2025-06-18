# Valtio Cache

Production-ready tiny library for synchronous caching and persistence of [Valtio state manager](https://github.com/pmndrs/valtio).

## Install

```bash
npm install valtio-cache
```

## Basic Usage

```ts
import { cache } from "valtio-cache";

interface State {
    name: string;
}

// Create store that is cached in local storage
const state = cache<State>('state-key', {
  name: "World", // initial state

  get hello() {
    return `Hello ${this.name}`;
  }
});

```

Update state

```ts
console.log(state.hello); // "Hello World"

state.name = "Valtio";

console.log(state.hello); // "Hello Valtio"
```

Refresh page

```ts
console.log(state.hello); // "Hello Valtio"
```

## Features

- 🔄 Persist and restore Valtio state automatically
- 🎯 Full getters and setters support
- 🚀 TypeScript support with full type safety
- 🛠️ Configurable storage backends
- 🧪 Test-friendly with skip cache option
- 📦 Tiny bundle size
- ⚡ Fully synchronous

Special note on the last point:

> A great and extensive library for persistence already exists for Valtio: [valtio-persist](https://github.com/pmndrs/valtio-persist). However, this library is asynchronous and does not allow retrieving state before the app's first render. This makes it harder to add persistence to existing apps. This is why this library was created. The only difference from regular Valtio is one line: `cache(key, state)` instead of `proxy(state)`, which makes migration easy.

## Advanced Usage Examples

### Configuration Options

```ts
import { cache, CacheOptions } from "valtio-cache";

// Using configuration object with custom prefix
const preferences = cache({
  key: 'preferences',
  prefix: 'myapp/v1.2/',
  // Skip caching in developement
  skipCache: process.env.NODE_ENV === 'development'
}, {
  theme: 'light',
  language: 'en',
  notifications: true
});

```

### Change version to reset state in production

```ts
const state = cache({
  key: 'app-state',
  prefix: 'myapp/v1.1/' // Include version in prefix
}, initialState);
```

### Real-world Application State

```ts
interface AppState {
  user: {
    id: string | null;
    name: string;
    email: string;
  };
  settings: {
    theme: 'light' | 'dark';
    language: string;
    autoSave: boolean;
  };
  ui: {
    sidebarOpen: boolean;
    currentPage: string;
  };
}

// Application state with nested objects
const appState = cache<AppState>('app', {
  user: {
    id: null,
    name: '',
    email: ''
  },
  settings: {
    theme: 'light',
    language: 'en',
    autoSave: true
  },
  ui: {
    sidebarOpen: true,
    currentPage: 'dashboard'
  }
});

// All changes are automatically persisted
appState.settings.theme = 'dark';
appState.ui.sidebarOpen = false;
appState.user.name = 'John Doe';
```

## Best Practices

Use Short and Descriptive Keys

```ts
// Bad
const userSettings = cache('user-settings-v1', defaultSettings);

// Bad
const state = cache('s', defaultSettings);

// Good
const userSettings = cache('settings', defaultSettings);
```
