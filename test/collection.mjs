import test from 'ava'
import monk from '../lib/monk.mjs'
import monkMiddlewareDebug from 'monk-middleware-debug'
import mongo from 'mongodb'

let db, users, indexCol
test.before(() => {
  db = monk("127.0.0.1:27017/monk")
  db.addMiddleware(monkMiddlewareDebug)
  users = db.get("users-" + Date.now())
  indexCol = db.get("index-" + Date.now())
})

test.after.always(async () => {
  await indexCol.drop()
  await users.drop()
  return db.close(true)

})

test('createIndex > should accept a field string', (t) => {
  return indexCol.createIndex('name.first').then(() => indexCol.indexes()).then((indexes) => {
    return t.not(indexes['name.first_1'], undefined)
  })
})

test('createIndex > should accept an object argument', (t) => {
  return indexCol.createIndex({location: '2dsphere'}).then(() => indexCol.indexes()).then((indexes) => {
    return t.not(indexes.location_2dsphere, undefined)
  })
})

test('createIndex > should accept space-delimited compound indexes', (t) => {
  return indexCol.createIndex('name last').then(() => indexCol.indexes()).then((indexes) => {
    return t.not(indexes.name_1_last_1, undefined)
  })
})

test('createIndex > should accept array compound indexes', (t) => {
  return indexCol.createIndex(['nombre', 'apellido']).then(() => indexCol.indexes()).then((indexes) => {
    return t.not(indexes.nombre_1_apellido_1, undefined)
  })
})

test('createIndex > should accept object compound indexes', (t) => {
  return indexCol.createIndex({ up: 1, down: -1 }).then(() => indexCol.indexes()).then((indexes) => {
    return t.not(indexes['up_1_down_-1'], undefined)
  })
})

test('createIndex > should accept options', (t) => {
  return indexCol.createIndex({ woot: 1 }, { unique: true }).then(() => indexCol.indexes()).then((indexes) => {
    return t.not(indexes.woot_1, undefined)
  })
})

test('createIndex > async', async (t) => {
  await indexCol.createIndex('name.third')
  t.pass()
})

test('index > should accept a field string', (t) => {
  return indexCol.index('name.first').then(() => indexCol.indexes()).then((indexes) => {
    return t.not(indexes['name.first_1'], undefined)
  })
})

test.serial('dropIndex > should accept a field string', (t) => {
  return indexCol.index('name2.first').then(() => indexCol.indexes()).then((indexes) => {
    t.not(indexes['name2.first_1'], undefined)
  }).then(() => indexCol.dropIndex('name2.first'))
    .then(() => indexCol.indexes()).then((indexes) => {
      return t.is(indexes['name2.first_1'], undefined)
    })
})

test.serial('dropIndex > should accept space-delimited compound indexes', (t) => {
  return indexCol.index('name2 last').then(() => indexCol.indexes()).then((indexes) => {
    t.not(indexes.name2_1_last_1, undefined)
  }).then(() => indexCol.dropIndex('name2 last'))
    .then(() => indexCol.indexes()).then((indexes) => {
      return t.is(indexes.name2_1_last_1, undefined)
    })
})

test.serial('dropIndex > should accept array compound indexes', (t) => {
  return indexCol.index(['nombre2', 'apellido']).then(() => indexCol.indexes()).then((indexes) => {
    t.not(indexes.nombre2_1_apellido_1, undefined)
  }).then(() => indexCol.dropIndex(['nombre2', 'apellido']))
    .then(() => indexCol.indexes()).then((indexes) => {
      return t.is(indexes.nombre2_1_apellido_1, undefined)
    })
})

test.serial('dropIndex > should accept object compound indexes', (t) => {
  return indexCol.index({ up2: 1, down: -1 }).then(() => indexCol.indexes()).then((indexes) => {
    t.not(indexes['up2_1_down_-1'], undefined)
  }).then(() => indexCol.dropIndex({ up2: 1, down: -1 }))
    .then(() => indexCol.indexes()).then((indexes) => {
      return t.is(indexes['up2_1_down_'], undefined)
    })
})

