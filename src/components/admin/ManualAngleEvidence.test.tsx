/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { measuredAngle, sourcePanel, ManualAngleEvidence } from './ManualAngleEvidence'

describe('manual angle evidence', () => {
  it('uses the selected timestamp and removes captions from each source panel', () => {
    const frame = { key: 'delivery_overview', label: 'Delivery', sampleTimes: [1,2,3,4,5], columns: 4 }
    expect(sourcePanel(frame, 4, 2560, 784)).toEqual({ x: 0, y: 392, width: 640, height: 360, time: 5 })
    expect(sourcePanel({ key: 'finish', label: 'Finish', time: 2.8 }, 0, 1280, 720)).toEqual({ x: 0, y: 0, width: 1280, height: 720, time: 2.8 })
  })
  it('measures the angle at the middle point and rejects a zero-length segment', () => {
    const joint = {x: 20, y: 30}
    expect(measuredAngle([{x:10,y:30},joint,{x:30,y:20}])).toBe(135)
    expect(measuredAngle([joint,joint,{x:30,y:20}])).toBeNull()
  })
})

it('attaches a corrected measurement from the selected panel at display scale', async () => {
  const realImage = global.Image
  const load = jest.fn().mockImplementation(() => ({
    naturalWidth: 1280, naturalHeight: 392,
    set src(_url: string) { Promise.resolve().then(() => this.onload()) },
    onload: () => {},
  }))
  global.Image = load
  try {
    const attach = jest.fn()
    render(<ManualAngleEvidence frames={[{ key:'ball_release', label:'Release', url:'/br.png', sampleTimes:[2.85,2.88] }]} onAttach={attach}/>)
    fireEvent.click(screen.getByText('Measure an angle on footage'))
    fireEvent.change(screen.getByLabelText('Sample time'), {target:{value:'1'}})
    const canvas = await screen.findByLabelText('Mark lead knee on source image')
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({left:0, top:0, width:320, height:180} as DOMRect)
    for (const [x,y] of [[80,80], [160,80], [160,120]]) fireEvent.click(canvas, {clientX:x, clientY:y})
    expect(screen.getByText('90° inside angle')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name:'Lead ankle'}))
    fireEvent.click(canvas, {clientX:200, clientY:120})
    fireEvent.click(screen.getByText('Attach measurement'))
    expect(attach).toHaveBeenCalledWith('ball_release', expect.stringContaining('2.880 s in Release: approximately 135°'))
    expect(attach.mock.calls[0][1]).toContain('(160, 160) → (320, 160) → (400, 240)')
  } finally {global.Image = realImage}
})
