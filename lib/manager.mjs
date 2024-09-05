import { ObjectId, MongoClient as _MongoClient } from 'mongodb'
import Debug from 'debug'
import objectAssign from 'object-assign'
import Collection from './collection.mjs'
import { EventEmitter } from 'events'
import { inherits } from 'util'
import helpers from './helpers.mjs'
import monkMiddlewareQuery from 'monk-middleware-query'
import monkMiddlewareOptions from 'monk-middleware-options'
import monkMiddlewareCastIds from 'monk-middleware-cast-ids'
import monkMiddlewareFields from 'monk-middleware-fields'
import monkMiddlewareHandleCallback from 'monk-middleware-handle-callback'
import monkMiddlewareWaitForConnection from 'monk-middleware-wait-for-connection'

var monkDebug = Debug('monk:manager')
var MongoClient = _MongoClient

var STATE = {
  CLOSED: 'closed',
  OPENING: 'opening',
  OPEN: 'open'
}

var FIELDS_TO_CAST = ['operations', 'query', 'data', 'update']

var DEFAULT_OPTIONS = {
  castIds: true,
  middlewares: [
    monkMiddlewareQuery,
    monkMiddlewareOptions,
    monkMiddlewareCastIds(FIELDS_TO_CAST),
    monkMiddlewareFields,
    monkMiddlewareHandleCallback,
    monkMiddlewareWaitForConnection
  ]
}

/*
 * Module exports.
 */

export default Manager

/**
 * Monk constructor.
 *
 * @param {Array|String} uri replica sets can be an array or
 * comma-separated
 * @param {Object|Function} opts or connect callback
 * @param {Function} fn connect callback
 * @return {Promise} resolve when the connection is opened
 */

function Manager (uri, opts, fn) {
  if (!uri) {
    throw Error('No connection URI provided.')
  }

  if (!(this instanceof Manager)) {
    return new Manager(uri, opts, fn)
  }

  if (typeof opts === 'function') {
    fn = opts
    opts = {}
  }

  opts = opts || {}

  if (!opts.hasOwnProperty('useNewUrlParser')) {
    opts.useNewUrlParser = true
  }
  if (!opts.hasOwnProperty('useUnifiedTopology')) {
    opts.useUnifiedTopology = true
  }

  this._collectionOptions = objectAssign({}, DEFAULT_OPTIONS, opts.collectionOptions || {})
  this._collectionOptions.middlewares = this._collectionOptions.middlewares.slice(0)
  delete opts.collectionOptions

  if (Array.isArray(uri)) {
    if (!opts.database) {
      for (var i = 0, l = uri.length; i < l; i++) {
        if (!opts.database) {
          opts.database = uri[i].replace(/([^/])+\/?/, '')
        }
        uri[i] = uri[i].replace(/\/.*/, '')
      }
    }
    uri = uri.join(',') + '/' + opts.database
    monkDebug('repl set connection "%j" to database "%s"', uri, opts.database)
  }

  if (typeof uri === 'string') {
    if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
      uri = 'mongodb://' + uri
    }
  }

  this._state = STATE.OPENING

  this._queue = []
  this.on('open', function (db) {
    monkDebug('connection opened')
    monkDebug('emptying queries queue (%s to go)', this._queue.length)
    this._queue.forEach(function (cb) {
      cb(db)
    })
  }.bind(this))

  this._connectionURI = uri
  this._connectionOptions = opts

  this.open(uri, opts, fn && function (err) {
    fn(err, this)
  }.bind(this))

  this.helper = {
    id: ObjectId
  }

  this.collections = {}

  this.open = this.open.bind(this)
  this.close = this.close.bind(this)
  this.executeWhenOpened = this.executeWhenOpened.bind(this)
  this.collection = this.col = this.get = this.get.bind(this)
  this.oid = this.id
  this.setDefaultCollectionOptions = this.setDefaultCollectionOptions.bind(this)
  this.addMiddleware = this.addMiddleware.bind(this)
}

/*
 * Inherits from EventEmitter.
 */

inherits(Manager, EventEmitter)

/**
 * Open the connection
 * @private
 */
