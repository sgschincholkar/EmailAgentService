import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  // Some test files opt into the node environment (@vitest-environment
  // node) for spec-correct binary Request/FormData handling, where no
  // `window` exists.
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});
