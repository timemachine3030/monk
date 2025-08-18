
import test from 'ava'
import monk from '../lib/monk.mjs'
import { Collection } from '../lib/collection.mjs'
import { MongoMemoryServer } from 'mongodb-memory-server'
let db, mongoServer
test.before(async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  db = monk(uri)
})
test.after.always(async () => {
  if (db?._state !== 'closed') {
    await db.close(true)
  }
  if (mongoServer) await mongoServer.stop()
})


test('Manager#create', async (t) => {
  const col = await db.create('users')
  t.true(col instanceof Collection)
})

test("Manager#get", (t) => {
  t.true(db.get("users") instanceof Collection)
})

test("Manager#listCollections", async (t) => {
  const collections = await db.listCollections()
  return t.true(collections instanceof Array)
})

test("Manager#col", (t) => {
  t.true(db.col("users") instanceof Collection)
})

test("Manager#id", (t) => {
  const oid = db.id()
  t.is(typeof oid.toHexString(), "string")
})

test("Manager#oid", (t) => {
  const oid = db.oid()
  t.is(typeof oid.toHexString(), "string")
})

test("oid from hex string", (t) => {
  const oid = db.oid("4ee0fd75d6bd52107c000118")
  t.is(oid.toString(), "4ee0fd75d6bd52107c000118")
})

test("oid from oid", (t) => {
  const oid = db.oid()
  t.is(db.oid(oid), oid)
})


