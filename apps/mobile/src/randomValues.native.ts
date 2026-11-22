/**
 * crypto.getRandomValues for the phone apps, from the OS. Hermes has no
 * `crypto`, and nostr-tools needs it to make the throwaway key and the
 * message nonces for a remote signer (nostr/bunker.ts). Without it, signing
 * in with a Nostr signer or linking one fails on iOS and Android with
 * "crypto.getRandomValues must be defined".
 *
 * index.ts imports this first. The web has its own: randomValues.ts is empty.
 */

import { getRandomValues } from 'expo-crypto';

const g = globalThis as { crypto?: { getRandomValues?: unknown } };
g.crypto ??= {};
g.crypto.getRandomValues ??= getRandomValues;
