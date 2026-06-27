import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();           // tears down spies between tests
    window.history.replaceState(null, "", "/");
});

