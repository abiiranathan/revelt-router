import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Route } from "../router";
import { renderAt, Home, About, TestLayout } from "./helpers";
import { useParams } from "../router";

describe("Route", () => {
  it("renders the matched component", () => {
    renderAt("/", <Route path="/" component={Home} />);
    expect(screen.getByTestId("home")).toBeInTheDocument();
  });

  it("renders nothing when the path does not match", () => {
    renderAt("/about", <Route path="/" component={Home} />);
    expect(screen.queryByTestId("home")).toBeNull();
  });

  it("renders multiple routes, only the matching one", () => {
    renderAt(
      "/about",
      <>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
      </>,
    );
    expect(screen.queryByTestId("home")).toBeNull();
    expect(screen.getByTestId("about")).toBeInTheDocument();
  });

  it("wraps the page in the inline layout when provided", () => {
    renderAt("/", <Route path="/" component={Home} layout={TestLayout} />);
    expect(screen.getByTestId("layout")).toContainElement(
      screen.getByTestId("home"),
    );
  });

  it("matches dynamic segments and exposes them via useParams", () => {
    const PostPage = () => {
      const { id } = useParams<{ id: string }>();
      return <div data-testid="post-id">{id}</div>;
    };

    renderAt("/posts/42", <Route path="/posts/:id" component={PostPage} />);
    expect(screen.getByTestId("post-id").textContent).toBe("42");
  });
});
