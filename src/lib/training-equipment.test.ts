import { adaptExercise, equipmentSchema, type TrainingEquipment } from './training-equipment'
import { buildEightWeekThrowingPlan } from './throwing-plan'
import { buildBaseballPerformancePlan } from './performance-plan'

const home: TrainingEquipment = {tripod:true, gym:false, bands:false, plyos:false, gear:[]}
const lower = [{category:'Lower-Half Sequencing',score:1}]
test('tripod and explicit optional-equipment answers are required', () => {
  expect(equipmentSchema.safeParse(home).success).toBe(true)
  for (const change of [{tripod:false},{plyos:undefined},{bands:undefined},{gym:undefined}]) {
    expect(equipmentSchema.safeParse({...home,...change}).success).toBe(false)
  }
})
test('gym access does not imply a trap bar', () => {
  const equipment: TrainingEquipment = {...home, gym:true, gear:['dumbbells','kettlebell']}
  const day = buildBaseballPerformancePlan(lower, [], equipment)[0].days[0].work
  expect(day).toContain('Dumbbell Romanian deadlift or Kettlebell deadlift')
  expect(day).not.toContain('Trap-bar')
  expect(adaptExercise('Trap-bar deadlift',{...equipment,gear:['trapBar']})).toContain('Trap-bar deadlift or Bodyweight')
})
test('no gear produces two bodyweight hinge options in the full calendar', () => {
  const weeks = buildBaseballPerformancePlan(lower, [], home)
  for (const week of weeks) {
    expect(week.days[0].work).toContain('Bodyweight kickstand hip hinge or Glute bridge')
    expect(week.correlations[0].lift_emphasis).not.toContain('Trap-bar')
  }
})
test('throwing choices follow the athlete’s gear and include a dry alternative', () => {
  const drills = ['Plyo ball drill','Band drill','Step-behind'].map(name => ({name,category:'lower_half_sequencing',description:'Move toward the target.'}))
  const work = (e: TrainingEquipment) => buildEightWeekThrowingPlan(lower, [], drills, e)[0].days[0].work
  expect(work(home)).toMatch(/Step-behind.*Equipment-free option/)
  expect(work({...home,bands:true})).toContain('Band drill')
  expect(work({...home,plyos:true})).toContain('Plyo ball drill')
})

test('offseason repeats three lifts, builds weekly effort, then tapers toward opening day', () => {
  const weeks = buildBaseballPerformancePlan(lower, [], {...home, season:'offseason', firstGame:'2027-03-01'}, '2027-01-04')
  const lifts = weeks.map(week => week.days.filter(day => day.focus.startsWith('Lift ')))
  for (const days of lifts) expect(days.map(day => day.focus)).toEqual(lifts[0].map(day => day.focus))
  expect(lifts[0]).toHaveLength(3)
  expect(lifts[0].map(lift => lift.day)).toEqual(['Monday','Wednesday','Friday'])
  const throwingDays = buildEightWeekThrowingPlan(lower, [], [], home)[0].days
  for (const lift of lifts.flat()) {
    expect(lift.work.match(/^[ABC][12] ·/gm)).toEqual(['A1 ·','A2 ·','B1 ·','B2 ·','C1 ·','C2 ·'])
    expect(throwingDays.find(day => day.day === lift.day)?.focus).toMatch(/drill work|Recovery and video review|bullpen/i)
  }
  expect(lifts.map(days => Number(days[0].work.match(/RPE ([\d.]+)/)?.[1]))).toEqual([6,7,8,9,9,9,6,5])
  expect(lifts[7][0].work).toContain('2 × 5')
  expect(weeks[7].phase).toBe('Preseason taper')
})

test('a season opener inside the block switches the remaining weeks to two maintenance lifts', () => {
  const weeks = buildBaseballPerformancePlan(lower, [], {...home, season:'offseason', firstGame:'2027-01-18'}, '2027-01-04')
  expect(weeks[0].phase).toBe('Preseason taper')
  expect(weeks[2].phase).toBe('Strength maintenance')
  expect(weeks[2].days.filter(day => day.focus.startsWith('Lift '))).toHaveLength(2)
})

test('a later calendar window continues the offseason cycle using the intake start date', () => {
  const equipment = {...home, season:'offseason' as const, offseasonStart:'2027-01-04', firstGame:'2027-05-03'}
  const first = buildBaseballPerformancePlan(lower, [], equipment, '2027-01-04')
  const later = buildBaseballPerformancePlan(lower, [], equipment, '2027-02-15')
  expect(later[0].phase).toBe('Offseason deload')
  expect(later[1].days[0]).toEqual(first[7].days[0])
})

test('Monday pairs trap bar and bench when available, and preserves the press without a bench', () => {
  const monday = (gear: TrainingEquipment['gear']) => buildBaseballPerformancePlan(lower, [], {...home,gear})[0].days[0].work
  expect(monday(['trapBar','bench','dumbbells'])).toMatch(/B1 · .*Trap-bar deadlift.*\nB2 · .*Dumbbell bench press/)
  expect(monday(['dumbbells'])).toMatch(/B2 · Choose one \(Single-arm dumbbell floor press/)
  expect(monday([])).toMatch(/B2 · Choose one \(Kneeling push-up/)
})
