# Changelog

All notable changes to this project will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-06-27

Initial release.

### Added

- `<Router>` — History API provider with `popstate` synchronisation and `fallback` prop for unmatched routes.
- `<Route>` — Exact and prefix path matching with dynamic segments (`:param`), inline layout prop, and `guard`/`redirectTo` for auth protection.
- `<Layout>` — Composable layout wrapper; layouts nest correctly via context.
- `<Link>` — Navigation anchor with `activeClassName`, `exact` active matching, `aria-current="page"`, and modifier-key passthrough.
- `<Redirect>` — Declarative imperative redirect component.
- `useRouter()` — Full router context access.
- `useCurrentPath()` — Pathname-only convenience hook.
- `useParams<T>()` — Typed dynamic segment accessor.
- `useSearchParams()` — URL search string as mergeable state tuple.
- `useLayout()` — Nearest layout wrapper accessor.
- Scroll restoration on navigation (opt-out via `scrollTop=false`).
- Full TypeScript types with zero `any`.
