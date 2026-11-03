/** @jest-environment jsdom */
import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { VideoRecorder } from './VideoRecorder'

class Recorder {
  static isTypeSupported = () => true
  state = 'inactive'
  mimeType = 'video/mp4'
  onstop: (() => void) | null = null
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onerror = null
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['video'], { type: this.mimeType }) }); this.onstop?.() }
}
let stop: jest.Mock
let getUserMedia: jest.Mock
beforeEach(() => {
  stop = jest.fn()
  getUserMedia = jest.fn().mockResolvedValue({ getTracks: () => [{ stop }], getVideoTracks: () => [{ getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }) }] })
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: Recorder })
  HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)
  URL.createObjectURL = jest.fn().mockReturnValue('blob:test')
  URL.revokeObjectURL = jest.fn()
})
test('asks for video only after opening and hands off only after review', async () => {
  const use = jest.fn()
  render(<VideoRecorder purpose="your delivery" onUse={use} />)
  expect(getUserMedia).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Open camera'))
  await screen.findByText('Start recording')
  expect(getUserMedia.mock.calls[0][0].audio).toBe(false)
  fireEvent.click(screen.getByText('Start recording'))
  fireEvent.click(screen.getByText('Stop recording'))
  expect(stop).toHaveBeenCalled()
  expect(use).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Use recording'))
  await waitFor(() => expect(use).toHaveBeenCalled())
  expect(use.mock.calls[0][0]).toBeInstanceOf(File)
  expect(use.mock.calls[0][1]).toEqual({ normalSpeed: true, cameraFps: 30 })
})
test('camera denial leaves upload fallback available', async () => {
  getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
  render(<VideoRecorder purpose="your delivery" onUse={jest.fn()} />)
  fireEvent.click(screen.getByText('Open camera'))
  expect((await screen.findByRole('alert')).textContent).toContain('permission was denied')
  expect(screen.getByText('Use phone camera')).toBeTruthy()
})
test('pending permission result stops its tracks after unmount', async () => {
  let resolve!: (value: unknown) => void
  getUserMedia.mockReturnValue(new Promise(r => { resolve = r }))
  const view = render(<VideoRecorder purpose="your delivery" onUse={jest.fn()} />)
  fireEvent.click(screen.getByText('Open camera'))
  view.unmount()
  await act(async () => { resolve({ getTracks: () => [{ stop }] }) })
  expect(stop).toHaveBeenCalledTimes(1)
})
test('cancel discards the recording and releases camera without submitting', async () => {
  const use = jest.fn()
  render(<VideoRecorder purpose="your delivery" onUse={use} />)
  fireEvent.click(screen.getByText('Open camera'))
  await screen.findByText('Start recording')
  fireEvent.click(screen.getByText('Start recording'))
  fireEvent.click(screen.getByText('Cancel'))
  expect(stop).toHaveBeenCalled()
  expect(use).not.toHaveBeenCalled()
  expect(screen.getByText('Open camera')).toBeTruthy()
})
