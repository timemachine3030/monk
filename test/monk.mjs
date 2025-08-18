
import test from "ava"
import monk from "../lib/monk.mjs"
import Collection from "../lib/collection.mjs"
import { Manager } from "../lib/manager.mjs"
import { MongoMemoryServer } from "mongodb-memory-server"

let mongoServer, uri
test.before(async () => {
  mongoServer = await MongoMemoryServer.create()
  uri = mongoServer.getUri()
})
test.after.always(async () => {
  if (mongoServer) await mongoServer.stop()
})

test("Manager", (t) => {
  t.is(typeof monk, "function")
})

test("Collection", (t) => {
  t.is(typeof Collection, "function")
  t.is(Collection.name, "Collection")
})

test("Should throw if no uri provided", (t) => {
  const e = t.throws(() => {
    monk()
  })
  t.is(e.message, "No connection URI provided.")

})

// TODO: untestable
// test("Should handle srv connection string", (t) => {
//   const m = monk("mongodb+srv://user:pw@foo.local.localhost/monk-test");
//   t.true(
//     m._connectionURI === "mongodb+srv://user:pw@efoo.local.localhost/monk-test"
//   );
//   return m.close(true);
// });

test("connect with promise", (t) => {
  const db = monk(uri)
  t.true(db instanceof Manager)
  return db.close(true)
})

test("executeWhenOpened > should reopen the connection if closed", async (t) => {
  const db = monk(uri)
  t.is(db._state, "opening")
  await db.close(true)
  t.is(db._state, "closed")
  await db.executeWhenOpened()
  t.is(db._state, "open")
  return db.close()
})

test("close > closing a closed connection should work", async (t) => {
  const db = monk(uri)
  await new Promise((resolve) => {
    db.on("open", resolve)
  })
  t.is(db._state, "open")
  await db.close()
  t.is(db._state, "closed")
  await db.close()
})

test("close > closing an opening connection should close it once opened", async (t) => {
  const db = monk(uri)
  await db.close()
  return t.pass()
})
