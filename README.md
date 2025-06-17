# Valtio Cache

Production ready tiny libary for synchrounous caching and persistence of [Valtio state manager](https://github.com/pmndrs/valtio).

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

// Create store that cached in local storage
const state = cache<State>('state-key', {
  name: "World", // initial state

  get hello() {
    return `Hello ${this.name}`;
  }
});

```

Update state

```ts
console.log(state.hello); // "Hello world"

state.name = "Valtio";

console.log(state.hello); // "Hello Valtio"
```

Refresh page

```ts
console.log(state.hello); // "Hello Valtio"
```

## Features

- 🔄 Persist and restore valtio state automatically
- Full getters and setters support
- 🚀 TypeScript support with full type safety
- Fully synchroinous

Special note on last point:

> For valtio already exist great and extensive library for persistence: [valtio-persist](https://github.com/pmndrs/valtio-persist). But unfortunatly this libary asynchrounous and not allow to retrive state before app first render. This makes it harder to add persistance to existing app. This is why this libary is created. The only difference between regular Valtio is one line: `cache(key, state)` instead of `proxy(state)`. Which makes it easy to migrate.