Manager.prototype.open = async function (uri, opts, fn) {
  let err
  try {
    const client = await MongoClient.connect(uri, opts)
    this._state = STATE.OPEN

    this._client = client
    this._db = client.db()

    // set up events
    // ;['authenticated', 'close', 'error', 'fullsetup', 'parseError', 'reconnect', 'timeout'].forEach((eventName) => {
    //   this._db.on(eventName, (e) => {
    //     this.emit(eventName, e)
    //   })
    // })
    this.on('reconnect', () => {
      this._state = STATE.OPEN
    })

    this.emit('open', this._db)
  } catch (error) {
    this._state = STATE.CLOSED
    this.emit('error-opening', error)
    err = error
  }
  if (fn) {
    const warn = new Error('DEPRECATED (manager.open) call back function is deprecated, please use the promise interface')
    console.warn(warn)
    fn(err, this)
  }
}

/**
 * Execute when connection opened.
 * @private
 */

Manager.prototype.executeWhenOpened = function () {
  switch (this._state) {
    case STATE.OPEN:
      return Promise.resolve(this._db)
    case STATE.OPENING:
      return new Promise(function (resolve) {
        this._queue.push(resolve)
      }.bind(this))
    case STATE.CLOSED:
    default:
      return new Promise(function (resolve) {
        this._queue.push(resolve)
        this.open(this._connectionURI, this._connectionOptions)
      }.bind(this))
  }
}

/**
 * Then
 *
 * @param {Function} [fn] - callback
 */

Manager.prototype.then = function (fn) {
  return new Promise(function (resolve, reject) {
    this.once('open', resolve)
    this.once('error-opening', reject)
  }.bind(this)).then(fn.bind(null, this))
}

/**
 * Catch
 *
 * @param {Function} [fn] - callback
 */

Manager.prototype.catch = function (fn) {
  return new Promise(function (resolve) {
    this.once('error-opening', resolve)
  }.bind(this)).then(fn.bind(null))
}

/**
 * Closes the connection.
 *
 * @param {Boolean} [force] - Force close, emitting no events
 * @param {Function} [fn] - callback
 * @return {Promise}
 */

Manager.prototype.close = function (force, fn) {
  if (typeof force === 'function') {
    fn = force
    force = false
  }

  var self = this
  function close (resolve) {
    self._client.close(force, function () {
      self._state = STATE.CLOSED
      if (fn) {
        fn()
      }
      resolve()
    })
  }

  switch (this._state) {
    case STATE.CLOSED:
      if (fn) {
        fn()
      }
      return Promise.resolve()
    case STATE.OPENING:
      return new Promise(function (resolve) {
        self._queue.push(function () {
          close(resolve)
        })
      })
    case STATE.OPEN:
    default:
      return new Promise(function (resolve) {
        close(resolve)
      })
  }
}

/**
 * Lists all collections.
 *
 * @param {Object} [query] - A query expression to filter the list of collections.
 * @return {Array} array of all collections
 */

Manager.prototype.listCollections = function (query) {
  var self = this
  return this.executeWhenOpened().then(function (db) {
    return db.listCollections(query).toArray().then(x => x.map(
      x => self.get(x.name)
    ))
  })
}

/**
 * Gets a collection.
 *
 * @param {String} name - name of the mongo collection
 * @param {Object} [options] - options to pass to the collection
 * @return {Collection} collection to query against
 */

Manager.prototype.get = function (name, options) {
  if ((options || {}).cache === false || !this.collections[name]) {
    delete (options || {}).cache
    this.collections[name] = new Collection(this, name, objectAssign({}, this._collectionOptions || {}, options || {}))
  }

  return this.collections[name]
}

/**
 * Create a collection.
 *
 * @param {String} name - name of the mongo collection
 * @param {Object} [creationOptions] - options used when creating the collection
 * @param {Object} [options] - options to pass to the collection
 * @return {Collection} collection to query against
 */

Manager.prototype.create = function (name, creationOptions, options) {
  this.executeWhenOpened().then(function (db) {
    db.createCollection(name, creationOptions)
  }).catch(function (err) {
    this.emit('error', err)
  })

  return this.get(name, options)
}

Manager.prototype.setDefaultCollectionOptions = function (options) {
  this._collectionOptions = options
}

Manager.prototype.addMiddleware = function (middleware) {
  if (!this._collectionOptions) {
    this._collectionOptions = {}
  }
  if (!this._collectionOptions.middlewares) {
    this._collectionOptions.middlewares = []
  }
  this._collectionOptions.middlewares.push(middleware)
}

Manager.prototype.id = function (str) {
  return helpers.id(str)
}

Manager.prototype.cast = function (obj) {
  return helpers.cast(obj)
}
