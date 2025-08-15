const assert = require('assert').strict
const monk = require('../../dist/monk.cjs').default
const { id } = require('../../dist/monk.cjs')
const { MongoMemoryServer } = require('mongodb-memory-server')

;(async () => {
  assert.strictEqual(
    typeof monk,
    'function',
    'CJS entry should export a function'
  )
  const memServer = new MongoMemoryServer()
  await memServer.start()
  const db = monk(memServer.getUri())
  assert.ok(db, 'Should be able to create a db instance from CJS entry')
  await db.close()
  await memServer.stop()

  const oid = id()
  assert.ok(oid, 'Should be able to generate an ObjectId from CJS entry')
  assert.equal(oid.equals(id(oid.toHexString())), true, 'ObjectId should be equal')
  console.log('CJS entrypoint test passed')
})()
