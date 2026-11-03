import { newStorageKey } from "./storage";

// jest hoists these mocks above the import.
jest.mock("react-native-mmkv", () => ({ createMMKV: () => ({}) }));
jest.mock("expo-secure-store", () => ({ getItem: () => "k", setItem: jest.fn(), AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 0 }));
jest.mock("expo-crypto", () => ({ getRandomBytes: (n: number) => new Uint8Array(n).fill(171) }));

describe("storage key", () => {
  it("is 32 hex characters (16 random bytes): fits AES-256's 32-byte key", () => {
    const key = newStorageKey();
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(newStorageKey(new Uint8Array([0, 1, 255, 16]))).toBe("0001ff10");
  });
});