test.serial('dropIndex > await', async (t) => {
  const name = await indexCol.index('name3.first')
  const indexes = await indexCol.indexes()

  t.not(indexes[name], undefined)
  const drop = indexCol.dropIndex('name3.first')
  await t.notThrowsAsync(drop)
})

test('dropIndexes > should drop all indexes', (t) => {
  const col = db.get('indexDrop-' + Date.now())
  return col.index({ up2: 1, down: -1 })
    .then(() => col.indexes())
    .then((indexes) => {
      return t.not(indexes['up2_1_down_-1'], undefined)
    }).then(() => col.dropIndexes())
    .then(() => col.indexes())
    .then((indexes) => {
      return t.is(indexes['up2_1_down_'], undefined)
    })
})

test.serial('dropIndexes > await', async (t) => {
  const col = db.get('indexDropCallback-' + Date.now())
  const result = await col.index({ up2: 1, down: -1 })
  const indexes = await col.indexes()
  t.not(indexes[result], undefined)

  const drop = col.dropIndexes()
  await t.notThrowsAsync(drop)
})

test('insert > should force callback in next tick', (t) => {
  return users.insert({ woot: 'a' }).then(() => t.pass())
})

test('insert > should give you an object with the _id', (t) => {
  return users.insert({ woot: 'b' }).then((obj) => {
    t.is(typeof obj._id, 'object')
    return t.not(obj._id.toHexString, undefined)
  })
})

test('insert > should return an array if an array was inserted', async (t) => {
  const insertResults = await users.insert([{ woot: 'c' }, { woot: 'd' }]).then((docs) => {
    t.true(Array.isArray(docs))
    t.is(docs.length, 2)
    return docs
  })
  const findResults = await users.find({ woot: { $in: ['c', 'd'] } }).then((docs) => {
    t.is(docs.length, 2)
    return docs
  })
  t.is(insertResults[0]._id.toString(), findResults[0]._id.toString())
  t.is(insertResults[1]._id.toString(), findResults[1]._id.toString())
})

test('insert > should not fail when inserting an empty array', (t) => {
  return users.insert([]).then((docs) => {
    t.true(Array.isArray(docs))
    return t.is(docs.length, 0)
  })
})

test('insert > await', async (t) => {
  const result = await users.insert({ woot: 'a' })
  t.is(result.woot, 'a')
})

test('findOne > should return null if no document', (t) => {
  return users.findOne({nonExistingField: true})
    .then((doc) => {
      return t.is(doc, null)
    })
})

test('findOne > findOne(undefined) should work', (t) => {
  return users.insert({ a: 'b', c: 'd', e: 'f' }).then((doc) => {
    return users.findOne()
  }).then(() => {
    return t.pass()
  })
})

test.serial('findOne > should only provide selected fields', (t) => {
  return users.insert({ a: 'b', c: 'd', e: 'f' }).then((doc) => {
    return users.findOne(doc._id, 'a e')
  }).then((doc) => {
    t.is(doc.a, 'b')
    t.is(doc.e, 'f')
    return t.is(doc.c, undefined)
  })
})

test.serial('findOne > should remove negated fields', (t) => {
  return users.insert({ a: 'b', c: 'd', e: 'f' }).then((doc) => {
    return users.findOne(doc._id, '-a -e')
  }).then((doc) => {
    t.is(doc.c, 'd')
    t.is(doc.a, undefined)
    t.is(doc.e, undefined)
    return
  })
})

test('find > should project only specified fields using projection options', t => {
  return users.insert([
    { a: 1, b: 2 },
    { a: 1, b: 1 }
  ]).then(() => {
    return users.find({a: 1}, { sort: true, projection: { a: 1 } })
  }).then((docs) => {
    t.is(docs[0].a, 1)
    t.is(docs[0].b, undefined)
    t.is(docs[1].a, 1)
    return t.is(docs[1].b, undefined)
  })
})

