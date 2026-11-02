import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { createServer } from 'vite'

const { values } = parseArgs({
  options: {
    variant: { type: 'string', default: 'a' },
    only: { type: 'string', default: 'wc-lavatorio,wc-duche' },
    style: { type: 'string' },
    samples: { type: 'string', default: '24' },
    width: { type: 'string', default: '1280' },
    blend: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
})

const INSTALL = 'brew install --cask blender'
const BLENDER = [process.env.BLENDER, '/Applications/Blender.app/Contents/MacOS/Blender', '/usr/local/bin/blender', '/opt/homebrew/bin/blender', '/usr/bin/blender'].find(
  (p) => p && existsSync(p),
)

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { buildScene } = await vite.ssrLoadModule('/scripts/render/scene.ts')
const { views } = await vite.ssrLoadModule('/scripts/render/views.ts')
const scene = buildScene(values.variant)
await vite.close()

const dir = resolve('render')
mkdirSync(dir, { recursive: true })
const scenePath = resolve(dir, `scene-${values.variant}.json`)
const viewsPath = resolve(dir, 'views.json')
writeFileSync(scenePath, JSON.stringify(scene))
writeFileSync(viewsPath, JSON.stringify(views, null, 2))
console.log(`Cena: ${scenePath}  (${scene.boxes.length} caixas, ${scene.glass.length} vidros)`)
console.log(`Vistas: ${viewsPath}  (${views.filter((v) => v.variant === values.variant).length} da proposta ${values.variant})`)

if (values['dry-run']) {
  console.log('Dry-run: JSON exportado, sem Blender.')
  process.exit(0)
}

if (!BLENDER) {
  console.log(`Não encontrei o Blender. Para instalar: ${INSTALL}`)
  console.log('Ou indiquem o binário: BLENDER=/caminho/blender npm run render')
  console.log('O JSON já está escrito; o pipeline fica pronto para quando o Blender existir.')
  process.exit(0)
}

console.log(`Blender: ${BLENDER}`)
const only = values.only === 'all' ? undefined : values.only
const args = ['-b', '-P', 'scripts/render/blender_render.py', '--', '--scene', scenePath, '--views', viewsPath, '--out', resolve(dir, 'out'), '--samples', values.samples, '--width', values.width]
if (only) args.push('--only', only)
if (values.style) args.push('--style', values.style)
if (values.blend) args.push('--save-blend')
const r = spawnSync(BLENDER, args, { stdio: 'inherit' })
process.exit(r.status ?? 1)
