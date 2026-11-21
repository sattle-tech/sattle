import { describe, expect, it } from 'vitest';

import { canDeleteGroup, isSettledUp } from './groupRules';

describe('canDeleteGroup', () => {
  const riya = { id: 'm-riya', claimedByUserId: 'u-riya', alsoHeldBy: ['u-riya-laptop'] };
  const kabir = { id: 'm-kabir', claimedByUserId: 'u-kabir' };
  const aman = { id: 'm-aman' };
  const group = { createdByMemberId: 'm-riya' };

  it('is for whoever made the group, on any of their devices', () => {
    expect(canDeleteGroup(group, [riya, kabir, aman], 'u-riya')).toBe(true);
    expect(canDeleteGroup(group, [riya, kabir, aman], 'u-riya-laptop')).toBe(true);
  });

  it('is not for anyone else in it, or for someone who isn’t in it', () => {
    expect(canDeleteGroup(group, [riya, kabir, aman], 'u-kabir')).toBe(false);
    expect(canDeleteGroup(group, [riya, kabir, aman], 'u-stranger')).toBe(false);
  });

  it('falls to the only account left once whoever made it has gone', () => {
    const left = { id: 'm-riya' };
    expect(canDeleteGroup({}, [left, kabir, aman], 'u-kabir')).toBe(true);
    // Not while someone else can still open the group.
    const dev = { id: 'm-dev', claimedByUserId: 'u-dev' };
    expect(canDeleteGroup({}, [left, kabir, dev], 'u-kabir')).toBe(false);
    // A second device of the same person is another account.
    expect(canDeleteGroup({}, [left, { ...kabir, alsoHeldBy: ['u-kabir-laptop'] }], 'u-kabir')).toBe(false);
  });
});

describe('isSettledUp', () => {
  const debts = [{ fromMemberId: 'm-kabir', toMemberId: 'm-riya' }];

  it('is false for the one paying and the one owed, and true for everyone else', () => {
    expect(isSettledUp(debts, 'm-kabir')).toBe(false);
    expect(isSettledUp(debts, 'm-riya')).toBe(false);
    expect(isSettledUp(debts, 'm-aman')).toBe(true);
    expect(isSettledUp([], 'm-kabir')).toBe(true);
  });
});
