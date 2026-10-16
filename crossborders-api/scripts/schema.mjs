#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PocketBase schema toolbox — the source of truth is SCHEMAS in src/db.js.
//
//   npm run schema:export   write schema/collections.blueprint.json, a
//                           version-controlled blueprint of the core
//                           collections in PocketBase's native import format
//   npm run schema:push     create/update those collections on POCKETBASE_URL
//                           (idempotent — re-running is always safe; it never
//                           deletes collections, fields or records)
//   npm run schema:verify   read-only drift report: server schema vs code
//
// push/verify need the same env as the API:
//   POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD
// (loaded from .env automatically when run through the npm scripts).
//
// The blueprint can also be imported by hand: PocketBase Admin UI →
// Settings → Import collections → paste the JSON file. For an existing
// instance prefer `npm run schema:push`, which attaches the existing
// collection ids so PocketBase updates in place instead of colliding.
// ---------------------------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCHEMAS, ensureAuth, pb } from '../src/db.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const BLUEPRINT_REL = 'schema/collections.blueprint.json'
const BLUEPRINT_PATH = path.join(ROOT, BLUEPRINT_REL)

const RULE_KEYS = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']

const USAGE = `Usage:
  npm run schema:export    write ${BLUEPRINT_REL}
  npm run schema:push      import the schema into PocketBase (idempotent)
  npm run schema:verify    compare the live schema with the code`

// ---------------------------------------------------------------- blueprint

/** Fresh copy of the code-defined collection schemas, in stable order. */
function blueprintCollections() {
  return Object.values(SCHEMAS).map((schema) => structuredClone(schema))
}

function writeBlueprint() {
  const collections = blueprintCollections()
  fs.mkdirSync(path.dirname(BLUEPRINT_PATH), { recursive: true })
  fs.writeFileSync(BLUEPRINT_PATH, `${JSON.stringify(collections, null, 2)}\n`)
  return collections
}

function blueprintOnDisk() {
  try {
    return JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8'))
  } catch {
    return null
  }
}

// ------------------------------------------------------------------- push

async function push() {
  // Refresh the file from the code first, so what we import is exactly what
  // a teammate would get from the committed blueprint.
  const onDisk = blueprintOnDisk()
  const collections = writeBlueprint()
  if (onDisk && JSON.stringify(onDisk) !== JSON.stringify(collections)) {
    console.log(`[schema] ${BLUEPRINT_REL} was stale — regenerated from src/db.js`)
  }

  await ensureAuth({ force: true })

  // Match existing collections by name and pass their ids along: with an id
  // PocketBase UPDATES the collection in place; without one it would try to
  // create it and collide on the name.
  const existing = await pb.collections.getFullList({ sort: 'name' })
  const byName = new Map(existing.map((collection) => [collection.name, collection]))

  const payload = collections.map((collection) => {
    const match = byName.get(collection.name)
    return match ? { ...collection, id: match.id } : collection
  })
  const toCreate = collections.filter((c) => !byName.has(c.name)).map((c) => c.name)
  const toUpdate = collections.filter((c) => byName.has(c.name)).map((c) => c.name)

  // deleteMissing=false: create/update only — never drops collections,
  // fields or records that aren't part of our schema.
  await pb.collections.import(payload, false)

  console.log(`[schema] PocketBase: ${pb.baseUrl}`)
  for (const name of toCreate) console.log(`[schema] created collection "${name}"`)
  for (const name of toUpdate) console.log(`[schema] updated collection "${name}" (fields synced)`)
  if (!toCreate.length && !toUpdate.length) console.log('[schema] nothing to do')
  console.log('[schema] done — re-running is always safe')
}

// ----------------------------------------------------------------- verify

function fieldSummary(fields) {
  return fields.map((f) => `${f.name}:${f.type}`).join(', ')
}

async function verify() {
  await ensureAuth({ force: true })
  const existing = await pb.collections.getFullList({ sort: 'name' })
  const byName = new Map(existing.map((collection) => [collection.name, collection]))
  let problems = 0

  console.log(`[schema] PocketBase: ${pb.baseUrl}`)
  for (const schema of Object.values(SCHEMAS)) {
    const server = byName.get(schema.name)
    if (!server) {
      problems += 1
      console.log(`[schema] MISSING  "${schema.name}" — run: npm run schema:push`)
      continue
    }

    const serverFields = new Map((server.fields || []).map((f) => [f.name, f]))
    const missing = schema.fields.filter((f) => !serverFields.has(f.name))
    const typeMismatch = schema.fields.filter(
      (f) => serverFields.has(f.name) && serverFields.get(f.name).type !== f.type,
    )
    const ruleProblems = RULE_KEYS.filter((key) => (server[key] ?? null) !== (schema[key] ?? null))

    if (!missing.length && !typeMismatch.length && !ruleProblems.length) {
      const indexed = (server.indexes || []).length
      console.log(`[schema] OK       "${schema.name}" (${schema.fields.length} fields, ${indexed} indexes)`)
      continue
    }

    problems += 1
    console.log(`[schema] DRIFT    "${schema.name}"`)
    if (missing.length) console.log(`           missing fields: ${fieldSummary(missing)}`)
    for (const f of typeMismatch) {
      console.log(`           type mismatch: ${f.name} code=${f.type} server=${serverFields.get(f.name).type}`)
    }
    if (ruleProblems.length) console.log(`           rules differ: ${ruleProblems.join(', ')}`)
    console.log('           fix with: npm run schema:push')
  }

  for (const collection of existing) {
    if (collection.system || SCHEMAS[collection.name]) continue
    console.log(`[schema] INFO     "${collection.name}" exists on the server but is not in the code schema`)
  }

  if (problems) {
    console.log(`[schema] ${problems} problem(s) found`)
    process.exitCode = 1
  } else {
    console.log('[schema] server schema matches the code')
  }
}

// ------------------------------------------------------------------- main

async function main() {
  const command = (process.argv[2] || '').toLowerCase()
  if (command === 'export') {
    writeBlueprint()
    console.log(`[schema] wrote ${BLUEPRINT_REL} (${Object.keys(SCHEMAS).length} collections)`)
    console.log('[schema] import by hand: PocketBase Admin UI → Settings → Import collections')
    return
  }
  if (command === 'push') return push()
  if (command === 'verify') return verify()
  console.log(USAGE)
  process.exitCode = 1
}

main().catch((err) => {
  console.error(`[schema] ${err.message || err}`)
  console.error('[schema] push/verify need POCKETBASE_URL + POCKETBASE_ADMIN_EMAIL/PASSWORD (run via the npm scripts to load .env)')
  process.exitCode = 1
})
