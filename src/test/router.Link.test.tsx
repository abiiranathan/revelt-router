import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Route, Link } from "../router";
import { renderAt, About } from "./helpers";

describe("Link", () => {
  it("renders an anchor with the correct href", () => {
    renderAt("/", <Link to="/about">About</Link>);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
  });

  it("renders nested children when used as a component", () => {
    renderAt(
      "/",
      <Link to="/about">
        <span data-testid="link-child">About</span>
      </Link>,
    );

    expect(screen.getByTestId("link-child")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
  });

  it("navigates on click without a page reload", async () => {
    renderAt(
      "/",
      <>
        <Link to="/about">About</Link>
        <Route path="/about" component={About} />
      </>,
    );
    fireEvent.click(screen.getByRole("link", { name: "About" }));
    await waitFor(() =>
      expect(screen.getByTestId("about")).toBeInTheDocument(),
    );
  });

  it("does not navigate on cmd+click", () => {
    renderAt("/", <Link to="/about">About</Link>);
    const link = screen.getByRole("link", { name: "About" });

    fireEvent(
      link,
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        metaKey: true, // macOS Cmd
        ctrlKey: true, // Windows/Linux Ctrl — cover both
      }),
    );

    expect(window.location.pathname).toBe("/");
  });

  it("applies activeClassName when the path matches (prefix)", () => {
    renderAt(
      "/posts/42",
      <Link to="/posts" activeClassName="active">
        Posts
      </Link>,
    );
    expect(screen.getByRole("link")).toHaveClass("active");
  });

  it("does not apply activeClassName on a non-matching path", () => {
    renderAt(
      "/",
      <Link to="/posts" activeClassName="active">
        Posts
      </Link>,
    );
    expect(screen.getByRole("link")).not.toHaveClass("active");
  });

  it("applies aria-current=page when active", () => {
    renderAt("/posts/42", <Link to="/posts">Posts</Link>);
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("does not apply aria-current when exact=true and path differs", () => {
    renderAt(
      "/posts/42",
      <Link to="/posts" activeClassName="active" exact>
        Posts
      </Link>,
    );
    expect(screen.getByRole("link")).not.toHaveClass("active");
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });
});
