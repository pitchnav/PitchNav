// Torso-relative pose estimates. World landmarks are inferred by the single-camera
// model. These angles are experimental proxies, not clinical joint coordinates.
type Point = { x: number; y: number; z: number; visibility?: number }
const sub = (a: Point, b: Point) => ({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z})
const dot = (a: Point,b: Point) => a.x*b.x+a.y*b.y+a.z*b.z
const scale = (a: Point,n: number) => ({x:a.x*n,y:a.y*n,z:a.z*n})
const cross = (a: Point,b: Point) => ({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x})
function unit(v: Point) {
  const length = Math.sqrt(dot(v,v))
  return length > 0.001 ? scale(v,1/length) : null
}
const reject = (v: Point,axis: Point) => sub(v,scale(axis,dot(v,axis)))
const deg = (y:number,x:number) => Math.round(Math.atan2(y,x)*180/Math.PI)

export function shoulderEstimates(points: Point[], right: boolean) {
  const empty = { horizontal:null, rotation:null } as {horizontal:number|null; rotation:number|null}
  const [s,e,w] = right ? [12,14,16] : [11,13,15]
  if (![11,12,23,24,e].every(i=>points[i] && (points[i].visibility ?? 0)>=0.75)) return empty
  const across=unit(sub(points[12],points[11]))
  const upper=unit(sub(points[e],points[s]))
  if (!across || !upper) return empty
  const leftSide=sub(points[11],points[23])
  const rightSide=sub(points[12],points[24])
  const torso={x:leftSide.x+rightSide.x,y:leftSide.y+rightSide.y,z:leftSide.z+rightSide.z}
  const up=unit(reject(torso,across))
  if (!up) return empty
  // Superior cross anatomical right points anterior in MediaPipe world axes.
  const forward=cross(up,across)
  const lateral=scale(across,right?1:-1)
  const horizontal=Math.hypot(dot(upper,lateral),dot(upper,forward))>0.5
    ? deg(-dot(upper,forward),dot(upper,lateral)) : null
  const result = {horizontal, rotation:null as number|null}
  if (!points[w] || (points[w].visibility ?? 0)<0.75 || Math.abs(dot(upper,up))>0.5) return result
  const forearm=unit(sub(points[w],points[e]))
  if (!forearm || Math.abs(dot(upper,forearm))>0.55) return result
  const vertical=unit(reject(up,upper))
  if (!vertical) return result
  const anterior=scale(cross(vertical,upper),right?1:-1)
  result.rotation=deg(dot(forearm,vertical),dot(forearm,anterior))
  return result
}
