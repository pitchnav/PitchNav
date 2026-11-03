import { shoulderEstimates } from './pitch-replay'

function frontalPose(right: boolean) {
  const p=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:1}))
  for (const i of [11,23]) p[i].x=0.2
  for (const i of [12,24]) p[i].x=-0.2
  p[23].y=p[24].y=0.5
  const elbow=right?14:13
  const wrist=right?16:15
  p[elbow].x=p[wrist].x=right?-0.5:0.5
  p[wrist].z=-0.3
  return {p,wrist,elbow}
}
test.each([true,false])('neutral and upright forearm agree for either arm (%s)',right=>{
  const {p,wrist,elbow}=frontalPose(right)
  expect(Math.abs(shoulderEstimates(p,right).horizontal!)).toBe(0)
  expect(Math.abs(shoulderEstimates(p,right).rotation!)).toBe(0)
  p[wrist].z=0
  p[wrist].y=-0.3
  expect(shoulderEstimates(p,right).rotation).toBe(90)
  p[wrist].visibility=0.2
  expect(shoulderEstimates(p,right).rotation).toBeNull()
  p[elbow].z=0.3
  expect(shoulderEstimates(p,right).horizontal).toBe(45)
})
