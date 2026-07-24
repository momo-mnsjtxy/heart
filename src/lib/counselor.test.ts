import { describe, expect, it } from "vitest";
import { detectCrisis, CRISIS_KEYWORDS } from "@/lib/counselor";

describe("detectCrisis", () => {
  it("detects known crisis keywords", () => {
    for (const keyword of ["自杀", "不想活", "割腕", "想死"]) {
      expect(detectCrisis(`我最近${keyword}`)).toBe(true);
    }
  });

  it("returns false for ordinary emotional language", () => {
    expect(detectCrisis("今天有点焦虑，想聊聊")).toBe(false);
    expect(detectCrisis("工作压力很大")).toBe(false);
  });

  it("covers the configured keyword list", () => {
    expect(CRISIS_KEYWORDS.length).toBeGreaterThan(5);
    expect(detectCrisis(CRISIS_KEYWORDS[0])).toBe(true);
  });
});
