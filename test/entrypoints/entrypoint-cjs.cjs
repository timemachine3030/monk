const assert = require('assert').strict
const monk = require('../../dist/monk.cjs').default
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
  console.log('CJS entrypoint test passed')
})()
