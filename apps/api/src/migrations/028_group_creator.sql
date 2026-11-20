-- Who made the group (Group.createdByMemberId). Only they can delete it, and
-- it is the member, not the account, so it holds on every device they joined
-- from. As with group_log.by_member_id it is no foreign key: it is cleared
-- when that member becomes a ghost again, by leaving or deleting their
-- account, and a ghost nobody built on can be removed.
ALTER TABLE expense_groups ADD COLUMN created_by_member_id TEXT;

-- A group starts with whoever made it as its first member. Where someone
-- still holds that member, they made the group. Where it is a ghost or gone,
-- whoever made the group has left, and it has nobody who did.
UPDATE expense_groups SET created_by_member_id = (
  SELECT m.id FROM members m
  WHERE m.group_id = expense_groups.id AND m.position = 0 AND m.claimed_by_user_id IS NOT NULL
);
