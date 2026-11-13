// Version 3 additionally covers writing a follow-up from staff-reviewed text.
export const AI_DRAFT_PERMISSION_VERSION = 3

export function permitsMechanicsDraft(version: unknown) {
  return version === 2 || version === AI_DRAFT_PERMISSION_VERSION
}
