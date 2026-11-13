// Version 3 additionally covers writing a follow-up from staff-reviewed text.
export const AI_DRAFT_PERMISSION_VERSION = 3

export const AI_DRAFT_PERMISSION_TEXT = 'Allow staff to send OpenAI still images from across this delivery, including six phase panels and a delivery overview, their times and measurements, and relevant age, body, pitching and movement-screen information. This includes the pitching goal and mechanics concern entered in this intake. After staff verifies my assessment, Pitch Nav may also send the reviewed findings, assigned drills and plan to OpenAI to draft my coaching follow-up automatically. Staff reviews both drafts.'

export function permitsMechanicsDraft(version: unknown) {
  return version === 2 || version === AI_DRAFT_PERMISSION_VERSION
}
