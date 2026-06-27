import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Route, useRouter } from "../router";
import { renderAt, Home, NotFound } from "./helpers";

describe("Router fallback", () => {
  it("renders nothing when no route matches and no fallback is set", () => {
    renderAt("/nowhere", <Route path="/" component={Home} />);
    expect(screen.queryByTestId("home")).toBeNull();
    expect(screen.queryByTestId("not-found")).toBeNull();
  });

  it("renders the fallback when no route matches", () => {
    renderAt("/nowhere", <Route path="/" component={Home} />, <NotFound />);
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
    expect(screen.queryByTestId("home")).toBeNull();
  });

  it("hides the fallback once a route matches after navigation", async () => {
    const Nav = () => {
      const { navigate } = useRouter();
      return <button onClick={() => navigate("/")}>Home</button>;
    };

    renderAt(
      "/nowhere",
      <>
        <Nav />
        <Route path="/" component={Home} />
      </>,
      <NotFound />,
    );

    expect(screen.getByTestId("not-found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    await waitFor(() => expect(screen.queryByTestId("not-found")).toBeNull());
    expect(screen.getByTestId("home")).toBeInTheDocument();
  });
});
