import 'server-only'
import { money, quoteProgram, PROGRAM_TIERS, type Billing, type ProgramPlan } from '@/lib/program-pricing'

export function ProgramQuote({ players, plan, billing }: { players: string; plan: ProgramPlan; billing: Billing }) {
  let quote: ReturnType<typeof quoteProgram> | null = null
  try { quote = quoteProgram(Number(players), plan, billing) } catch { /* Keep invalid input editable. */ }
  return <form method="get" action="/admin/program-pricing" className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">
      <label><span className="label">Program</span><select name="programPlan" className="input mt-1" defaultValue={plan}><option value="metrics">Pitch Tracking</option><option value="complete">Complete Development</option></select></label>
      <label><span className="label">Players</span><input name="pitcherCount" className="input mt-1" type="number" min={1} max={500} step={1} required defaultValue={players} /></label>
      <label><span className="label">Billing</span><select name="billing" className="input mt-1" defaultValue={billing}><option value="monthly">Monthly</option><option value="annual">Annual · best value (paid upfront)</option></select></label>
    </div>
    <button className="btn-primary" type="submit">Calculate program quote</button>
    {!quote ? <p role="alert" className="text-red-400">Enter a whole number of players from 1 to 500.</p> : <div aria-live="polite" className="rounded-xl border border-electric-blue/30 bg-electric-blue/5 p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div><p className="text-sm text-slate-300">Estimated signup total</p><p className="mt-1 text-3xl font-black text-white tabular-nums">{money(quote.dueNow)}</p></div>
        <div><p className="text-sm text-slate-300">{billing === 'annual' ? 'Annual renewal' : 'Monthly from month 2'}</p><p className="mt-1 text-3xl font-black text-white tabular-nums">{money(quote.recurring)}</p></div>
      </div>
      <dl className="mt-5 space-y-2 text-sm text-slate-300">
        {[[billing === 'annual' ? 'Annual subscription' : 'Discounted first month', quote.subscription], ['One-time assessments',quote.assessment], ['First-year total including assessments',quote.firstYear], ['Annual savings vs. monthly introductory pricing',quote.annualSavings]].map(([label,value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-semibold tabular-nums">{money(Number(value))}</dd></div>)}
      </dl>
    </div>}
    <details className="text-sm text-slate-300"><summary className="cursor-pointer font-semibold">Per-player rates and how discounts work</summary>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Graduated per-player USD prices for {plan}</caption><thead><tr>{['Player positions','First month','Then monthly','Annual'].map(x=><th className="p-2" key={x} scope="col">{x}</th>)}</tr></thead><tbody>{PROGRAM_TIERS.map(t=><tr key={t.label} className="border-t border-surface-border"><th scope="row" className="p-2 font-normal">{t.label}</th><td className="p-2">{money(t[plan].monthly-500)}</td><td className="p-2">{money(t[plan].monthly)}</td><td className="p-2">{money(t[plan].annual)}</td></tr>)}</tbody></table></div>
      <p className="mt-3">Discounts apply to additional players in each band. The first nine keep their rate; players 10–24 receive the next rate. Complete adds $49.99 per newly assessed athlete, once. This quote assumes all players are new. Metrics-only has no assessment fee.</p>
    </details>
    <p className="text-xs text-slate-400">USD before tax. Annual subscriptions are paid upfront and do not combine with the first-month offer. Internal quote only. No payment is collected. Pitch Tracking is a beta in development.</p>
  </form>
}
