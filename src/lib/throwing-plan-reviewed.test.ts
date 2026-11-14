import { buildEightWeekThrowingPlan } from './throwing-plan'
import { figure8Drill, janitorDrill } from './reviewed-drill-matches'

const catalog = [
  {name:figure8Drill, category:'arm_timing', description:'Trace a figure eight before flowing into the rocker.', sets:null, reps:null},
  {name:janitorDrill, category:'trunk_rotation', description:'Use the cross-step setup.', sets:null, reps:null},
  {name:'Pivot Throw', category:'arm_timing', description:'Start in a pivot stance.'},
]
const category = {category:'Upper-Half Timing', score:2}

test('generic category lookup never selects a precise reviewed drill first or as an alternate', () => {
  const plan = buildEightWeekThrowingPlan([category], [], catalog)
  expect(JSON.stringify(plan)).toContain('Pivot Throw')
  expect(JSON.stringify(plan)).not.toMatch(/Figure 8 Rhythm Rocker|Janitor Throws/)
})

test('a signed task uses the selected drill across the plan within existing workload and never invents a dose', () => {
  const task = figure8Drill + '. Trace a figure eight before flowing into the rocker. Compare the timing at landing.'
  const plan = buildEightWeekThrowingPlan([{...category,development:task}], [task], catalog, undefined, [{task, drillName:figure8Drill}])
  expect(plan[0].days[0].work).toContain(figure8Drill)
  expect(plan[0].days[3].work).toContain(figure8Drill)
  expect(JSON.stringify(plan)).not.toMatch(/3 sets|6–10|6 reps|2 drill sessions|Pivot Throw|Janitor Throws/)
  expect(plan[0].prescription).toMatch(/scheduled/)
})
