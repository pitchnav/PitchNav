# Profile Admin Permission Security Design

## Problem

The `profiles` update policy limits a signed-in user to their own row, but the
table-level `UPDATE` grant lets that user change every column in the row. That
includes `is_admin`, so row-level security alone does not prevent self-promotion.

## Design

Add a new forward-only migration. Revoke broad profile-update privileges from
public client roles, then grant the `authenticated` role update access only to
`full_name` and `avatar_url`. Recreate the existing own-profile update policy
with both `USING` and `WITH CHECK` ownership conditions.

Admin promotion remains possible only through trusted server-side/service-role
operations or direct database administration. Existing migrations and
application code remain unchanged. The migration will be prepared and tested
locally but will not be applied to production in this task.

## Verification

A focused regression test reads the migration and verifies that it:

- revokes table-wide updates from `anon` and `authenticated`;
- explicitly revokes protected-column updates;
- grants authenticated users only `full_name` and `avatar_url` updates; and
- enforces ownership before and after an update.

