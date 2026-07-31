import { describe, expect, it } from "vitest";
import {
  decodeFields,
  decodeValue,
  encodeFields,
  encodeValue,
  increment,
  isFieldSentinel,
  serverTimestamp,
  splitFieldsAndTransforms,
} from "../firestoreValues";

describe("encodeValue / decodeValue", () => {
  it("round-trips string", () => {
    expect(encodeValue("hello")).toEqual({ stringValue: "hello" });
    expect(decodeValue({ stringValue: "hello" })).toBe("hello");
  });

  it("round-trips boolean", () => {
    expect(encodeValue(true)).toEqual({ booleanValue: true });
    expect(decodeValue({ booleanValue: false })).toBe(false);
  });

  it("round-trips null and undefined as nullValue", () => {
    expect(encodeValue(null)).toEqual({ nullValue: null });
    expect(encodeValue(undefined)).toEqual({ nullValue: null });
    expect(decodeValue({ nullValue: null })).toBeNull();
  });

  it("encodes integers as integerValue (string) and decodes back to a number", () => {
    expect(encodeValue(42)).toEqual({ integerValue: "42" });
    expect(decodeValue({ integerValue: "42" })).toBe(42);
  });

  it("encodes non-integers as doubleValue", () => {
    expect(encodeValue(3.14)).toEqual({ doubleValue: 3.14 });
    expect(decodeValue({ doubleValue: 3.14 })).toBe(3.14);
  });

  it("round-trips a Date as an ISO timestampValue", () => {
    const d = new Date("2026-07-31T10:00:00.000Z");
    expect(encodeValue(d)).toEqual({ timestampValue: "2026-07-31T10:00:00.000Z" });
    expect(decodeValue({ timestampValue: "2026-07-31T10:00:00.000Z" })).toBe("2026-07-31T10:00:00.000Z");
  });

  it("normalizes sub-millisecond timestamp precision to milliseconds on decode", () => {
    // FirestoreはnanoSec精度を返しうるが、既存実装(Timestamp.toDate().toISOString())と同じ
    // ミリ秒精度へ正規化する。
    expect(decodeValue({ timestampValue: "2026-07-31T10:00:00.123456789Z" })).toBe(
      "2026-07-31T10:00:00.123Z"
    );
  });

  it("round-trips arrays", () => {
    expect(encodeValue([1, "a", true])).toEqual({
      arrayValue: { values: [{ integerValue: "1" }, { stringValue: "a" }, { booleanValue: true }] },
    });
    expect(decodeValue({ arrayValue: { values: [{ integerValue: "1" }, { stringValue: "a" }] } })).toEqual([
      1,
      "a",
    ]);
  });

  it("round-trips nested maps (plain objects)", () => {
    const encoded = encodeValue({ a: 1, b: { c: "x" } });
    expect(encoded).toEqual({
      mapValue: { fields: { a: { integerValue: "1" }, b: { mapValue: { fields: { c: { stringValue: "x" } } } } } },
    });
    expect(decodeValue(encoded)).toEqual({ a: 1, b: { c: "x" } });
  });

  it("decodeValue returns null for undefined input (missing field)", () => {
    expect(decodeValue(undefined)).toBeNull();
  });

  it("throws for unsupported value types (e.g. function)", () => {
    expect(() => encodeValue(() => {})).toThrow(/unsupported/i);
  });
});

describe("encodeFields / decodeFields", () => {
  it("round-trips a flat object", () => {
    const fields = encodeFields({ name: "Taro", age: 30, active: true });
    expect(decodeFields(fields)).toEqual({ name: "Taro", age: 30, active: true });
  });

  it("skips undefined-valued keys entirely (ignoreUndefinedProperties相当)", () => {
    const fields = encodeFields({ a: 1, b: undefined });
    expect(Object.keys(fields)).toEqual(["a"]);
  });

  it("decodeFields returns {} for undefined input", () => {
    expect(decodeFields(undefined)).toEqual({});
  });

  it("encodeFields throws if given a sentinel (must use splitFieldsAndTransforms instead)", () => {
    expect(() => encodeFields({ updatedAt: serverTimestamp() })).toThrow(/splitFieldsAndTransforms/);
  });
});

describe("sentinels: serverTimestamp / increment", () => {
  it("isFieldSentinel identifies sentinels and rejects plain values", () => {
    expect(isFieldSentinel(serverTimestamp())).toBe(true);
    expect(isFieldSentinel(increment(1))).toBe(true);
    expect(isFieldSentinel("plain string")).toBe(false);
    expect(isFieldSentinel({ a: 1 })).toBe(false);
    expect(isFieldSentinel(null)).toBe(false);
  });

  it("splitFieldsAndTransforms separates serverTimestamp into fieldTransforms", () => {
    const { fields, fieldTransforms } = splitFieldsAndTransforms({
      name: "Taro",
      updatedAt: serverTimestamp(),
    });
    expect(fields).toEqual({ name: { stringValue: "Taro" } });
    expect(fieldTransforms).toEqual([{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }]);
  });

  it("splitFieldsAndTransforms separates increment into fieldTransforms with an encoded value", () => {
    const { fields, fieldTransforms } = splitFieldsAndTransforms({ adminCount: increment(1) });
    expect(fields).toEqual({});
    expect(fieldTransforms).toEqual([{ fieldPath: "adminCount", increment: { integerValue: "1" } }]);
  });

  it("splitFieldsAndTransforms skips undefined values and handles a mix of plain/sentinel fields", () => {
    const { fields, fieldTransforms } = splitFieldsAndTransforms({
      role: "admin",
      notes: undefined,
      updatedAt: serverTimestamp(),
      adminCount: increment(-1),
    });
    expect(fields).toEqual({ role: { stringValue: "admin" } });
    expect(fieldTransforms).toEqual([
      { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
      { fieldPath: "adminCount", increment: { integerValue: "-1" } },
    ]);
  });
});
