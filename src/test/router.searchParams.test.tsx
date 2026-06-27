import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Route, useSearchParams } from "../router";
import { renderAt } from "./helpers";

const SearchPage = () => {
  const [params, setParams] = useSearchParams();
  return (
    <>
      <div data-testid="q">{params.get("q") ?? ""}</div>
      <button onClick={() => setParams({ q: "hello" })}>Set Q</button>
      <button onClick={() => setParams({ q: undefined })}>Clear Q</button>
    </>
  );
};

describe("useSearchParams", () => {
  it("reads existing search params from the URL", () => {
    renderAt(
      "/search?q=vitest",
      <Route path="/search" component={SearchPage} />,
    );
    expect(screen.getByTestId("q").textContent).toBe("vitest");
  });

  it("sets a param and updates the URL", async () => {
    renderAt("/search", <Route path="/search" component={SearchPage} />);
    fireEvent.click(screen.getByRole("button", { name: "Set Q" }));
    await waitFor(() =>
      expect(screen.getByTestId("q").textContent).toBe("hello"),
    );
    expect(window.location.search).toBe("?q=hello");
  });

  it("removes a param when set to undefined", async () => {
    renderAt(
      "/search?q=remove-me",
      <Route path="/search" component={SearchPage} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear Q" }));
    await waitFor(() => expect(screen.getByTestId("q").textContent).toBe(""));
    expect(window.location.search).toBe("");
  });
});
