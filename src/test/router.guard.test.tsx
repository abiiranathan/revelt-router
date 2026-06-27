import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Route } from "../router";
import { renderAt, Admin, Home } from "./helpers";

describe("Route guard", () => {
  it("renders the component when the guard passes", () => {
    renderAt(
      "/admin",
      <Route path="/admin" component={Admin} guard={() => true} />,
    );
    expect(screen.getByTestId("admin")).toBeInTheDocument();
  });

  it("redirects to redirectTo when the guard fails", async () => {
    renderAt(
      "/admin",
      <>
        <Route
          path="/admin"
          component={Admin}
          guard={() => false}
          redirectTo="/"
        />
        <Route path="/" component={Home} />
      </>,
    );
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(screen.queryByTestId("admin")).toBeNull();
  });
});
