import {liftingCalendar,type PlayingSeasons} from './season-calendar'
const schedule:PlayingSeasons=[
  {name:'spring',start:'2027-03-01',end:'2027-05-31'},
  {name:'summer',start:'2027-06-08',end:'2027-08-16'},
  {name:'fall',start:'2027-09-01',end:'2027-10-31'},
]
test.each([1,2,3])('%i playing seasons allocate the long break evenly with three weeks at each end',n=>{
  const seasons=schedule.slice(0,n)
  const groups=new Map<string,string[]>()
  for(let t=Date.parse(seasons[n-1].end)+86400000;t<Date.parse('2028-03-01');t+=604800000){
    const {phase}=liftingCalendar(seasons,t)
    const [cycle,stage]=phase.split(' · ')
    groups.set(cycle,[...(groups.get(cycle)??[]),stage])
  }
  expect(groups.size).toBe(4-n)
  const lengths=[...groups.values()].map(stages=>{
    expect(stages.slice(0,3)).toEqual(Array(3).fill('On-ramp'))
    expect(stages.slice(-3)).toEqual(Array(3).fill('Off-ramp'))
    return stages.filter(s=>s==='Strength').length
  })
  expect(Math.max(...lengths)-Math.min(...lengths)).toBeLessThanOrEqual(1)
})
test('season boundaries and gaps between teams stay at maintenance',()=>{
  for(const date of ['2027-05-31','2027-06-04','2027-06-08','2027-08-25','2027-10-31']){
    expect(liftingCalendar(schedule,Date.parse(date)).maintenance).toBe(true)
  }
})

test('an October finish and February team start reserve exactly 21 days at each end', () => {
  const seasons = schedule.map(s=>s.name==='spring'?{...s,start:'2027-02-01'}:s)
  const phaseOn = (date:string)=>liftingCalendar(seasons,Date.parse(date)).phase
  expect(phaseOn('2027-10-31')).toBe('Strength maintenance')
  expect(phaseOn('2027-11-01')).toContain('On-ramp')
  expect(phaseOn('2027-11-21')).toContain('On-ramp')
  expect(phaseOn('2027-11-22')).toContain('Strength')
  expect(phaseOn('2028-01-10')).toContain('Strength')
  expect(phaseOn('2028-01-11')).toContain('Off-ramp')
  expect(phaseOn('2028-01-31')).toContain('Off-ramp')
  expect(phaseOn('2028-02-01')).toBe('Strength maintenance')
})
