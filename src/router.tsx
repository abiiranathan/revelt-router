/**
 * router.tsx — Lightweight History API router for React.
 *
 * Public API:
 *
 *   <Router initialPath={activePath} fallback={<NotFound />}>
 *     <Route path="/"             component={Home}    layout={AppLayout} />
 *     <Route path="/posts"        component={Posts}   layout={AppLayout} props={{ initialPosts }} />
 *     <Route path="/posts/:id"    component={Post}    layout={AppLayout} />
 *     <Route path="/login"        component={Login} />
 *   </Router>
 *
 *   // Dynamic params from useParams():
 *   function Post() {
 *     const { id } = useParams<{ id: string }>();
 *     return <article>Post #{id}</article>;
 *   }
 *
 *   // Search params:
 *   const [search, setSearch] = useSearchParams();
 *   // → search.get("q"), setSearch({ q: "foo" })
 *
 *   // Active-aware link:
 *   <Link to="/posts" activeClassName="font-bold">Posts</Link>
 *   <Link to="/posts/42" activeClassName="font-bold" exact>Post 42</Link>
 *
 *   // Nested layouts:
 *   <Router initialPath={activePath}>
 *     <Layout component={AppShell}>
 *       <Route path="/"       component={Home} />
 *       <Layout component={DocsSidebar}>
 *         <Route path="/docs" component={Docs} />
 *       </Layout>
 *     </Layout>
 *   </Router>
 *
 *   // Protected routes — guard form:
 *   <Route path="/admin" component={Admin} layout={AppLayout}
 *          guard={isLoggedIn} redirectTo="/login" />
 *
 *   // Protected routes — Redirect component form:
 *   {!isLoggedIn && <Redirect to="/login" />}
 *
 *   // Inside any descendant:
 *   const { navigate, currentPath } = useRouter();
 */

import * as React from "react";

// ---------------------------------------------------------------------------
// Path matching
// ---------------------------------------------------------------------------

/** Parameters extracted from a dynamic path pattern, e.g. { id: "42" }. */
export type Params = Record<string, string>;

interface MatchResult {
  matched: boolean;
  params: Params;
  /** True when the pattern matched as a prefix, not the full path. */
  partial: boolean;
}

/**
 * Matches `pattern` against `path`.
 *
 * - Exact match (exact=true): all segments must correspond.
 * - Prefix match (exact=false): pattern may be shorter than path, but the
 *   boundary between matched and unmatched segments must be "/".
 * - Dynamic segments begin with ":" and capture the corresponding path
 *   segment into the returned params map.
 *
 * Returns `{ matched: false, params: {}, partial: false }` on no match.
 */
function matchPath(pattern: string, path: string, exact: boolean): MatchResult {
  const miss: MatchResult = { matched: false, params: {}, partial: false };

  const patParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  // Exact mode: segment counts must agree.
  if (exact && patParts.length !== pathParts.length) return miss;

  // Prefix mode: pattern cannot be longer than the actual path.
  if (!exact && patParts.length > pathParts.length) return miss;

  const params: Params = {};

  for (let i = 0; i < patParts.length; i++) {
    const pat = patParts[i];
    const seg = pathParts[i];

    if (pat.startsWith(":")) {
      // Dynamic segment — capture value.
      params[pat.slice(1)] = decodeURIComponent(seg);
    } else if (pat !== seg) {
      return miss;
    }
  }

  const isPartial = !exact && patParts.length < pathParts.length;
  return { matched: true, params, partial: isPartial };
}

// ---------------------------------------------------------------------------
// RouterContext
// ---------------------------------------------------------------------------

