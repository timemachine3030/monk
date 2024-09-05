import applyMiddlewares from './applyMiddlewares.mjs'

export class Collection {

  constructor(manager, name, options) {
    this.manager = manager
    this.name = name
    this.options = options

    this.middlewares = this.options.middlewares || []
    delete this.options.middlewares

    this._dispatch = applyMiddlewares(this.middlewares)(manager, this)
  }

  bulkWrite(operations, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch((args) => {
      return args.col.bulkWrite(args.operations, args.options)
    })({ options: opts, operations: operations, callback: fn }, 'bulkWrite')
  }

  ensureIndex(fields, opts, fn) {
    throw new Error('REMOVED (collection.ensureIndex): use collection.createIndex instead (see https://Automattic.github.io/monk/docs/collection/createIndex.html)')
  }

  geoHaystackSearch(x, y, opts, fn) {
    throw new Error('geoHaystackSearch command is not supported anymore (see https://docs.mongodb.com/manual/reference/command/geoHaystackSearch)')
  }

  geoNear() {
    throw new Error('geoNear command is not supported anymore (see https://docs.mongodb.com/manual/reference/command/geoNear)')
  }

  group(keys, condition, initial, reduce, finalize, command, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    let warn = new Error('DEPRECATED (collection.group): MongoDB 3.6 or higher no longer supports the group command. We recommend rewriting using the aggregation framework.')
    console.warn(warn)

    return this._dispatch((args) => {
      return args.col.group(args.keys, args.condition, args.initial, args.reduce, args.finalize, args.command, args.options)
    })({ options: opts, keys: keys, condition: condition, initial: initial, reduce: reduce, finalize: finalize, command: command, callback: fn }, 'group')
  }

  mapReduce(map, reduce, opts, fn) {
    return this._dispatch((args) => {
      return args.col.mapReduce(args.map, args.reduce, args.options)
    })({ map: map, reduce: reduce, options: opts, callback: fn }, 'mapReduce')
  }

  stats(opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    return this._dispatch(function remove(args) {
      return args.col.stats(args.options)
    })({ options: opts, callback: fn }, 'stats')
  }

  aggregate(stages, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch(function aggregate (args) {
      return args.col.aggregate(args.stages, args.options).toArray()
    })({options: opts, stages: stages, callback: fn}, 'aggregate')
  }

  count(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    if (typeof query === 'function') {
      fn = query
      query = {}
    }

    return this._dispatch(function count (args) {
      const {estimate, ...options} = args.options
      if (estimate) {
        return args.col.estimatedDocumentCount(options)
      }
      return args.col.countDocuments(args.query, options)
    })({options: opts, query: query, callback: fn}, 'count')
  }

  createIndex(fields, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch(function createIndex (args) {
      return args.col.createIndex(args.fields, args.options)
    })({options: opts, fields: fields, callback: fn}, 'createIndex')
  }

  distinct(field, query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    if (typeof query === 'function') {
      fn = query
      query = {}
    }

    return this._dispatch(function distinct (args) {
      return args.col.distinct(args.field, args.query, args.options)
    })({options: opts, query: query, field: field, callback: fn}, 'distinct')
  }

  drop(fn) {
    return this._dispatch(function drop (args) {
      return args.col.drop().catch(function (err) {
        if (err && err.message === 'ns not found') {
          return 'ns not found'
        } else {
          throw err
        }
      })
    })({callback: fn}, 'drop')
  }

  dropIndex(fields, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch(function dropIndex (args) {
      return args.col.dropIndex(args.fields, args.options)
    })({options: opts, fields: fields, callback: fn}, 'dropIndex')
  }

  dropIndexes(fn) {
    return this._dispatch(function dropIndexes (args) {
      return args.col.dropIndexes()
    })({callback: fn}, 'dropIndexes')
  }

