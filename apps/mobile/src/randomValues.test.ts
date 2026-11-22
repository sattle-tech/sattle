import { afterEach, describe, expect, it, vi } from 'vitest';

// expo-crypto as it is on a phone: the OS's random source (Node's, taken
// before the tests hide it), counted.
const os = vi.hoisted(() => ({ calls: 0, crypto: globalThis.crypto }));
vi.mock('expo-crypto', () => ({
  getRandomValues: (array: Uint8Array<ArrayBuffer>) => {
    os.calls++;
    return os.crypto.getRandomValues(array);
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  os.calls = 0;
});

describe('randomValues.native', () => {
  it('gives an engine with no crypto, like Hermes, what a remote signer needs', async () => {
    vi.stubGlobal('crypto', undefined);
    await import('./randomValues.native');
    const { generateSecretKey, getPublicKey } = await import('nostr-tools/pure');
    const nip44 = await import('nostr-tools/nip44');

    // The throwaway key we talk to the signer with, and a message to it.
    const ours = generateSecretKey();
    const theirs = generateSecretKey();
    expect(ours).toHaveLength(32);
    expect(ours).not.toEqual(theirs);
    const sent = nip44.encrypt('{"method":"connect"}', nip44.getConversationKey(ours, getPublicKey(theirs)));
    expect(nip44.decrypt(sent, nip44.getConversationKey(theirs, getPublicKey(ours)))).toBe('{"method":"connect"}');
    expect(os.calls).toBe(3);
  });

  it('keeps a getRandomValues the engine already has', async () => {
    const own = { getRandomValues: vi.fn() };
    vi.stubGlobal('crypto', own);
    await import('./randomValues.native');
    expect(globalThis.crypto).toBe(own);
    expect(globalThis.crypto.getRandomValues).toBe(own.getRandomValues);
  });
});