test.serial('findOne > await', async (t) => {
  const doc = await users.insert({ woot: 'e' })
  const result = await users.findOne(doc._id)
  t.is(result.woot, 'e')
})

test('find > should find with nested query', (t) => {
  return users.insert([{ nested: { a: 1 } }, { nested: { a: 2 } }]).then(() => {
    return users.find({ 'nested.a': 1 })
  }).then((docs) => {
    t.is(docs.length, 1)
    return t.is(docs[0].nested.a, 1)
  })
})

test('find > should find with nested array query', (t) => {
  return users.insert([{ nestedArray: [{ a: 1 }] }, { nestedArray: [{ a: 2 }] }]).then(() => {
    return users.find({ 'nestedArray.a': 1 })
  }).then((docs) => {
    t.is(docs.length, 1)
    return t.is(docs[0].nestedArray[0].a, 1)
  })
})

test('find > should sort', (t) => {
  return users.insert([{ sort: true, a: 1, b: 2 }, { sort: true, a: 1, b: 1 }]).then(() => {
    return users.find({ sort: true }, { sort: '-a b' })
  }).then((docs) => {
    t.is(docs[0].b, 1)
    return t.is(docs[1].b, 2)
  })
})

test('find > should return the raw cursor', (t) => {
  const query = { stream: 3 }
  return users.insert([{ stream: 3 }, { stream: 3 }, { stream: 3 }, { stream: 3 }]).then(() => {
    return users.find(query, {rawCursor: true})
      .then((cursor) => {
        t.true(cursor instanceof mongo.FindCursor)
        t.truthy(cursor.close)
        t.truthy(cursor.hasNext)
        t.truthy(cursor.rewind)
        return cursor.close()
      })
  })
})

test('find > should work with out streaming', (t) => {
  const query = { stream: 1 }
  let found = 0
  return users.insert([{ stream: 1 }, { stream: 1 }, { stream: 1 }, { stream: 1 }]).then(() => {
    return users.find(query)
      .each((doc) => {
        t.is(doc.stream, 1)
        found++
        return
      })
      .then(() => {
        return t.is(found, 4)
      })
  })
})

test('find > should work with streaming option', (t) => {
  const query = { stream: 2 }
  let found = 0
  return users.insert([{ stream: 2 }, { stream: 2 }, { stream: 2 }, { stream: 2 }]).then(() => {
    return users.find(query, { stream: true })
      .each((doc) => {
        t.is(doc.stream, 2)
        return found++
      })
      .then(() => {
        return t.is(found, 4)
      })
  })
})

test('find > should work with streaming option without each', (t) => {
  const query = { stream: 5 }
  let found = 0
  return users.insert([{ stream: 5 }, { stream: 5 }, { stream: 5 }, { stream: 5 }]).then(() => {
    return users.find(query, {
      stream (doc) {
        t.is(doc.stream, 5)
        return found++
      }
    })
      .then(() => {
        return t.is(found, 4)
      })
  })
})

test('find > should allow stream cursor destroy', (t) => {
  const query = { cursor: { $exists: true } }
  let found = 0
  return users.insert([{ cursor: true }, { cursor: true }, { cursor: true }, { cursor: true }]).then(() => {
    return users.find(query)
      .each((doc, {close}) => {
        t.not(doc.cursor, null)
        found++
        if (found === 2) close()
        return
      })
      .then(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            t.is(found, 2)
            return resolve()
          }, 100)
        })
      })
  })
})


test('find > stream rewind', (t) => {
  const query = { stream: 4 }
  return users.insert([{ stream: 4 }, { stream: 4 }, { stream: 4 }, { stream: 4 }]).then(() => {
    let index = 0
    return users.find(query)
      .each((doc, {rewind}) => {
        t.not(doc.a, null)
        index++
        if (index === 2) rewind()
        return
      })
      .then(() => {
        t.is(index, 6)
      })
  })
})

