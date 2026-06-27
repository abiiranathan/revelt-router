# revelt-router

A lightweight, History API router for React. No dependencies beyond React itself.

Built for [revelt](https://github.com/abiiranathan/revelt) islands but works in any React application that runs in a browser.

```
npm install revelt-router
```

## Why

Tanstack Router and React Router v7 are excellent but carry significant weight — file-based routing conventions, loader infrastructure, code-splitting primitives, schema-validated search params. If your app doesn't need those things, you're paying for them anyway.

revelt-router covers the 90% case:

- Declarative `<Route>` matching with dynamic segments
- Nested layout composition
- Active-aware `<Link>` with `aria-current`
- Search params backed by the URL
- Route guards for auth
- Not-found fallback
- Scroll restoration
- Full TypeScript types
- Zero runtime dependencies

## Requirements

- React 18+
- A browser environment (History API)

## Quick start

```tsx
import { Router, Route, Link } from "revelt-router";
F
function App({ activePath }: { activePath: string }) {
  return (
    <Router initialPath={activePath} fallback={<NotFound />}>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/posts" activeClassName="active">Posts</Link>
      </nav>

      <Route path="/"      component={Home} />
      <Route path="/posts" component={Posts} />
      <Route path="/login" component={Login} />
    </Router>
  );
}
```

## Layouts

Wrap routes in a `<Layout>` to share chrome across pages without prop-drilling.

```tsx
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

<Router initialPath={activePath}>
  <Layout component={AppShell}>
    <Route path="/"      component={Home} />
    <Route path="/posts" component={Posts} />
  </Layout>
  <Route path="/login" component={Login} />  {/* no layout */}
</Router>
```

Layouts nest. An inner `<Layout>` wraps first, then the outer one wraps it:

```tsx
<Layout component={AppShell}>
  <Route path="/" component={Home} />
  <Layout component={DocsSidebar}>
    <Route path="/docs"       component={DocsIndex} />
    <Route path="/docs/:slug" component={DocsPage} />
  </Layout>
</Layout>
```

Per-route layouts are also supported inline via the `layout` prop, which takes precedence over any enclosing `<Layout>`:

```tsx
<Route path="/login" component={Login} layout={BlankLayout} />
```

## Dynamic segments

Use `:param` syntax. Parameters are decoded and accessible via `useParams()`.

```tsx
<Route path="/posts/:id" component={Post} />

function Post() {
  const { id } = useParams<{ id: string }>();
  return <article>Post {id}</article>;
}
```

Multiple segments work too:

```tsx
<Route path="/users/:uid/posts/:pid" component={UserPost} />

function UserPost() {
  const { uid, pid } = useParams<{ uid: string; pid: string }>();
  // ...
}
```

## Search params

`useSearchParams` returns a `[URLSearchParams, setter]` tuple. The setter merges into the current search string — set a key to `undefined` to remove it.

```tsx
function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";

  return (
    <input
      value={q}
      onChange={(e) => setParams({ q: e.target.value })}
      placeholder="Search…"
    />
  );
}
```

To replace the history entry instead of pushing a new one, pass `true` as the second argument:

```tsx
setParams({ q: "foo" }, true);
```

## Navigation

Use the `navigate` function from `useRouter()`:

```tsx
function SaveButton() {
  const { navigate } = useRouter();

  const handleSave = async () => {
    await save();
    navigate("/dashboard");
  };

  return <button onClick={handleSave}>Save</button>;
}
```

`navigate(to, replace?, scrollTop?)`:

| Parameter   | Default | Description                                                |
| ----------- | ------- | ---------------------------------------------------------- |
| `to`        | —       | Target path, may include a search string (`/search?q=foo`) |
| `replace`   | `false` | Replace the current history entry instead of pushing       |
| `scrollTop` | `true`  | Scroll to the top of the page after navigation             |

## Route guards

The `guard` prop accepts a predicate function. When it returns `false`, the router redirects to `redirectTo` (default `"/"`) and renders nothing.

```tsx
const isLoggedIn = () => !!localStorage.getItem("token");

<Route
  path="/dashboard"
  component={Dashboard}
  guard={isLoggedIn}
  redirectTo="/login"
/>
```

For conditional redirect logic outside of a `<Route>`, use the `<Redirect>` component:

```tsx
function ProtectedPage() {
  if (!isLoggedIn()) return <Redirect to="/login" />;
  return <Dashboard />;
}
```

`<Redirect>` replaces the current history entry by default (`replace={true}`).

## Not-found fallback

Pass a `fallback` prop to `<Router>`. It renders when no `<Route>` child matches the current path.

```tsx
function NotFound() {
  const { currentPath } = useRouter();
  return <p>No page at {currentPath}.</p>;
}

<Router initialPath={activePath} fallback={<NotFound />}>
  <Route path="/"      component={Home} />
  <Route path="/posts" component={Posts} />
</Router>
```

## Link

`<Link>` renders a standard anchor that intercepts clicks and delegates to the router, avoiding a full-page reload. It degrades to a plain `<a href>` outside a `<Router>` (e.g. during SSR).

Modifier-key clicks (`Cmd`, `Ctrl`, `Shift`) are passed through to the browser unchanged, so opening a link in a new tab works as expected.

```tsx
<Link to="/posts">Posts</Link>

{/* Active class applied when current path starts with /posts */}
<Link to="/posts" activeClassName="font-bold">Posts</Link>

{/* Active class applied only on exact match */}
<Link to="/posts" activeClassName="font-bold" exact>Posts</Link>
```

When active, `aria-current="page"` is set automatically.

All standard anchor attributes (`className`, `onClick`, `target`, `rel`, etc.) are forwarded.

## SSR / hydration

Pass the server-rendered path as `initialPath` so the first client render agrees with the server output:

```tsx
// server
const activePath = new URL(request.url).pathname;
const html = renderToString(<App activePath={activePath} />);

// client (hydration)
hydrateRoot(document.getElementById("root"), <App activePath={window.__INITIAL_PATH__} />);
```

The router reads `window.location.search` on mount for search params. No other browser globals are accessed during SSR.

## API reference

### Components

| Component    | Props                                                                       | Description                                |
| ------------ | --------------------------------------------------------------------------- | ------------------------------------------ |
| `<Router>`   | `initialPath`, `fallback?`, `children`                                      | Root provider. Render once per island.     |
| `<Route>`    | `path`, `component`, `props?`, `layout?`, `exact?`, `guard?`, `redirectTo?` | Renders when path matches.                 |
| `<Layout>`   | `component`, `layoutProps?`, `children`                                     | Wraps descendant routes in a layout shell. |
| `<Link>`     | `to`, `activeClassName?`, `exact?`, + all anchor attrs                      | Navigation anchor with active state.       |
| `<Redirect>` | `to`, `replace?`                                                            | Navigates imperatively when rendered.      |

### Hooks

| Hook                | Returns                     | Description                                                |
| ------------------- | --------------------------- | ---------------------------------------------------------- |
| `useRouter()`       | `RouterContextValue`        | Full router context. Throws outside `<Router>`.            |
| `useCurrentPath()`  | `string`                    | Current pathname. Shorthand for `useRouter().currentPath`. |
| `useParams<T>()`    | `T`                         | Dynamic segments from the active route.                    |
| `useSearchParams()` | `[URLSearchParams, setter]` | URL search string as state.                                |
| `useLayout()`       | `LayoutContextValue`        | Nearest layout wrapper.                                    |

### Types

```ts
type Params = Record<string, string>;

interface LayoutProps {
  children: React.ReactNode;
}
```

## License

MIT
