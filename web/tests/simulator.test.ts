import { describe, expect, it } from "vitest";
import { vaNumber, groupVa, qrPayload, expiryFor, sign, verifySignature, receiptHash, simulatorToken, verifySimulatorToken } from "@/lib/payments/simulator";
import { createHash } from "crypto";

describe("simulator", () => {
  it("VA starts with 9999 + bank code, 16 digits, deterministic and distinct", () => {
    const a = vaNumber("va_bca", "p_abc");
    expect(a).toMatch(/^99991\d{11}$/);
    expect(vaNumber("va_bni", "p_abc")).toMatch(/^99992\d{11}$/);
    expect(vaNumber("va_mandiri", "p_abc")).toMatch(/^99993\d{11}$/);
    expect(vaNumber("va_bca", "p_abc")).toBe(a);
    expect(vaNumber("va_bca", "p_abd")).not.toBe(a);
    expect(groupVa("9999123456789012")).toBe("9999 1234 5678 9012");
  });
  it("QR payload format", () => {
    expect(qrPayload("p_1", BigInt(27662872))).toBe("RESIDENTSTART-SIM|p_1|27662872");
    expect(qrPayload("p_1", 1, "https://x/simulator/p_1?t=a")).toBe("https://x/simulator/p_1?t=a");
  });
  it("expiry: VA 24h, QRIS 15 min", () => {
    const t = new Date("2026-11-12T00:00:00Z");
    expect(expiryFor("va_bca", t).toISOString()).toBe("2026-11-13T00:00:00.000Z");
    expect(expiryFor("qris", t).toISOString()).toBe("2026-11-12T00:15:00.000Z");
  });
  it("HMAC signature verification", () => {
    const body = '{"a":1}';
    const sig = sign(body, "s3cret");
    expect(verifySignature(body, sig, "s3cret")).toBe(true);
    expect(verifySignature(body, sig, "other")).toBe(false);
    expect(verifySignature('{"a":2}', sig, "s3cret")).toBe(false);
    expect(verifySignature(body, "zz", "s3cret")).toBe(false);
    expect(verifySignature(body, null, "s3cret")).toBe(false);
  });
  it("receipt hash = sha256(loan|period|amount|paid_at)", () => {
    const iso = "2026-11-12T03:00:00.000Z";
    const expected = createHash("sha256").update(`L1|2|27662872|${iso}`).digest("hex");
    expect(receiptHash("L1", 2, "27662872", iso)).toBe(expected);
    expect(expected).toHaveLength(64);
  });
  it("simulator token", () => {
    const t = simulatorToken("p_1", "k");
    expect(verifySimulatorToken("p_1", t, "k")).toBe(true);
    expect(verifySimulatorToken("p_2", t, "k")).toBe(false);
  });
});