test('find > stream await', async (t) => {
  const query = { stream: 3 }
  await users.insert([{ stream: 3 }, { stream: 3 }, { stream: 3 }, { stream: 3 }])
  return new Promise((resolve) => {
    users.find(query).each((doc) => {
      t.not(doc.a, null)
    }).then(() => {
      return resolve()
    })
  })
})

test.serial('find > await', async (t) => {
  const doc = await users.insert({ woot: 'e' })
  const result = await users.find(doc._id)
  t.is(result[0].woot, 'e')
})

test('count > should count', (t) => {
  return users.count({ a: 'counting' }).then((count) => {
    t.is(count, 0)
    return users.insert({ a: 'counting' })
  }).then(() => {
    return users.count({ a: 'counting' })
  }).then((count) => {
    return t.is(count, 1)
  })
})

test('count > should not ignore options', (t) => {
  return users.count({ b: 'counting' }).then((count) => {
    t.is(count, 0)
    return users.insert([{ b: 'counting' }, { b: 'counting' }, { b: 'counting' }, { b: 'counting' }])
  }).then(() => {
    return users.count({ b: 'counting' }, {limit: 2})
  }).then((count) => {
    return t.is(count, 2)
  })
})

test.serial('count > should count with no arguments', async (t) => {
  await users.drop()
  return users.count({ c: 'counting' }).then((count) => {
    t.is(count, 0)
    return users.insert({ c: 'counting' })
  }).then(() => {
    return users.count()
  }).then((count) => {
    return t.true(count >= 1)
  })
})

test.serial('count > should estimate count', async (t) => {
  await users.drop()
  await users.insert(Array.from({ length: 50 }, (_, i) => ({ d: 'should estimate count' })))
  await users.insert(Array.from({ length: 50 }, (_, i) => ({ e: 'should estimate count' })))
  return users.count({d: 'should estimate count'}, { estimate: true }).then((count) => {
    return t.is(count, 100)
  })
})

test.serial('count > should estimate count with options', async (t) => {
  await users.drop()
  await users.insert(Array.from({ length: 50 }, (_, i) => ({ d: 'should estimate count' })))
  await users.insert(Array.from({ length: 50 }, (_, i) => ({ e: 'should estimate count' })))
  return users.count({}, { estimate: true, maxTimeMS: 10000 }).then((count) => {
    return t.is(count, 100)
  })
})

test('count > await', async (t) => {
  const count = users.count({ a: 'counting' })
  await t.notThrowsAsync(count)
})

test('distinct', (t) => {
  return users.insert([{ distinct: 'a' }, { distinct: 'a' }, { distinct: 'b' }]).then(() => {
    return users.distinct('distinct')
  }).then((docs) => {
    return t.deepEqual(docs, ['a', 'b'])
  })
})

test('distinct with options', (t) => {
  return users.insert([{ distinct2: 'a' }, { distinct2: 'a' }, { distinct2: 'b' }]).then(() => {
    return users.distinct('distinct2', {})
  }).then((docs) => {
    return t.deepEqual(docs, ['a', 'b'])
  })
})

test('distinct > with options async', async (t) => {
  const cmd = users.distinct('distinct', {})
  await t.notThrowsAsync(cmd)
})

test('distinct > async', async (t) => {
  const distinct = users.distinct('distinct')
  await t.notThrowsAsync(distinct)
})

test('update > should update', (t) => {
  return users.insert({ d: 'e' }).then((doc) => {
    return users.update({ _id: doc._id }, { $set: { d: 'f' } }).then(() => {
      return users.findOne(doc._id)
    })
  }).then((doc) => {
    return t.is(doc.d, 'f')
  }).catch((err) => {
    return t.fail(err/message)
  })
})

