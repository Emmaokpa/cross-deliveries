import { spawn } from 'node:child_process'

const procs = []
function run(name, args, color) {
  const p = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
  const tag = `\x1b[${color}m[${name}]\x1b[0m`
  const forward = (buf) => String(buf).split('\n').filter(Boolean).forEach((l) => console.log(tag, l))
  p.stdout.on('data', forward)
  p.stderr.on('data', forward)
  p.on('exit', (code) => {
    console.log(tag, `exited with code ${code}`)
    if (code && code !== 0) process.exitCode = code
  })
  procs.push(p)
}

run('api', ['server/index.js'], '36')
run('web', ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], '35')

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    procs.forEach((p) => p.kill())
    process.exit(0)
  })
}
