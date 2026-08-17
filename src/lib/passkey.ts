// WebAuthn Passkey utilities
// Uses browser's native navigator.credentials API

const RP_NAME = 'Veylo App';
const PASSKEY_STORAGE_KEY = 'veylo_passkeys';

function getRPID(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname;
}

function getStoredCredentials(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PASSKEY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCredential(email: string, credential: any): void {
  const creds = getStoredCredentials();
  creds[email] = credential;
  localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(creds));
}

function getCredentialByEmail(email: string): any | null {
  const creds = getStoredCredentials();
  return creds[email] || null;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateChallenge(): ArrayBuffer {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge.buffer;
}

export function isPasskeySupported(): boolean {
  return typeof window !== 'undefined'
    && !!window.PublicKeyCredential
    && typeof navigator.credentials !== 'undefined'
    && typeof navigator.credentials.create === 'function'
    && typeof navigator.credentials.get === 'function';
}

export async function registerPasskey(
  email: string,
  fullName: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isPasskeySupported()) {
    return { success: false, error: 'Passkeys are not supported in this browser.' };
  }

  try {
    const challenge = generateChallenge();
    const rpID = getRPID();

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: RP_NAME, id: rpID },
        user: {
          id: new TextEncoder().encode(email),
          name: email,
          displayName: fullName,
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Passkey creation was cancelled.' };
    }

    const attestation = credential.response as AuthenticatorAttestationResponse;

    saveCredential(email, {
      id: credential.id,
      rawId: bufferToBase64(credential.rawId),
      type: credential.type,
      attestation: {
        clientDataJSON: bufferToBase64(attestation.clientDataJSON),
        attestationObject: bufferToBase64(attestation.attestationObject),
      },
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Passkey creation was cancelled.' };
    }
    return { success: false, error: err.message || 'Failed to create passkey.' };
  }
}

export async function authenticateWithPasskey(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isPasskeySupported()) {
    return { success: false, error: 'Passkeys are not supported in this browser.' };
  }

  const stored = getCredentialByEmail(email);
  if (!stored) {
    return { success: false, error: 'No passkey found for this email. Please sign in with email/password first, then register a passkey.' };
  }

  try {
    const challenge = generateChallenge();
    const rpID = getRPID();

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: rpID,
        allowCredentials: [{
          type: 'public-key',
          id: Uint8Array.from(atob(stored.rawId), c => c.charCodeAt(0)),
        }],
        userVerification: 'preferred',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, error: 'Passkey authentication was cancelled.' };
    }

    return { success: true };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Passkey authentication was cancelled or no matching passkey found.' };
    }
    return { success: false, error: err.message || 'Failed to authenticate with passkey.' };
  }
}

export function hasPasskeyRegistered(email: string): boolean {
  return getCredentialByEmail(email) !== null;
}

export function listPasskeys(): Array<{ email: string; createdAt: string }> {
  const creds = getStoredCredentials();
  return Object.entries(creds).map(([email, cred]) => ({
    email,
    createdAt: cred.createdAt || 'Unknown',
  }));
}

export function removePasskey(email: string): boolean {
  const creds = getStoredCredentials();
  if (!creds[email]) return false;
  delete creds[email];
  localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(creds));
  return true;
}

export function removeAllPasskeys(): void {
  localStorage.removeItem(PASSKEY_STORAGE_KEY);
}
