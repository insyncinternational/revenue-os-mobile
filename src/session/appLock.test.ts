import { LOCK_AFTER_MS, pickBiometric, shouldLockOnReturn } from "./appLock";

// The real enum values (1 fingerprint, 2 face, 3 iris), so pickBiometric compares the same numbers.
jest.mock("expo-local-authentication", () => ({ AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 } }));
jest.mock("@/lib/storage", () => ({ storage: { getBoolean: () => false, set: jest.fn() } }));

const FINGER = 1;
const FACE = 2;

describe("app lock", () => {
  it("locks only after a minute away, and only when switched on", () => {
    const now = 1_000_000;
    expect(shouldLockOnReturn(true, now - LOCK_AFTER_MS, now)).toBe(true);
    expect(shouldLockOnReturn(true, now - 5_000, now)).toBe(false);
    expect(shouldLockOnReturn(false, now - LOCK_AFTER_MS * 10, now)).toBe(false);
    expect(shouldLockOnReturn(true, null, now)).toBe(false);
  });

  it("says fingerprint on Android when the phone has both (the prompt asks for the finger)", () => {
    expect(pickBiometric("android", [FINGER, FACE])).toBe("fingerprint");
    expect(pickBiometric("android", [FACE])).toBe("face");
    expect(pickBiometric("android", [])).toBe("other");
  });

  it("says Face ID on an iPhone with Face ID", () => {
    expect(pickBiometric("ios", [FACE])).toBe("face");
    expect(pickBiometric("ios", [FINGER])).toBe("fingerprint");
  });
});
