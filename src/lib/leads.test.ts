import { describe, expect, it } from "vitest";
import { resolveLinkedTool, LINKED_TOOLS } from "./leads";

describe("leads.resolveLinkedTool", () => {
  it("새 id와 레거시 라벨을 모두 해석한다", () => {
    expect(resolveLinkedTool("signal_desk")).toEqual(LINKED_TOOLS.signal_desk);
    expect(resolveLinkedTool("Signal Desk (v2)")?.id).toBe("signal_desk");
    expect(resolveLinkedTool("Signal APT")?.id).toBe("signal_apt");
    expect(resolveLinkedTool(undefined)).toBeNull();
  });
});
