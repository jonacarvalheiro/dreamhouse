import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { createServer } from 'vite'

const CHROME = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p))
if (!CHROME) throw new Error('Não encontrei o Chrome; indiquem o caminho em CHROME=...')

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { render, plantasPdf } = await vite.ssrLoadModule('/scripts/plantas.tsx')
const docs = plantasPdf.map((p) => ({ pdfPath: resolve('public', p.file), html: render({ flip: p.flip }) }))
await vite.close()

for (const { pdfPath, html } of docs) {
  mkdirSync(dirname(pdfPath), { recursive: true })
  const htmlPath = join(tmpdir(), basename(pdfPath, '.pdf') + '.html')
  writeFileSync(htmlPath, html)
  const started = Date.now()
  try {
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], { stdio: 'ignore' })
  } catch (err) {
    // o Chrome às vezes sai com erro ao fechar, depois de já ter escrito o PDF
    if (!existsSync(pdfPath) || statSync(pdfPath).mtimeMs < started) throw err
  }
  console.log(pdfPath)
}
