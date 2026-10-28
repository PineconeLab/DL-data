import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, requireMembership } from "@/server/services/access";
import { assertSameOrigin, readBytes } from "@/server/http";
describe("业务接口身份边界", () => {
  it("未登录不能执行业务操作", async () => {
    const db = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    await expect(
      requireUser(db as unknown as SupabaseClient),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("已登录但无成员资格被拒绝", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const db = { from: vi.fn().mockReturnValue(query) };
    await expect(
      requireMembership(db as unknown as SupabaseClient, "outsider"),
    ).rejects.toMatchObject({ status: 403 });
    expect(query.eq).toHaveBeenCalledWith("user_id", "outsider");
  });
  it("拒绝跨站状态更改请求", () => {
    process.env.APP_URL = "http://127.0.0.1:3000";
    expect(() =>
      assertSameOrigin(
        new Request("http://127.0.0.1:3000/api/wishes", {
          headers: { origin: "https://elsewhere.test" },
        }),
      ),
    ).toThrow("请求来源无效");
    expect(() =>
      assertSameOrigin(
        new Request("http://127.0.0.1:3000/api/wishes", {
          headers: { origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).not.toThrow();
  });
  it("即使没有 Content-Length 也限制实际读取字节数", async () => {
    await expect(
      readBytes(
        new Request("http://local", { method: "POST", body: "abcdefgh" }),
        4,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
});
