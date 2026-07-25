import { describe, expect, it } from "vitest";
import { greet } from "../src/greeting";

describe("greet", () => {
  it("should_returnGreeting_when_givenName", () => {
    expect(greet("World")).toBe("Hello, World!");
  });
});
