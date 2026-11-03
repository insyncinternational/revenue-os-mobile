import { LOCK_AFTER_MS, shouldLockOnReturn } from "./appLock";

jest.mock("expo-local-authentication", () => ({}));
jest.mock("@/lib/storage", () => ({ storage: { getBoolean: () => false, set: jest.fn() } }));

describe("app lock", () => {
  it("locks only after a minute away, and only when switched on", () => {
    const now = 1_000_000;
    expect(shouldLockOnReturn(true, now - LOCK_AFTER_MS, now)).toBe(true);
    expect(shouldLockOnReturn(true, now - 5_000, now)).toBe(false);
    expect(shouldLockOnReturn(false, now - LOCK_AFTER_MS * 10, now)).toBe(false);
    expect(shouldLockOnReturn(true, null, now)).toBe(false);
  });
});
