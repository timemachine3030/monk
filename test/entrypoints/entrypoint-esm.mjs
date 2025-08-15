import assert from 'node:assert/strict'
import monk from '../../dist/monk.mjs'
import { MongoMemoryServer } from 'mongodb-memory-server'

const mongoServer = await MongoMemoryServer.create()
const uri = mongoServer.getUri()
assert.strictEqual(typeof monk, 'function', 'ESM entry should export a function')
const db = monk(uri)
assert.ok(db, 'Should be able to create a db instance from ESM entry')
await db.close()
await mongoServer.stop()
console.log('ESM entrypoint test passed')
