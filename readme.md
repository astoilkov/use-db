# `use-db`

> React hook for `IndexedDB` that mimics `useState` API

[![Gzipped Size](https://img.shields.io/bundlephobia/minzip/use-db)](https://bundlephobia.com/result?p=use-db)
[![Build Status](https://img.shields.io/github/actions/workflow/status/astoilkov/use-db/main.yml?branch=main)](https://github.com/astoilkov/use-db/actions/workflows/main.yml)

## Install

```bash
npm install use-db
```

## Usage

```ts
import useDb from 'use-db'

export default function Todos() {
    const [todos, setTodos] = useDb('todos', {
        defaultValue: ['buy avocado', 'do 50 push-ups']
    })
}
```

<details>
<summary id="remove-item">Removing the data from <code>IndexedDB</code> and resetting to the default</summary>
<p></p>

The `removeItem()` method will reset the value to its default and will remove the data from the `IndexedDB`. It returns to the same state as when the hook was initially created.

```tsx
import useDb from 'use-db'

export default function Todos() {
    const [todos, setTodos, removeItem] = useDb('todos', {
        defaultValue: ['buy avocado']
    })

    function onClick() {
        removeItem()
    }
}
```

</details>

## API

#### `useDb(key: string, options?: StorageStateOptions)`

Returns `[value, setValue, removeItem]` when called. The first two values are the same as `useState()`. The third value calls `IDBObjectStore.delete()` and removes the data from the db.

#### `key`

Type: `string`

⚠️ Be careful with name conflicts as it is possible to access a property which is already in `IndexedDB` that was created from another place in the codebase or in an old version of the application.

#### `options.defaultValue`

Type: `any`

Default: `undefined`

The default value. You can think of it as the same as `useState(defaultValue)`.

#### `options.optimistic`

Type: `boolean`

Default: `true`

`IndexedDB` is async. When `optimistic` is enabled, calling `setState` will synchronously/immediately update the state and it will roll back the state if adding the data to the database fails. You can disable by setting `optimistic: false`.

## Related

- [`use-storage-state`](https://github.com/astoilkov/use-storage-state) — Supports `localStorage`, `sessionStorage`, and any other [`Storage`](https://developer.mozilla.org/en-US/docs/Web/API/Storage) compatible API.
- [`use-local-storage-state`](https://github.com/astoilkov/use-local-storage-state) — Similar to this hook but for `localStorage`.
- [`use-session-storage-state`](https://github.com/astoilkov/use-session-storage-state) — Similar to this hook but for `sessionStorage`.
- [`local-db-storage`](https://github.com/astoilkov/local-db-storage) — Tiny wrapper around `IndexedDB` that mimics `localStorage` API.
