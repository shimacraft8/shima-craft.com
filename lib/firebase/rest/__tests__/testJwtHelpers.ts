/** テスト専用: RS256のテスト鍵ペア生成と、任意クレームで署名したJWT文字列の組み立て。 */

export async function generateTestRsaKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  ) as Promise<CryptoKeyPair>;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function utf8ToBase64Url(text: string): string {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

export async function exportPublicJwk(
  publicKey: CryptoKey,
  kid: string
): Promise<JsonWebKey & { kid: string }> {
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  return { ...jwk, kid, alg: "RS256", use: "sig" };
}

export async function signTestJwt(
  privateKey: CryptoKey,
  kid: string,
  claims: Record<string, unknown>
): Promise<string> {
  const header = { alg: "RS256", kid, typ: "JWT" };
  const signingInput = `${utf8ToBase64Url(JSON.stringify(header))}.${utf8ToBase64Url(JSON.stringify(claims))}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export function jwkSetResponse(keys: JsonWebKey[]): Response {
  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=21600" },
  });
}
