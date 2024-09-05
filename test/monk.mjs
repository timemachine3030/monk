import test from "ava"
import monk from "../lib/monk.mjs"
import Collection from "../lib/collection.mjs"
import { Manager } from "../lib/manager.mjs"

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
  const db = monk("127.0.0.1/monk-test")
  t.true(db instanceof Manager)
  return db.close(true)
})

test("executeWhenOpened > should reopen the connection if closed", async (t) => {
  const db = monk("127.0.0.1/monk")
  t.is(db._state, "opening")
  await db.close(true)
  t.is(db._state, "closed")
  await db.executeWhenOpened()
  t.is(db._state, "open")
  return db.close()
})

test("close > closing a closed connection should work", (t) => {
  const db = monk("127.0.0.1/monk")
  return db
    .then(() => t.is(db._state, "open"))
    .then(() => db.close())
    .then(() => t.is(db._state, "closed"))
    .then(() => db.close())
})

test("close > closing a closed connection should work with callback", async (t) => {
  const db = monk("127.0.0.1/monk")
  t.is(db._state, "opening")
  await db.close()
  t.is(db._state, "closed")
  return new Promise((resolve) => {
    db.close(() => {
      resolve()
    })
  })
})

test("close > closing an opening connection should close it once opened", async (t) => {
  const db = monk("127.0.0.1/monk")
  await db.close()
  return t.pass()
})


test("option useNewUrlParser should be true if not specified", async (t) => {
  const db = monk("127.0.0.1/monk-test")
  t.is(db._connectionOptions.useNewUrlParser, true)
  return db.close(true)
})


test("option useNewUrlParser should be true if specified", (t) => {
  return monk("127.0.0.1/monk-test", { useNewUrlParser: true }).then((db) => {
    t.is(db._connectionOptions.useNewUrlParser, true)
    db.close(true)
  })
})

test("option useNewUrlParser should have the specified value", (t) => {
  return monk("127.0.0.1/monk-test", { useNewUrlParser: false }).then((db) => {
    t.is(db._connectionOptions.useNewUrlParser, false)
    db.close(true)
  })
})

test("option useUnifiedTopology should be true if not specified", (t) => {
  return monk("127.0.0.1/monk-test").then((db) => {
    t.is(db._connectionOptions.useUnifiedTopology, true)
    db.close(true)
  })
})

test("option useUnifiedTopology should be true if specified", (t) => {
  return monk("127.0.0.1/monk-test", { useUnifiedTopology: true }).then(
    (db) => {
      t.is(db._connectionOptions.useUnifiedTopology, true)
      db.close(true)
    }
  )
})

test("option useUnifiedTopology should have the specified value", (t) => {
  return monk("127.0.0.1/monk-test", { useUnifiedTopology: false }).then(
    (db) => {
      t.is(db._connectionOptions.useUnifiedTopology, false)
      db.close(true)
    }
  )
})
