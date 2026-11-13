import { bridgeChannel, hubOrigin, parseHubCommand, replyToHub } from './followup-hub-bridge'

const nonce = '10000000-0000-4000-8000-000000000001'
const analysisId = '20000000-0000-4000-8000-000000000001'
const revision = '2026-11-13T01:00:00.000Z'
const opener = {} as Window
const base = { channel: bridgeChannel, nonce, id:'request-1' }
const original = global.fetch
afterEach(() => { global.fetch = original })
function incoming(data: unknown, origin = hubOrigin, source = opener) { return { origin, source, data } }
function command(data: unknown) { return parseHubCommand(incoming(data), opener, nonce)! }

test('accepts requests only from the private hub opener for its current connection', () => {
  const hello = { ...base, type:'hello' }
  expect(command(hello)?.type).toBe('hello')
  expect(parseHubCommand(incoming(hello,'https://other.chatgpt.site'),opener,nonce)).toBeNull()
  expect(parseHubCommand(incoming(hello,hubOrigin,{} as Window),opener,nonce)).toBeNull()
  expect(parseHubCommand(incoming(hello),opener,analysisId)).toBeNull()
  expect(parseHubCommand(incoming(hello),null,nonce)).toBeNull()
  expect(command({ ...base,type:'list',payload:{page:0} })).toBeNull()
  expect(command({ ...base,type:'generate',payload:{analysisId} })).toBeNull()
})
test('reads and saves shared copy without exposing the source, session or other columns', async () => {
  const draft = { analysis_id:analysisId,source_revision:revision,updated_at:revision,body:'Saved copy',status:'ready',source:{private:'internal frame notes'} }
  const mockFetch = jest.fn().mockResolvedValue({ok:true,json:async()=>({draft,account:'private'})})
  global.fetch = mockFetch
  const get = await replyToHub(command({...base,type:'get',payload:{analysisId}}),new AbortController().signal)
  expect(get).toEqual({...base,type:'get-result',payload:{analysisId,sourceRevision:revision,revision,body:'Saved copy',status:'ready'}})
  const payload = {analysisId,sourceRevision:revision,revision,body:'Edited copy'}
  await replyToHub(command({...base,type:'save',payload:{...payload,privateField:'discarded'}}),new AbortController().signal)
  expect(mockFetch.mock.calls[1][0]).toBe('/api/admin/assessment-followup')
  expect(mockFetch.mock.calls[1][1].method).toBe('PATCH')
  expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual(payload)
})
test('propagates auth and conflict errors and trims list metadata to the contract', async () => {
  const item = {analysisId,label:'Fictional pitcher',reviewedAt:revision,status:'ready'}
  global.fetch=jest.fn().mockResolvedValueOnce({ok:true,json:async()=>({items:[{...item,extra:'private'}],page:1,hasNext:false})})
    .mockResolvedValueOnce({ok:false,status:403,json:async()=>({error:'Staff required'})})
    .mockResolvedValueOnce({ok:false,status:409,json:async()=>({error:'Refresh latest'})})
  const list = command({...base,type:'list',payload:{page:1}})
  const signal = new AbortController().signal
  expect(await replyToHub(list,signal)).toEqual({...base,type:'list-result',payload:{items:[item],page:1,hasNext:false}})
  expect(await replyToHub(list,signal)).toEqual({...base,type:'error',payload:{status:403,message:'Staff required'}})
  expect(await replyToHub(command({...base,type:'save',payload:{analysisId,sourceRevision:revision,revision,body:'edited'}}),signal))
    .toEqual({...base,type:'error',payload:{status:409,message:'Refresh latest'}})
})
