import { CompanyEmployeeCredentialV1 } from './schema';
import { canonicalSerializeCredential } from './serialization';

/**
 * Sign a credential using HMAC-SHA256 via Web Crypto API.
 */
export async function signCredential(
  credential: CompanyEmployeeCredentialV1,
  secretKey: string
): Promise<CompanyEmployeeCredentialV1> {
  if (!secretKey) {
    throw new Error('Signing key must be provided.');
  }

  const canonicalJson = canonicalSerializeCredential(credential);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalJson);
  const keyData = encoder.encode(secretKey);

  const cryptoSubtle = getSubtleCrypto();
  const key = await cryptoSubtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await cryptoSubtle.sign('HMAC', key, data);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const hexSignature = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    ...credential,
    signature: hexSignature,
  };
}

/**
 * Verify a credential's digital signature using HMAC-SHA256 via Web Crypto API.
 */
export async function verifyCredentialSignature(
  credential: CompanyEmployeeCredentialV1,
  secretKey: string
): Promise<boolean> {
  if (!credential.signature || !secretKey) {
    return false;
  }

  try {
    const canonicalJson = canonicalSerializeCredential(credential);
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalJson);
    const keyData = encoder.encode(secretKey);

    // Convert hex signature back to Uint8Array
    const hex = credential.signature;
    const signatureBytes = new Uint8Array(
      hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const cryptoSubtle = getSubtleCrypto();
    const key = await cryptoSubtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    return await cryptoSubtle.verify('HMAC', key, signatureBytes, data);
  } catch (e) {
    return false;
  }
}

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  // Node.js fallback
  // eslint-disable-next-line
  const nodeCrypto = require('crypto');
  return nodeCrypto.webcrypto.subtle;
}
