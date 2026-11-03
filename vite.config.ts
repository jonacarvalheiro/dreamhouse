import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'

/** Lê e grava `dados/<nome>.json` em /api/dados/<nome>: é aí que as páginas locais guardam o que se marca nelas. */
function dados(): Plugin {
  const dir = path.resolve(__dirname, 'dados')
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const name = req.url?.match(/^\/([a-z-]+)$/)?.[1]
    if (!name) return next()
    const file = path.join(dir, `${name}.json`)
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.end(fs.existsSync(file) ? fs.readFileSync(file) : 'null')
      return
    }
    if (req.method !== 'PUT') return next()
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(data, null, 2)}\n`)
        fs.renameSync(`${file}.tmp`, file)
        res.statusCode = 204
      } catch {
        res.statusCode = 400
      }
      res.end()
    })
  }
  return {
    name: 'dados',
    configureServer: (server) => void server.middlewares.use('/api/dados', handle),
    configurePreviewServer: (server) => void server.middlewares.use('/api/dados', handle),
  }
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), dados()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { allowedHosts: true, watch: { ignored: ['**/dados/**'] } },
  preview: { allowedHosts: true },
})
