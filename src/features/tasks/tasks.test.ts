import type { CrmTask, TaskInput } from "@/types/contact";
import { bucketOf, groupDone, groupTasks, taskBody, taskContact } from "./tasks";

const now = new Date(2026, 10, 3, 14, 0); // Tue 3 Nov 2026, 14:00 local
const at = (d: number, h = 9) => new Date(2026, 10, d, h, 0).toISOString();
const task = (id: number, due_at: string | null, extra: Partial<CrmTask> = {}): CrmTask => ({ id, title: `T${id}`, status: "pending", task_type: "call", due_at, lead_id: null, deal_id: null, ...extra });

describe("tasks", () => {
  it("puts tasks in the right section", () => {
    expect(bucketOf(task(1, at(3, 9)), now)).toBe("overdue"); // earlier today
    expect(bucketOf(task(1, at(3, 17)), now)).toBe("today");
    expect(bucketOf(task(1, at(4)), now)).toBe("tomorrow");
    expect(bucketOf(task(1, at(8)), now)).toBe("week");
    expect(bucketOf(task(1, at(20)), now)).toBe("later");
    expect(bucketOf(task(1, null), now)).toBe("none");
  });

  it("groups in a fixed order with counts, soonest first, empty sections left out", () => {
    const items = groupTasks([task(1, null), task(2, at(20)), task(3, at(3, 17)), task(4, at(1)), task(5, at(3, 16))], now);
    expect(items.filter((i) => i.type === "header").map((i) => (i.type === "header" ? `${i.bucket}:${i.count}` : ""))).toEqual(["overdue:1", "today:2", "later:1", "none:1"]);
    const today = items.filter((i) => i.type === "row" && i.bucket === "today").map((i) => (i.type === "row" ? i.task.id : 0));
    expect(today).toEqual([5, 3]);
  });

  it("lists finished tasks most recent first", () => {
    const items = groupDone([task(1, null, { completed_at: at(1) }), task(2, null, { completed_at: at(2) })]);
    expect(items.map((i) => i.key)).toEqual(["h-done", "t-2", "t-1"]);
    expect(groupDone([])).toEqual([]);
  });

  it("names the contact a task is about", () => {
    expect(taskContact({ lead: { id: 1, first_name: "Sara", last_name: "Ahmed", company: "Northwind" } })).toBe("Sara Ahmed");
    expect(taskContact({ lead: { id: 1, first_name: null, last_name: null, company: "Northwind" } })).toBe("Northwind");
    expect(taskContact({ lead: null })).toBeNull();
  });

  it("builds a safe body: needs a title, never sends a null due date, clears a description only on edit", () => {
    const input: TaskInput = { title: "  Call back ", task_type: "call", priority: "high", due_at: null, lead_id: 7, deal_id: null, description: " " };
    expect(taskBody({ ...input, title: " " }, "create")).toEqual({ ok: false });
    const created = taskBody(input, "create");
    expect(created).toEqual({ ok: true, body: { title: "Call back", task_type: "call", priority: "high", lead_id: 7, deal_id: null } });
    const edited = taskBody({ ...input, due_at: at(5) }, "edit");
    expect(edited.ok && edited.body.description).toBeNull();
    expect(edited.ok && edited.body.due_at).toBe(at(5));
  });
});
