import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { saveWish } from "@/server/services/records";
const input = {
  title: "一起看展",
  description: "",
  planned_date: null,
  category: "experience" as const,
  completed: true,
};
function fixture(completed_at: string | null) {
  const existing = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { completed_at }, error: null }),
  };
  const updated = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { id: "wish" }, error: null }),
  };
  const update = vi.fn().mockReturnValue(updated);
  const db = {
    from: vi.fn().mockReturnValueOnce(existing).mockReturnValue({ update }),
  };
  return { db: db as unknown as SupabaseClient, update };
}
describe("共同事项完成时间", () => {
  it("编辑已经完成的事项，保留第一次完成时间", async () => {
    const { db, update } = fixture("2026-10-28T00:00:00Z");
    await saveWish(db, input, "current-user", "current-space", "wish");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        completed_at: "2026-10-28T00:00:00Z",
        updated_by: "current-user",
      }),
    );
  });
  it("恢复待完成，清空完成时间而不改创建者或空间", async () => {
    const chain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { id: "wish" }, error: null }),
      },
      update = vi.fn().mockReturnValue(chain),
      db = { from: vi.fn().mockReturnValue({ update }) };
    await saveWish(
      db as unknown as SupabaseClient,
      { ...input, completed: false },
      "current-user",
      "current-space",
      "wish",
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ completed_at: null }),
    );
    const value = update.mock.calls[0][0];
    expect(value).not.toHaveProperty("space_id");
    expect(value).not.toHaveProperty("created_by");
    expect(chain.eq).toHaveBeenCalledWith("space_id", "current-space");
  });
});