test('update > should update with 0', (t) => {
  return users.insert({ d: 'e' }).then((doc) => {
    return users.update({ _id: doc._id }, { $set: { d: 0 } }).then(() => {
      return users.findOne(doc._id)
    })
  }).then((doc) => {
    return t.is(doc.d, 0)
  })
})

test('update > async', async (t) => {
  const update = users.update({ d: 'e' }, { $set: { d: 'f' } })
  await t.notThrowsAsync(update)
})

test.serial('update > should update with an objectid', (t) => {
  return users.insert({ d: 'e' }).then((doc) => {
    return users.update(doc._id, { $set: { d: 'f' } }).then(() => {
      return users.findOne(doc._id)
    })
  }).then((doc) => {
    return t.is(doc.d, 'f')
  })
})

test.serial('update > should update with an objectid (string)', (t) => {
  return users.insert({ d: 'e' }).then((doc) => {
    return users.update(doc._id.toString(), { $set: { d: 'f' } }).then(() => {
      return users.findOne(doc._id)
    })
  }).then((doc) => {
    return t.is(doc.d, 'f')
  })
})

test('remove > should remove a document', (t) => {
  return users.insert({ name: 'Tobi' }).then((doc) => {
    return users.remove({ name: 'Tobi' })
  }).then(() => {
    return users.find({ name: 'Tobi' })
  }).then((doc) => {
    return t.deepEqual(doc, [])
  })
})

test('remove > async', async (t) => {
  await users.insert({ name: 'Mathieu' })
  await users.remove({ name: 'Mathieu' })
  const user = await users.find({ name: 'Mathieu' })
  t.is(user.length, 0)
})

test('findOneAndDelete > should remove a document and return it', (t) => {
  return users.insert({ name: 'Bob' }).then((doc) => {
    return users.findOneAndDelete({ name: 'Bob' })
  }).then((doc) => {
    t.is(doc.name, 'Bob')
    return users.find({ name: 'Bob' })
  }).then((doc) => {
    return t.deepEqual(doc, [])
  })
})

test('findOneAndDelete > async', async (t) => {
  await users.insert({ name: 'Bob2' })
  const result = await users.findOneAndDelete({ name: 'Bob2' })
  t.is(result.name, 'Bob2')
  const user = await users.find({ name: 'Bob2' })
  t.deepEqual(user, [])
})

test('findOneAndDelete > should return null if found nothing', (t) => {
  return users.findOneAndDelete({ name: 'Bob3' })
    .then((doc) => {
      return t.is(doc, null)
    })
})

test('findOneAndUpdate > should update a document and return it', async (t) => {
  await users.insert({ name: 'Jack' })
  const doc = await users.findOneAndUpdate({ name: 'Jack' }, { $set: { name: 'Jack4' } })
  t.is(doc.name, 'Jack4')
})

test('findOneAndUpdate > should return null if found nothing', (t) => {
  return users.findOneAndUpdate({ name: 'Jack5' }, { $set: { name: 'Jack6' } })
    .then((doc) => {
      return t.is(doc, null)
    })
})

test('findOneAndUpdate > should return an error if no atomic operations are specified', async t => {
  const cmd = users.findOneAndUpdate({ name: 'Jack5' }, { name: 'Jack6' })
  const err = await t.throwsAsync(() => cmd)
  t.is(err.message, 'Update document requires atomic operators')
})

test('findOneAndUpdate > async', async (t) => {
  await users.insert({ name: 'Jack2' })
  const doc = await users.findOneAndUpdate({ name: 'Jack2' }, { $set: { name: 'Jack3' } })
  t.is(doc.name, 'Jack3')
})

test('aggregate > should fail properly', (t) => {
  const cmd = users.aggregate({$madeup: 'foo'})
  return t.throwsAsync(() => cmd)
})

test('aggregate > should fail properly with async', async (t) => {
  const cmd = users.aggregate({$madeup: 'foo'})
  await t.throwsAsync(() => cmd)
})