  find(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    if ((opts || {}).rawCursor) {
      delete opts.rawCursor
      return this._dispatch(function find (args) {
        return Promise.resolve(args.col.find(args.query, args.options))
      })({options: opts, query: query, callback: fn}, 'find')
    }

    var promise = this._dispatch(function find (args) {
      var cursor = args.col.find(args.query, args.options)

      if (!(opts || {}).stream && !promise.eachListener) {
        return cursor.toArray()
      }

      if (typeof (opts || {}).stream === 'function') {
        promise.eachListener = (opts || {}).stream
      }

      function close () {
        cursor.close()
      }
      function rewind () {
        cursor.rewind()
      }
      return new Promise(async function (resolve, reject) {
        try {
          while (await cursor.hasNext()) {
            const doc = await cursor.next()
            await promise.eachListener(doc, {
              close,
              rewind
            })

          }
        } catch (err) {
          if (fn) {
            fn(err)
          }
          reject(err)
        }
        resolve()
      })
    })({options: opts, query: query, callback: fn}, 'find')

    promise.each = function (eachListener) {
      promise.eachListener = eachListener
      return promise
    }

    return promise
  }

  findOne(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    if (typeof opts === 'string') {
      const warn = new Error('DEPRECATED (findOne.projection): findOne should pass an options object instead of a projection string')
      console.warn(warn)
      opts = {projection: opts}
    }
    opts = opts || {}
    if (typeof opts.projection === 'string') {
      opts.projection = opts.projection.split(' ').reduce((acc, key) => {
        if (key[0] === '-') {
          acc[key.slice(1)] = 0
        } else {
          acc[key] = 1
        }
        return acc
      }, {})
    }

    return this._dispatch(function findOne (args) {
      return args.col.find(args.query, args.options).limit(1).toArray()
        .then(function (docs) {
          return (docs && docs[0]) || null
        })
    })({options: opts, query: query, callback: fn}, 'findOne')
  }

  findOneAndDelete(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    return this._dispatch(function findOneAndDelete (args) {
      return args.col.findOneAndDelete(args.query, args.options)
        .then(function (doc) {
          if (doc && typeof doc.value !== 'undefined') {
            return doc.value
          }
          if (doc.ok && doc.lastErrorObject && doc.lastErrorObject.n === 0) {
            return null
          }
          return doc
        })
    })({options: opts, query: query, callback: fn}, 'findOneAndDelete')
  }

  findOneAndUpdate(query, update, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    return this._dispatch(function findOneAndUpdate (args) {
      var method = 'findOneAndUpdate'
      if (typeof (args.options || {}).returnDocument === 'undefined') {
        args.options.returnDocument = "after"
      }
      if (args.options.replaceOne | args.options.replace) {
        method = 'findOneAndReplace'
      }
      return args.col[method](args.query, args.update, args.options)
        .then(function (doc) {
          if (doc && typeof doc.value !== 'undefined') {
            return doc.value
          }
          if (doc.ok && doc.lastErrorObject && doc.lastErrorObject.n === 0) {
            return null
          }
          return doc
        })
    })({options: opts, query: query, update: update, callback: fn}, 'findOneAndUpdate')
  }

  indexes(fn) {
    return this._dispatch(function indexes (args) {
      return args.col.indexInformation()
    })({callback: fn}, 'indexes')
  }

  insert(data, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch(function insert (args) {
      var arrayInsert = Array.isArray(args.data)

      if (arrayInsert && args.data.length === 0) {
        return Promise.resolve([])
      }
      const insertop = arrayInsert
        ? args.col.insertMany(args.data, args.options)
        : args.col.insertOne(args.data, args.options)
      return insertop.then(function (result) {
        if (arrayInsert) {
          return args.data.map((doc, i) => {
            return {
              _id: result.insertedIds[i],
              ...doc,
            }
          })
        } else {
          const doc = {
            _id: result.insertedId,
            ...args.data,
          }
          return doc
        }
      })
    })({data: data, options: opts, callback: fn}, 'insert')
  }

  remove(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    return this._dispatch(function remove (args) {
      var options = args.options || {}
      var method = options.single || options.multi === false ? 'deleteOne' : 'deleteMany'
      return args.col[method](args.query, args.options)
    })({query: query, options: opts, callback: fn}, 'remove')
  }

  update(query, update, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch(function update (args) {
      var options = args.options || {}
      var method = options.multi || options.single === false ? 'updateMany' : 'updateOne'
      if (options.replace || options.replaceOne) {
        if (options.multi || options.single === false) {
          throw new Error('The `replace` option is only available for single updates.')
        }
        method = 'replaceOne'
      }
      return args.col[method](args.query, args.update, args.options)
    })({update: update, query: query, options: opts, callback: fn}, 'update')
  }

  index(...args) {
    return this.createIndex(...args)
  }

}

export default Collection
