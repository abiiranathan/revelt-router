import { describe, it, expect } from "vitest";
import { _matchPath as matchPath } from "../router";

describe("matchPath", () => {
    describe("exact mode", () => {
        it("matches identical paths", () => {
            expect(matchPath("/posts", "/posts", true).matched).toBe(true);
        });

        it("rejects a prefix", () => {
            expect(matchPath("/posts", "/posts/42", true).matched).toBe(false);
        });

        it("rejects a parent", () => {
            expect(matchPath("/posts/42", "/posts", true).matched).toBe(false);
        });

        it("extracts a single dynamic segment", () => {
            const { matched, params } = matchPath("/posts/:id", "/posts/42", true);
            expect(matched).toBe(true);
            expect(params).toEqual({ id: "42" });
        });

        it("extracts multiple dynamic segments", () => {
            const { matched, params } = matchPath(
                "/users/:uid/posts/:pid",
                "/users/7/posts/99",
                true,
            );
            expect(matched).toBe(true);
            expect(params).toEqual({ uid: "7", pid: "99" });
        });

        it("decodes percent-encoded segment values", () => {
            const { params } = matchPath("/search/:q", "/search/hello%20world", true);
            expect(params.q).toBe("hello world");
        });
    });

    describe("prefix mode", () => {
        it("matches an exact path", () => {
            expect(matchPath("/posts", "/posts", false).matched).toBe(true);
        });

        it("matches a path nested under the pattern", () => {
            const { matched, partial } = matchPath("/posts", "/posts/42", false);
            expect(matched).toBe(true);
            expect(partial).toBe(true);
        });

        it("does not match a path that shares a prefix but crosses a segment boundary wrongly", () => {
            // /post must not match /posts
            expect(matchPath("/post", "/posts", false).matched).toBe(false);
        });

        it("does not match when pattern is longer than path", () => {
            expect(matchPath("/posts/42", "/posts", false).matched).toBe(false);
        });
    });
});
