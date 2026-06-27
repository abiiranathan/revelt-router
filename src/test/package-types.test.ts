import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("published type declarations", () => {
    it("includes the public API exports in dist/index.d.ts", () => {
        execFileSync("npm", ["run", "build"], {
            cwd: resolve(__dirname, "..", ".."),
            stdio: "inherit",
        });

        const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
        const packageJson = JSON.parse(
            readFileSync(resolve(repoRoot, "package.json"), "utf8"),
        );
        const declarationPath = resolve(repoRoot, packageJson.types.replace(/^\.\//, ""));
        const declaration = readFileSync(declarationPath, "utf8");

        expect(declaration).toContain("Router");
        expect(declaration).toContain("useRouter");
        expect(declaration).not.toContain("export {}");
    });
});
