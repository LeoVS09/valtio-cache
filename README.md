# Valtio Cache

Production-ready tiny library for synchronous caching and persistence of [Valtio state manager](https://github.com/pmndrs/valtio).

## Install

```bash
npm install valtio-cache
```

## Usage

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
- ⚡ Fully synchronous

Special note on the last point:

> A great and extensive library for persistence already exists for Valtio: [valtio-persist](https://github.com/pmndrs/valtio-persist). However, this library is asynchronous and does not allow retrieving state before the app's first render. This makes it harder to add persistence to existing apps. This is why this library was created. The only difference from regular Valtio is one line: `cache(key, state)` instead of `proxy(state)`, which makes migration easy.
