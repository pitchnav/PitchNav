'use client'

export function DeleteAnalysisButton({ deleteAnalysis }: { deleteAnalysis: (formData: FormData) => void }) {
  return (
    <button
      className="btn-secondary border-red-500/30 text-red-300"
      type="submit"
      formAction={deleteAnalysis}
      onClick={(event) => {
        if (!confirm('Delete this analysis? It will not count against the athlete’s two-week limit.')) event.preventDefault()
      }}
    >
      Delete mistaken analysis
    </button>
  )
}
