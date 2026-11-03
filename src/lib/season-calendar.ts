import { z } from 'zod'

export const seasonNames = {spring:'Spring / school ball', summer:'Summer / travel ball', fall:'Fall ball'} as const
const dayMs = 86400000
export const seasonsSchema = z.array(z.object({
  name:z.enum(['spring','summer','fall']), start:z.string().date(), end:z.string().date(),
}).refine(s=>s.start <= s.end && Date.parse(s.end)-Date.parse(s.start)<365*dayMs, 'Check the start and end dates.'))
  .min(1).max(3).refine(s=>new Set(s.map(x=>x.name)).size===s.length,'Select each season once.')
export type PlayingSeasons = z.infer<typeof seasonsSchema>

function anniversary(value:string, shift:number) {
  const date = new Date(value)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear()+shift,date.getUTCMonth()+1,0)).getUTCDate()
  return Date.UTC(date.getUTCFullYear()+shift,date.getUTCMonth(),Math.min(lastDay,date.getUTCDate()))
}

// The longest break between playing seasons is the annual development window.
// Short gaps between teams stay at maintenance effort.
export function liftingCalendar(seasons:PlayingSeasons, date:number, firstLift?:string) {
  const year = new Date(date).getUTCFullYear()
  const intervals = seasons.flatMap(s=>[-2,-1,0,1,2].map(offset=>{
    const shift = year - Number(s.start.slice(0,4)) + offset
    return {start:anniversary(s.start,shift),end:anniversary(s.end,shift)}
  })).sort((a,b)=>a.start-b.start)
  const merged: typeof intervals = []
  for (const interval of intervals) {
    const last = merged[merged.length-1]
    if (last && interval.start<=last.end+dayMs) last.end=Math.max(last.end,interval.end)
    else merged.push({...interval})
  }
  const maintenance = {phase:'Strength maintenance',maintenance:true,rpe:6,sets:2}
  const next = merged.findIndex(s=>s.end>=date)
  if (next<1 || merged[next].start<=date) return maintenance
  const gaps = merged.slice(1).map((s,i)=>({start:merged[i].end+dayMs,end:s.start}))
  const gap = gaps[next-1]
  const nearby = gaps.filter(g=>Math.abs(g.end-gap.end)<360*dayMs)
  if (nearby.some(g=>g.end-g.start>gap.end-gap.start+dayMs)) return maintenance
  const start = Math.max(gap.start,firstLift ? Date.parse(firstLift) : gap.start)
  if (date<start) return {phase:'Before lifting starts',maintenance:true,rpe:0,sets:0}
  const weeks = Math.floor((gap.end-start)/(7*dayMs))
  const count = Math.min(4-seasons.length, Math.floor(weeks/6))
  if (!count) return {...maintenance,phase:'Short offseason · maintenance'}
  // Split whole days so leftover days go in the middle of each cycle.
  // Count backward from the team start to keep the off-ramp exactly 21 days.
  const days = (gap.end-start)/dayMs
  const offset = Math.floor((date-start)/dayMs)
  const cycle = Math.floor(offset*count/days)
  const begin = Math.ceil(cycle*days/count)
  const end = Math.ceil((cycle+1)*days/count)
  const elapsed = Math.floor((offset-begin)/7)
  const left = Math.ceil((end-offset)/7)
  const rampDown = left<=3
  const stage = elapsed<3?'On-ramp':rampDown?'Off-ramp':'Strength'
  const rpe = elapsed<3 ? 6+elapsed : rampDown ? Math.max(5,left+4) : left<=6 ? 9 : 8
  return {phase:`Cycle ${cycle+1} of ${count} · ${stage}`,maintenance:false,rpe,sets:rampDown?2:3}
}
