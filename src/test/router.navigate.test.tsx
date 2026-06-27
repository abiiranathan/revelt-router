import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Route, useRouter } from "../router";
import { renderAt, Home, About } from "./helpers";

describe("navigate", () => {
  it("switches the rendered route on navigate()", async () => {
    const Nav = () => {
      const { navigate } = useRouter();
      return <button onClick={() => navigate("/about")}>Go</button>;
    };

    renderAt(
      "/",
      <>
        <Nav />
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
      </>,
    );

    expect(screen.getByTestId("home")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go" }));

    await waitFor(() =>
      expect(screen.getByTestId("about")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("home")).toBeNull();
    expect(window.location.pathname).toBe("/about");
  });

  it("calls window.scrollTo after navigation by default", async () => {
    const Nav = () => {
      const { navigate } = useRouter();
      return <button onClick={() => navigate("/about")}>Go</button>;
    };

    renderAt(
      "/",
      <>
        <Nav />
        <Route path="/about" component={About} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 0));
  });

  it("does not scroll when scrollTop=false", async () => {
    const Nav = () => {
      const { navigate } = useRouter();
      return (
        <button onClick={() => navigate("/about", false, false)}>Go</button>
      );
    };

    renderAt(
      "/",
      <>
        <Nav />
        <Route path="/about" component={About} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));

    // Give effects time to flush.
    await waitFor(() =>
      expect(screen.getByTestId("about")).toBeInTheDocument(),
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("replaces history when replace=true", async () => {
    const Nav = () => {
      const { navigate } = useRouter();
      return <button onClick={() => navigate("/about", true)}>Go</button>;
    };

    const before = window.history.length;
    renderAt(
      "/",
      <>
        <Nav />
        <Route path="/about" component={About} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));

    await waitFor(() => expect(window.location.pathname).toBe("/about"));
    // replaceState should not have grown the history stack.
    expect(window.history.length).toBe(before);
  });

  it("is a no-op when navigating to the current path", async () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const Nav = () => {
      const { navigate } = useRouter();
      return <button onClick={() => navigate("/")}>Stay</button>;
    };

    renderAt(
      "/",
      <>
        <Nav />
        <Route path="/" component={Home} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Stay" }));

    await waitFor(() => expect(screen.getByTestId("home")).toBeInTheDocument());
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("responds to browser back/forward via popstate", async () => {
    renderAt(
      "/",
      <>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
      </>,
    );

    window.history.pushState(null, "", "/about");
    fireEvent(window, new PopStateEvent("popstate"));

    await waitFor(() =>
      expect(screen.getByTestId("about")).toBeInTheDocument(),
    );
  });
});
