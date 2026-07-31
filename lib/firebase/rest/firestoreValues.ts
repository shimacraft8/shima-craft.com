import "server-only";

/**
 * Firestore REST の Value 表現 ⇔ アプリのプレーンJS値、の相互変換。
 * firebase-admin/firestore の Timestamp/FieldValue に依存せず、Web標準APIのみで完結させる
 * （Cloudflare Workers対応）。
 *
 * 対応する型は、このプロジェクトのFirestoreデータに実際に存在するものだけに絞る
 * （string, number, boolean, null, Date/timestamp, 配列, ネストしたmap）。
 * geoPoint/bytes/referenceValueは未使用のため扱わない。
 */

export type FirestoreRestValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields?: Record<string, FirestoreRestValue> } }
  | { arrayValue: { values?: FirestoreRestValue[] } };

const SENTINEL_KIND = Symbol("firestoreRestSentinelKind");

export type ServerTimestampSentinel = { [SENTINEL_KIND]: "serverTimestamp" };
export type IncrementSentinel = { [SENTINEL_KIND]: "increment"; value: number };
export type FieldSentinel = ServerTimestampSentinel | IncrementSentinel;

/** Firestoreのサーバー側現在時刻を書き込む（FieldValue.serverTimestamp()の代替）。 */
export function serverTimestamp(): ServerTimestampSentinel {
  return { [SENTINEL_KIND]: "serverTimestamp" };
}

/** 数値フィールドをアトミックに加算する（FieldValue.increment(n)の代替）。 */
export function increment(value: number): IncrementSentinel {
  return { [SENTINEL_KIND]: "increment", value };
}

export function isFieldSentinel(value: unknown): value is FieldSentinel {
  return typeof value === "object" && value !== null && SENTINEL_KIND in value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

/** JSのプレーン値 → Firestore REST Value。サーバー側センチネル(serverTimestamp/increment)はここでは扱わない（呼び出し側で分離する）。 */
export function encodeValue(value: unknown): FirestoreRestValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((v) => encodeValue(v)) } };
  }
  if (isPlainObject(value)) {
    return { mapValue: { fields: encodeFields(value) } };
  }
  throw new Error(`encodeValue: unsupported value type (${typeof value})`);
}

/** Firestore REST Value → JSのプレーン値。 */
export function decodeValue(value: FirestoreRestValue | undefined): unknown {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) {
    // ナノ秒精度を持つことがあるが、既存実装(Timestamp.toDate().toISOString())と同じ
    // ミリ秒精度のISO文字列へ正規化する（Firestore側の保存精度は変えない）。
    return new Date(value.timestampValue).toISOString();
  }
  if ("mapValue" in value) return decodeFields(value.mapValue.fields);
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map((v) => decodeValue(v));
  return null;
}

/**
 * 書き込み用オブジェクトを「通常フィールド」と「サーバー側フィールド変換(fieldTransforms)」に分離する。
 * undefinedの値は既存実装の `ignoreUndefinedProperties: true` と同じ挙動でキーごと除外する。
 */
export function splitFieldsAndTransforms(data: Record<string, unknown>): {
  fields: Record<string, FirestoreRestValue>;
  fieldTransforms: Array<{ fieldPath: string } & (
    | { setToServerValue: "REQUEST_TIME" }
    | { increment: FirestoreRestValue }
  )>;
} {
  const fields: Record<string, FirestoreRestValue> = {};
  const fieldTransforms: Array<{ fieldPath: string } & (
    | { setToServerValue: "REQUEST_TIME" }
    | { increment: FirestoreRestValue }
  )> = [];

  for (const [key, raw] of Object.entries(data)) {
    if (raw === undefined) continue; // ignoreUndefinedProperties相当
    if (isFieldSentinel(raw)) {
      if (raw[SENTINEL_KIND] === "serverTimestamp") {
        fieldTransforms.push({ fieldPath: key, setToServerValue: "REQUEST_TIME" });
      } else {
        fieldTransforms.push({ fieldPath: key, increment: encodeValue(raw.value) });
      }
      continue;
    }
    fields[key] = encodeValue(raw);
  }

  return { fields, fieldTransforms };
}

export function encodeFields(data: Record<string, unknown>): Record<string, FirestoreRestValue> {
  const { fields, fieldTransforms } = splitFieldsAndTransforms(data);
  if (fieldTransforms.length > 0) {
    throw new Error(
      "encodeFields: sentinel values (serverTimestamp/increment) require splitFieldsAndTransforms, not encodeFields"
    );
  }
  return fields;
}

export function decodeFields(fields: Record<string, FirestoreRestValue> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    out[key] = decodeValue(value);
  }
  return out;
}
