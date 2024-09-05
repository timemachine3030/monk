import test from 'ava';
import monk from '../lib/monk.mjs';
import { Collection } from '../lib/collection.mjs';
let db;
test.before( () => {
  db = monk("127.0.0.1/monk-test");
});
test.after.always(() => {
  return db.close(true);
})


test('Manager#create', async (t) => {
  await db.get('users').drop()
  const col = db.create('users')
  t.true(col instanceof Collection)
  t.pass()
  return db.get('users').drop()
})

test("Manager#get", (t) => {
  t.true(db.get("users") instanceof Collection);
})

test("Manager#listCollections", async (t) => {
  const collections = await db.listCollections();
  return t.true(collections instanceof Array);
})

test("Manager#col", (t) => {
  t.true(db.col("users") instanceof Collection);
})

test("Manager#id", (t) => {
  const oid = db.id();
  t.is(typeof oid.toHexString(), "string");
})

test("Manager#oid", (t) => {
  const oid = db.oid();
  t.is(typeof oid.toHexString(), "string");
})

test("oid from hex string", (t) => {
  const oid = db.oid("4ee0fd75d6bd52107c000118");
  t.is(oid.toString(), "4ee0fd75d6bd52107c000118");
})

test("oid from oid", (t) => {
  const oid = db.oid();
  t.is(db.oid(oid), oid);
})


