// Publica no GitHub Pages o que está nesta pasta, incluindo o que ainda não está em commit, sem os ficheiros privados.
// Cada publicação é um commit novo no main do remote "github", assinado com o email privado do GitHub; não mexe nos
// branches locais. Uso: npm run publicar [-- "mensagem do commit"]
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'

/**
 * Fora do repositório público: o levantamento original da casa e os JSON onde o site local grava o que já se pagou
 * (no site publicado isso fica neste navegador). Compras e orçamentos vão para o site, atrás de um código.
 */
const PRIVATE = ['dados', 'uploads']
const REMOTE = 'github'
const BRANCH = 'main'

const run = (cmd, args, env = {}) => execFileSync(cmd, args, { encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const git = (args, env) => run('git', args, env)
const fail = (msg) => {
  console.error(msg)
  process.exit(1)
}

let url
try {
  url = git(['remote', 'get-url', REMOTE])
} catch {
  fail(`Falta o remote "${REMOTE}": git remote add ${REMOTE} https://github.com/<utilizador>/<repositório>.git`)
}
const repo = url.match(/github\.com[/:][^/]+\/(.+?)(?:\.git)?$/)?.[1]
if (!repo) fail(`O remote "${REMOTE}" não é do GitHub: ${url}`)

// a pasta de trabalho num índice à parte, para não tocar no índice nem nos commits locais
const index = path.resolve(git(['rev-parse', '--git-dir']), 'publicar-index')
const env = { GIT_INDEX_FILE: index }
let tree
try {
  git(['add', '-A', '.'], env)
  git(['rm', '-r', '--cached', '--quiet', '--ignore-unmatch', '--', ...PRIVATE], env)
  tree = git(['write-tree'], env)
} finally {
  rmSync(index, { force: true })
}

// o que é público não pode apontar para o levantamento
let leaks = ''
try {
  leaks = git(['grep', '-l', '-F', '-e', 'uploads/', tree, '--', 'src'])
} catch {
  // sem resultados
}
if (leaks) fail(`Estes ficheiros apontam para o levantamento (uploads/), que não vai para o repositório público:\n${leaks}`)

let parent = ''
try {
  git(['fetch', '--quiet', REMOTE, BRANCH])
  parent = git(['rev-parse', 'FETCH_HEAD'])
} catch {
  // repositório ainda vazio
}
if (parent && git(['rev-parse', `${parent}^{tree}`]) === tree) {
  console.log('Nada de novo para publicar.')
  process.exit(0)
}

const user = JSON.parse(run('gh', ['api', 'user']))
const name = user.name || user.login
const email = `${user.id}+${user.login}@users.noreply.github.com`
const message = process.argv.slice(2).join(' ') || `Publica a versão de ${new Date().toLocaleDateString('pt-PT')}.`
const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message], {
  GIT_AUTHOR_NAME: name,
  GIT_AUTHOR_EMAIL: email,
  GIT_COMMITTER_NAME: name,
  GIT_COMMITTER_EMAIL: email,
})
// sem um buffer grande, o git manda aos bocados os pushes de mais de 1 MB e o GitHub responde HTTP 400
git(['-c', 'http.postBuffer=524288000', 'push', '--quiet', REMOTE, `${commit}:refs/heads/${BRANCH}`])
console.log(`Enviado. O site atualiza em 1 a 2 minutos: https://${user.login.toLowerCase()}.github.io/${repo}/`)