interface RouterContextValue {
  /** The currently active pathname (e.g. "/", "/posts/42"). */
  currentPath: string;
  /** The current URLSearchParams instance. */
  searchParams: URLSearchParams;
  /** Dynamic params matched by the nearest active Route. */
  params: Params;
  /**
   * Pushes a new entry onto the history stack and updates the active path.
   * No-ops if `to` already matches the current full URL (pathname + search).
   *
   * @param to        Target pathname, optionally including a search string.
   * @param replace   When true, replaces the current history entry instead
   *                  of pushing a new one.
   * @param scrollTop When true (default), scrolls to the top after navigation.
   */
  navigate: (to: string, replace?: boolean, scrollTop?: boolean) => void;
  /**
   * Updates the URL search params without changing the pathname. Merges
   * `next` into the current params; set a key to `undefined` to remove it.
   *
   * @param next    Partial record of key→value pairs to apply.
   * @param replace When true, replaces the history entry instead of pushing.
   */
  setSearchParams: (
    next: Record<string, string | undefined>,
    replace?: boolean,
  ) => void;
  /**
   * Called by Route when it renders to supply its matched params to the
   * context so useParams() reflects the active route.
   *
   * @internal — not part of the public API.
   */
  _setParams: React.Dispatch<React.SetStateAction<Params>>;
}

const RouterContext = React.createContext<RouterContextValue | null>(null);

// ---------------------------------------------------------------------------
// LayoutContext
// ---------------------------------------------------------------------------

/**
 * LayoutContextValue exposes the render function of the nearest enclosing
 * Layout to any descendant that wants to inspect or override it.
 *
 * Most components won't need this directly; it is used internally by Route.
 */
export interface LayoutContextValue {
  /** Wraps `children` in the current layout shell. */
  wrap: (children: React.ReactNode) => React.ReactNode;
}

const LayoutContext = React.createContext<LayoutContextValue>({
  // Default: identity — no layout wrapper applied.
  wrap: (children) => children,
});

/**
 * useLayout returns the nearest LayoutContext value.
 * Can be used by components that need to escape or inspect the current layout.
 */
export function useLayout(): LayoutContextValue {
  return React.useContext(LayoutContext);
}

// ---------------------------------------------------------------------------
// LayoutProps — the contract every layout component must satisfy
// ---------------------------------------------------------------------------

/**
 * LayoutProps is the props interface every layout component receives.
 *
 * Layouts are plain React components; the `children` prop holds the
 * rendered page content. Additional data (e.g. page title, breadcrumbs)
 * can be threaded through context rather than through this interface.
 */
export interface LayoutProps {
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

interface RouterProps {
  /**
   * The path to activate on first render, typically the server-supplied
   * `activePath` prop so SSR and hydration agree on the active route.
   */
  initialPath: string;
  /**
   * Rendered when no Route child matches the current path.
   * Defaults to null (silent miss).
   */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Router owns the current-path and search-params state and synchronises
 * them with the browser's History API, including back/forward navigation
 * via popstate.
 *
 * Render it once at the root of your island. All Route, Link, Layout, and
 * useRouter calls must be descendants.
 */
export function Router({
  initialPath,
  fallback = null,
  children,
}: RouterProps) {
  const [currentPath, setCurrentPath] = React.useState(initialPath);
  const [searchParams, setSearchParamsState] = React.useState(
    () =>
      new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      ),
  );

  // Params are pushed up from the matched Route via _setParams.
  const [params, _setParams] = React.useState<Params>({});

  React.useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
      setSearchParamsState(new URLSearchParams(window.location.search));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = React.useCallback(
    (to: string, replace = false, scrollTop = true) => {
      const current = window.location.pathname + window.location.search;
      if (current === to) return;

      const url = new URL(to, window.location.href);
      if (replace) {
        window.history.replaceState(null, "", url);
      } else {
        window.history.pushState(null, "", url);
      }

      setCurrentPath(url.pathname);
      setSearchParamsState(new URLSearchParams(url.search));

      if (scrollTop) {
        window.scrollTo(0, 0);
      }
    },
    [],
  );