test('aggregate > should work in normal case', async (t) => {
  await users.insert([{ woot: 1 }, { woot: 2 }, { woot: 3 }])
  return users.aggregate([{$group: {_id: null, maxWoot: { $max: '$woot' }}}]).then((res) => {
    t.true(Array.isArray(res))
    return t.is(res.length, 1)
  })
})

test('aggregate > should work with option', (t) => {
  return users.aggregate([{$group: {_id: null, maxWoot: { $max: '$woot' }}}], { explain: true }).then((res) => {
    t.true(Array.isArray(res))
    return t.is(res.length, 1)
  })
})

test('aggregate > async', async (t) => {
  const cmd = users.aggregate([{$group: {_id: null, maxWoot: { $max: '$woot' }}}])
  await t.notThrowsAsync(cmd)
})

test('bulkWrite', (t) => {
  return users.bulkWrite([
    { insertOne: { document: { bulkWrite: 1 } } }
  ]).then((r) => {
    return t.is(r.nInserted, 1)
  })
})

test('bulkWrite > async', async (t) => {
  const cmd = users.bulkWrite([
    { insertOne: { document: { bulkWrite: 2 } } }
  ])
  await t.notThrowsAsync(cmd)
})

test('should allow defaults', (t) => {
  return users.insert([{ f: true }, { f: true }, { g: true }, { g: true }]).then(() => {
    return users.update({}, { $set: { f: 'g' } })
  }).then(() => {
    users.options.safe = false
    users.options.multi = false
    return users.update({}, { $set: { g: 'h' } })
  }).then(({modifiedCount}) => {
    t.true(modifiedCount && modifiedCount <= 1)
  }).then(() => {
    users.options.safe = true
    users.options.multi = true
    return users.update({}, { $set: { g: 'i' } }, { safe: false, multi: false })
  }).then(({modifiedCount}) => {
    return t.true(modifiedCount && modifiedCount <= 1)
  })
})

test('drop > should not throw when dropping an empty db', (t) => {
  return db.get('dropDB-' + Date.now()).drop().then(() => t.pass()).catch(() => t.fail())
})

test('drop > async', async (t) => {
  const drop = db.get('dropDB2-' + Date.now()).drop()
  await t.notThrowsAsync(drop)
})

test('caching collections', (t) => {
  const collectionName = 'cached-' + Date.now()
  t.is(db.get(collectionName), db.get(collectionName))
})

test('not caching collections', (t) => {
  const collectionName = 'cached-' + Date.now()
  t.not(db.get(collectionName, {cache: false}), db.get(collectionName, {cache: false}))
})

test('geoHaystackSearch > async', async (t) => {
  const cmd = users.createIndex({loc: 'geoHaystack', type: 1}, {bucketSize: 1})
    .then(() => users.insert([{a: 1, loc: [50, 30]}, {a: 1, loc: [30, 50]}]))
    .then(() => users.geoHaystackSearch(50, 50, {search: {a: 1}, maxDistance: 100}))
  const err = await t.throwsAsync(() => cmd)

  t.is(err.message, 'geoHaystackSearch command is not supported anymore (see https://docs.mongodb.com/manual/reference/command/geoHaystackSearch)')
})

test('geoNear', async t => {
  const cmd = users.createIndex({loc2: '2d'})
    .then(() => users.insert([{a: 1, loc2: [50, 30]}, {a: 1, loc2: [30, 50]}]))
    .then(() => users.geoNear(50, 50, {query: {a: 1}, num: 1}))
    .then((r) => {
      return t.is(r.length, 1)
    })

  const err = await t.throwsAsync(() => cmd)

  t.is(err.message, 'geoNear command is not supported anymore (see https://docs.mongodb.com/manual/reference/command/geoNear)')
})

test('stats', (t) => {
  return users.stats().then((res) => {
    return t.truthy(res)
  })
})

test('stats > async', async (t) => {
  const stats = users.stats()
  await t.notThrowsAsync(stats)
})
