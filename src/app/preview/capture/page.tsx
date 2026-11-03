import { notFound } from 'next/navigation'
import { CapturePreview } from './CapturePreview'
export const dynamic = 'force-dynamic'
export default function Page() {
  if (process.env.ENABLE_DASHBOARD_PREVIEW !== 'true') notFound()
  return <CapturePreview />
}