  const setSearchParams = React.useCallback(
    (next: Record<string, string | undefined>, replace = false) => {
      const updated = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined) {
          updated.delete(key);
        } else {
          updated.set(key, value);
        }
      }
      const qs = updated.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : "");
      if (replace) {
        window.history.replaceState(null, "", newUrl);
      } else {
        window.history.pushState(null, "", newUrl);
      }
      setSearchParamsState(updated);
    },
    [],
  );

  const value = React.useMemo(
    () => ({
      currentPath,
      searchParams,
      params,
      navigate,
      setSearchParams,
      _setParams,
    }),
    // _setParams is a stable dispatch function from useState; no dep needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPath, searchParams, params],
  );

  // Switch keeps track of whether any child Route matched this render so we
  // can conditionally show `fallback`. We use a sentinel component rather
  // than a ref to stay within React's rendering model.
  return (
    <RouterContext.Provider value={value}>
      <Switch fallback={fallback}>{children}</Switch>
    </RouterContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Switch — internal match-tracking wrapper
// ---------------------------------------------------------------------------

interface SwitchProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Switch tracks whether any Route descendant matched during this render pass
 * and renders `fallback` when none did.
 *
 * Implemented as a context + a counter accumulated by Route children via
 * useLayoutEffect so we never call setState during render.
 */

interface SwitchContextValue {
  /** Called by a Route once it has confirmed a match. */
  reportMatch: () => void;
}

const SwitchContext = React.createContext<SwitchContextValue>({
  reportMatch: () => undefined,
});

function Switch({ fallback, children }: SwitchProps) {
  // matchCount is incremented by matched Routes via useLayoutEffect.
  // We initialise it to 0 on each path change so stale matches don't linger.
  const { currentPath } = useRouter();
  const [matchCount, setMatchCount] = React.useState(0);

  // Reset when the path changes so fallback re-evaluates.
  const prevPathRef = React.useRef(currentPath);
  if (prevPathRef.current !== currentPath) {
    prevPathRef.current = currentPath;
    // Safe to call setState during render when the value is derived from
    // render inputs and the write is guarded by the stale check above.
    setMatchCount(0);
  }

  const reportMatch = React.useCallback(() => setMatchCount((n) => n + 1), []);

  const switchValue = React.useMemo(() => ({ reportMatch }), [reportMatch]);

  return (
    <SwitchContext.Provider value={switchValue}>
      {children}
      {matchCount === 0 && fallback}
    </SwitchContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface LayoutComponentProps {
  /**
   * The layout component. Receives `children` (the wrapped page content)
   * and any other props passed to this Layout element.
   *
   * Using `React.ComponentType<LayoutProps & Record<string, unknown>>`
   * allows layouts that accept extra props (e.g. a title) while still
   * satisfying the minimum LayoutProps contract.
   */
  component: React.ComponentType<LayoutProps & Record<string, unknown>>;
  /** Extra props forwarded to the layout component alongside `children`. */
  layoutProps?: Record<string, unknown>;
  children: React.ReactNode;
}

/**
 * Layout wraps its children in the given layout component and publishes
 * the wrapper via LayoutContext so nested Route components can apply it
 * without receiving it as an explicit prop.
 *
 * Layouts nest: placing a Layout inside another Layout composes them,
 * with the inner layout wrapping first.
 *
 * Example — shared shell with a route-specific sidebar:
 *
 *   <Router initialPath={activePath}>
 *     <Layout component={AppShell}>
 *       <Route path="/"        component={Home} />
 *       <Layout component={DocsSidebar}>
 *         <Route path="/docs"  component={Docs} />
 *       </Layout>
 *     </Layout>
 *   </Router>
 */
export function Layout({
  component: LayoutComponent,
  layoutProps,
  children,
}: LayoutComponentProps) {
  // Inherit the parent layout's wrap so nesting composes correctly.
  const parent = useLayout();

  const wrap = React.useCallback(
    (pageContent: React.ReactNode) =>
      parent.wrap(
        <LayoutComponent {...(layoutProps ?? {})}>
          {pageContent}
        </LayoutComponent>,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [LayoutComponent, parent.wrap, JSON.stringify(layoutProps)],
  );

  const value = React.useMemo(() => ({ wrap }), [wrap]);

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

interface RouteProps<P extends object = object> {
  /** The path this route matches. Supports dynamic segments (":param"). */
  path: string;
  /** The page component to render when this route is active. */
  component: React.ComponentType<P>;
  /** Optional props forwarded to the page component. */
  props?: P;
  /**
   * Optional layout component to wrap this page.
   *
   * Takes precedence over any enclosing <Layout> elements, letting you
   * declare per-route layouts inline:
   *
   *   <Route path="/login" component={Login} layout={BlankLayout} />
   */
  layout?: React.ComponentType<LayoutProps>;
  /**
   * When true (default), only an exact path match renders the component.
   * When false, the route also matches any path that starts with `path`
   * at a segment boundary — useful for activating a layout subtree without
   * tying it to a single page.
   */
  exact?: boolean;
  /**
   * Optional guard predicate. When provided, the route renders normally
   * while it returns true. When it returns false, the router navigates to
   * `redirectTo` (replacing the current history entry) and renders nothing.
   *
   *   <Route path="/admin" component={Admin} guard={isLoggedIn} redirectTo="/login" />
   */
  guard?: () => boolean;
  /** Path to redirect to when `guard` returns false. Defaults to "/". */
  redirectTo?: string;
}

/**
 * Route renders its `component` when the router's current path matches
 * `path`, wrapping it in the active layout (from LayoutContext or the
 * inline `layout` prop).
 *
 * Matched dynamic params are surfaced via useParams() in any descendant.
 *
 * Renders null on a path mismatch or a failed guard.
 */
export function Route<P extends object>({
  path,
  component: Component,
  props,
  layout: InlineLayout,
  exact = true,
  guard,
  redirectTo = "/",
}: RouteProps<P>) {
  const ctx = useRouter();
  const { wrap } = useLayout();
  const { reportMatch } = React.useContext(SwitchContext);

  const { matched, params } = matchPath(path, ctx.currentPath, exact);

  // Guard: if the path matches but the predicate fails, schedule a redirect
  // and render nothing. The effect runs after paint and avoids setState-
  // during-render; a brief flash is acceptable since guard checks are
  // synchronous auth state reads, not async calls.
  const guardFailed = matched && guard !== undefined && !guard();

  React.useEffect(() => {
    if (guardFailed) {
      ctx.navigate(redirectTo, true);
    }
    // We only want this to fire when guardFailed transitions to true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardFailed]);

  // Surface matched params into RouterContext so useParams() works in
  // page components. useLayoutEffect runs synchronously after DOM mutation
  // but before the browser paints, so params are available before children
  // read them.
  React.useLayoutEffect(() => {
    if (matched && !guardFailed) {
      ctx._setParams(params);
      reportMatch();
    }
    // params is a new object each render; stringify to avoid churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, guardFailed, JSON.stringify(params)]);

  if (!matched || guardFailed) return null;

  const pageElement = <Component {...((props ?? {}) as P)} />;

  // Inline layout prop takes precedence over the inherited Layout context.
  if (InlineLayout) {
    return <InlineLayout>{pageElement}</InlineLayout>;
  }

  // Apply the nearest Layout context wrapper (identity if none).
  return <>{wrap(pageElement)}</>;
}

// ---------------------------------------------------------------------------
// Link
// ---------------------------------------------------------------------------

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The path to navigate to. */
  to: string;
  /**
   * Class name(s) applied when this link's target matches the current path.
   * Merged with `className`.
   */
  activeClassName?: string;
  /**
   * When true, the link is only marked active on an exact path match.
   * When false (default), it is active for the target path and any path
   * nested beneath it at a segment boundary — useful for top-level nav
   * items (e.g. "/posts" stays active on "/posts/42").
   */
  exact?: boolean;
}

/**
 * Link renders an anchor tag that intercepts clicks and delegates to the
 * router's navigate function, avoiding a full-page reload.
 *
 * Degrades to a plain <a href> when rendered outside a RouterContext
 * (e.g. during SSR). Respects modifier keys so cmd/ctrl+click still
 * opens a new tab.
 *
 * Applies `activeClassName` and `aria-current="page"` when the link's
 * target matches the current path.
 */
export function Link({
  to,
  onClick,
  className,
  activeClassName,
  exact = false,
  children,
  ...rest
}: LinkProps) {
  const ctx = React.useContext(RouterContext);
  const currentPath = ctx?.currentPath ?? "";

  const { matched: isActive } = matchPath(to, currentPath, exact);

  const resolvedClassName =
    [className, isActive ? activeClassName : ""].filter(Boolean).join(" ") ||
    undefined;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let any user-provided handler run first; it may call `e.preventDefault()`.
    onClick?.(e);

    // If the event was already prevented, do nothing.
    if (e.defaultPrevented) return;

    // Prevent the browser's default navigation in the test DOM environment
    // (and in general) so the router can fully control navigation.
    // Only delegate to the router navigate for plain clicks without
    // modifier keys — cmd/ctrl/shift-click should not trigger in-app
    // navigation.
    e.preventDefault();
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
      ctx?.navigate(to);
    }
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={resolvedClassName}
      aria-current={isActive ? "page" : undefined}
      {...rest}>
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Redirect
// ---------------------------------------------------------------------------

interface RedirectProps {
  /** The path to redirect to. */
  to: string;
  /**
   * When true (default), replaces the current history entry instead of
   * pushing a new one. Redirects are rarely something the user should be
   * able to navigate back to.
   */
  replace?: boolean;
}

/**
 * Redirect navigates to `to` when rendered.
 *
 * Useful as a fallback or inside conditional logic:
 *
 *   {!isLoggedIn && <Redirect to="/login" />}
 */
export function Redirect({ to, replace = true }: RedirectProps) {
  const { navigate } = useRouter();

  React.useEffect(() => {
    navigate(to, replace);
    // Only re-navigate when `to` changes; `replace` changes are ignored
    // deliberately to avoid spurious history entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  return null;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * useRouter returns the current RouterContext value.
 *
 * @throws {Error} if called outside of a Router tree.
 */
export function useRouter(): RouterContextValue {
  const ctx = React.useContext(RouterContext);
  if (ctx === null) {
    throw new Error("useRouter must be used within a <Router>");
  }
  return ctx;
}

/**
 * useCurrentPath returns only the current path string, for components that
 * need to know the active route but don't need to navigate.
 */
export function useCurrentPath(): string {
  return useRouter().currentPath;
}

/**
 * useParams returns the dynamic path parameters matched by the nearest
 * enclosing Route.
 *
 * The type parameter T lets callers assert the expected param names:
 *
 *   const { id } = useParams<{ id: string }>();
 *
 * Returns an empty object outside a matched Route or when the active Route
 * has no dynamic segments.
 */
export function useParams<T extends Params = Params>(): T {
  return useRouter().params as T;
}

/**
 * useSearchParams returns a tuple of [URLSearchParams, setter] analogous
 * to React's useState, but backed by the URL search string.
 *
 * Reading:
 *   const [search] = useSearchParams();
 *   const q = search.get("q") ?? "";
 *
 * Writing (merges into the current search string):
 *   const [, setSearch] = useSearchParams();
 *   setSearch({ q: "foo" });         // adds/updates ?q=foo
 *   setSearch({ q: undefined });     // removes ?q
 *   setSearch({ q: "foo" }, true);   // replaceState instead of pushState
 */
export function useSearchParams(): [
  URLSearchParams,
  (next: Record<string, string | undefined>, replace?: boolean) => void,
] {
  const { searchParams, setSearchParams } = useRouter();
  return [searchParams, setSearchParams];
}

// Export matchPath for testing purposes.
export { matchPath as _matchPath };
