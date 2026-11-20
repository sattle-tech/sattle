/**
 * Who may delete a group, and when someone may leave one.
 *
 * Deleting takes a group away from everyone in it, so it is for the person
 * who made it, on any of their devices. Once they have left, or deleted their
 * account, nobody made the group: it then goes only when one account is left
 * in it, which nobody else could open anyway. Everyone else leaves instead,
 * and only once they are settled up, with nothing to pay and nothing owed to
 * them, so leaving can't walk away from a debt. One device of several going
 * isn't the person leaving, so that one may go with a debt still open. The
 * server enforces both (DELETE /groups/:id and POST /groups/:id/leave).
 */

import { accountsOf, isHeldBy } from './members';
import type { Debt, Group, Member } from './types';

type Account = Pick<Member, 'id' | 'claimedByUserId' | 'alsoHeldBy'>;

/** Whether `userId` may delete the group: they made it, or theirs is the only account in it. */
export function canDeleteGroup(group: Pick<Group, 'createdByMemberId'>, members: Account[], userId: string): boolean {
  const mine = members.find((m) => isHeldBy(m, userId));
  if (!mine) return false;
  if (mine.id === group.createdByMemberId) return true;
  return members.reduce((n, m) => n + accountsOf(m).length, 0) === 1;
}

/** Whether no debt names this member, as the one paying or the one owed. */
export function isSettledUp(debts: Pick<Debt, 'fromMemberId' | 'toMemberId'>[], memberId: string): boolean {
  return !debts.some((d) => d.fromMemberId === memberId || d.toMemberId === memberId);
}
