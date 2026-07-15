import type { Metadata } from 'next'
import { MotionAnalysisStudio } from '@/components/analysis/MotionAnalysisStudio'

export const metadata: Metadata = {
  title: 'Motion Lab',
  description: 'Create an estimated skeleton overlay and coaching-oriented joint-angle visualization from pitching video.',
}

export default function MotionLabPage() {
  return <MotionAnalysisStudio />
}
