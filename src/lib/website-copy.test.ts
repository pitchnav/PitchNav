import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const competitor = /\b(track[ -]?man|rapsodo|pitch[ -]?lab|driveline|tread athletics|pocket radar|stalker radar|smart[ -]?scout)\b/i

test('website copy uses Pitch Nav or generic baseball terms', () => {
  const violations: string[] = []
  function scan(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) { scan(path); continue }
      if (!path.endsWith('.tsx') || path.endsWith('.test.tsx')) continue
      const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      function visit(node: ts.Node) {
        if (ts.isJsxText(node) || ts.isStringLiteralLike(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
          // Lowercase source codes are persisted identifiers used by older records.
          const text = node.text.trim()
          const sourceCode = ['trackman', 'rapsodo', 'stalker', 'pocket_radar'].includes(text)
          if ((!sourceCode || ts.isJsxText(node)) && competitor.test(text)) {
            violations.push(path + ':' + (file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1))
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(file)
    }
  }
  scan(join(process.cwd(), 'src'))
  expect(violations).toEqual([])
})
