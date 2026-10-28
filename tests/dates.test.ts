import { describe, it, expect } from "vitest";
import {
  isDateOnly,
  daysTogether,
  shanghaiToday,
  monthGrid,
  shiftMonth,
} from "@/lib/dates";
import { meetingInput, wishInput } from "@/lib/validations";
import { safeNext } from "@/lib/navigation";
describe("上海自然日，无时区偏移", () => {
  it("纪念日当天为第 1 天，跨月与闰年一致", () => {
    expect(daysTogether("2024-02-28", "2024-03-01")).toBe(3);
    expect(daysTogether("2026-10-28", "2026-10-28")).toBe(1);
    expect(daysTogether("2026-10-29", "2026-10-28")).toBeNull();
  });
  it("上海午夜切换，其他时区不影响 date 字段", () => {
    expect(shanghaiToday(new Date("2026-10-27T16:00:00Z"))).toBe("2026-10-28");
    expect(shanghaiToday(new Date("2026-10-27T15:59:59Z"))).toBe("2026-10-27");
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Shanghai"]) {
      process.env.TZ = tz;
      expect(daysTogether("2026-03-07", "2026-03-09")).toBe(3);
    }
  });
  it("拒绝不存在的日期及 datetime 输入", () => {
    expect(isDateOnly("2025-02-29")).toBe(false);
    expect(isDateOnly("2024-02-29")).toBe(true);
    expect(isDateOnly("2026-10-28T00:00:00Z")).toBe(false);
  });
  it("日历以周一开头，月份切换跨年正确", () => {
    expect(monthGrid("2026-02").filter(Boolean)).toHaveLength(28);
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});
describe("表单与跳转校验", () => {
  it("新增与编辑使用同一完整字段校验，不接受身份或空间注入", () => {
    const input = {
      date: "2026-10-28",
      title: "一次见面",
      status: "planned",
      activities: ["散步"],
    };
    expect(meetingInput.parse(input)).toMatchObject({
      status: "planned",
      date: "2026-10-28",
    });
    expect(
      meetingInput.safeParse({ ...input, title: "", user_id: "fake" }).success,
    ).toBe(false);
    expect(meetingInput.safeParse({ ...input, space_id: "fake" }).success).toBe(
      false,
    );
    expect(meetingInput.parse({ ...input, status: "completed" }).status).toBe(
      "completed",
    );
  });
  it("事项计划日期可以为空，完成和恢复均通过校验", () => {
    expect(
      wishInput.parse({
        title: "买一本书",
        planned_date: null,
        category: "other",
        completed: false,
      }).planned_date,
    ).toBeNull();
    expect(wishInput.safeParse({ title: " ", category: "other" }).success).toBe(
      false,
    );
  });
  it("回调只允许内部邀请页，不接受外部重定向", () => {
    expect(safeNext("https://evil.test")).toBe("/");
    expect(safeNext("//evil.test")).toBe("/");
    expect(safeNext("/invite/" + "a".repeat(64))).toContain("/invite/");
  });
});
