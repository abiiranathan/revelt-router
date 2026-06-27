import { render } from "@testing-library/react";
import React from "react";
import { Router, type LayoutProps } from "../router";

/** Renders a Router at `path` with the given children. */
export function renderAt(
  path: string,
  ui: React.ReactNode,
  fallback?: React.ReactNode,
) {
  // Separate pathname from search so Router.useState picks up the search
  // string and Route matching works against the bare pathname.
  const url = new URL(path, "http://localhost");
  window.history.replaceState(null, "", url.pathname + url.search);
  return render(
    <Router initialPath={url.pathname} fallback={fallback}>
      {ui}
    </Router>,
  );
}

/** Minimal layout that marks its children with a data attribute. */
export function TestLayout({ children }: LayoutProps) {
  return <div data-testid="layout">{children}</div>;
}

/** Stub page components. */
export const Home = () => <div data-testid="home">Home</div>;
export const About = () => <div data-testid="about">About</div>;
export const Post = () => <div data-testid="post">Post</div>;
export const Admin = () => <div data-testid="admin">Admin</div>;
export const NotFound = () => <div data-testid="not-found">Not Found</div>;
