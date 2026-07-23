# Unpublished Draft Access Security Design

## Problem

Production row-level security currently lets an authenticated athlete select
every column from their own `motion_analyses` and `training_plans` rows before
staff publication. The motion-analysis update policy also lets the athlete
change an owned draft to any resulting status, including `published`.

Application pages hide some draft values visually, but the data remains
available through direct Supabase requests.

## Design

Add a forward-only migration that makes unpublished analysis and plan rows
staff-only. Athlete insert policies will require unpublished state, and direct
athlete update policies will be removed. Staff and service-role policies remain
unchanged.

The automatic submission flow currently reads draft rows for retry detection
and membership timing. Replace those reads with two security-definer functions
that return only harmless metadata:

- an analysis ID and whether its plan exists for an owned order;
- the ID and creation time of an owned recent analysis.

The review-notification route will use the service-role client after
authenticating the caller, then verify ownership before sending email.
Athlete-facing pages will explicitly filter for published analyses and plans as
defense in depth. Existing order cards remain the athlete-visible source for
pending-review status.

## Safety Boundaries

- Athletes cannot select unpublished analysis or plan content.
- Athletes cannot create already-published records.
- Athletes cannot directly update analysis or plan drafts after submission.
- Helper functions return metadata only and enforce owner-or-admin access.
- Staff and service-role processing continue against the base tables.
- Production deployment happens only after local verification.

## Verification

A regression test checks the migration policies, helper-function permissions,
submission-flow compatibility, server-side ownership verification, and
published-only filters on every athlete-facing analysis page. Production will
then be checked directly through `pg_policies` and role simulation.

