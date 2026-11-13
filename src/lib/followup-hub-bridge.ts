import { z } from 'zod'

export const hubOrigin = 'https://pitch-nav-agent-hub-luke.loosegown32.chatgpt.site'
export const bridgeChannel = 'pitchnav-followup-v1'
const endpoint = '/api/admin/assessment-followup'
const uuid = z.string().uuid()
const version = z.string().datetime({offset:true})
const base = z.object({ channel: z.literal(bridgeChannel), nonce: uuid })
const request = base.extend({ id:z.string().min(1).max(128) })
const list = request.extend({ type:z.literal('list'), payload:z.object({page:z.number().int().min(1).max(100000)}) })
const get = request.extend({ type:z.literal('get'), payload:z.object({analysisId:uuid}) })
const save = request.extend({ type:z.literal('save'), payload:z.object({analysisId:uuid,sourceRevision:version,revision:version,body:z.string().trim().min(1).max(60000)}) })
const incoming = z.discriminatedUnion('type',[base.extend({type:z.literal('hello')}),list,get,save])
type Incoming = z.infer<typeof incoming>
const states = z.enum(['pending','generating','ready','failed','permission_required'])
const item = z.object({analysisId:uuid,label:z.string(),reviewedAt:version,status:states})
const queue = z.object({items:z.array(item).max(20),page:z.number(),hasNext:z.boolean()})
const entry = z.object({analysis_id:uuid,source_revision:version,updated_at:version,body:z.string().nullable(),status:states})

export function isBridgeNonce(input: unknown): input is string { return uuid.safeParse(input).success }

export function parseHubCommand(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, opener: Window | null, nonce: string) {
  if (!opener || event.origin !== hubOrigin || event.source !== opener || event.data?.nonce !== nonce) return null
  const parsed = incoming.safeParse(event.data)
  return parsed.success ? parsed.data : null
}

export async function replyToHub(command: Incoming, signal: AbortSignal) {
  const { channel, nonce } = command
  if (command.type === 'hello') return { channel, nonce, type:'ready' }
  const { type, id, payload } = command
  const reply = (resultType: string, payload: unknown) => ({ channel, nonce, type:resultType, id, payload })
  try {
    const url = type === 'list' ? endpoint + '/list?page=' + payload.page :
      type === 'get' ? endpoint + '?analysisId=' + encodeURIComponent(payload.analysisId) : endpoint
    const response = await fetch(url, {
      credentials:'same-origin', cache:'no-store', signal,
      ...(type === 'save' ? { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) } : {}),
    })
    const json = await response.json()
    if (!response.ok) return reply('error', { status:response.status, message:typeof json.error === 'string' ? json.error : 'Could not open the staff follow-up.' })
    if (type === 'list') return reply('list-result', queue.parse(json))
    if (!json.draft) return reply('error', { status:404, message:'This assessment has no saved follow-up.' })
    const draft = entry.parse(json.draft)
    if (draft.analysis_id !== payload.analysisId) throw new Error('Unexpected draft')
    // Only the saved coaching copy and edit revisions are shared with the private hub.
    return reply(type + '-result', { analysisId:draft.analysis_id, sourceRevision:draft.source_revision,
      revision:draft.updated_at, body:draft.body, status:draft.status })
  } catch {
    return reply('error', { status:503, message:'Could not reach the staff follow-up. Reconnect or try again.' })
  }
}
