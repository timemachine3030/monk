import { ObjectId, MongoClient as _MongoClient } from "mongodb"
import Debug from "debug"
import objectAssign from "object-assign"
import Collection from "./collection.mjs"
import { EventEmitter } from "events"
import { inherits } from "util"
import helpers from "./helpers.mjs"
import monkMiddlewareQuery from "monk-middleware-query"
import monkMiddlewareOptions from "monk-middleware-options"
import monkMiddlewareCastIds from "monk-middleware-cast-ids"
import monkMiddlewareFields from "monk-middleware-fields"
import monkMiddlewareHandleCallback from "monk-middleware-handle-callback"
import monkMiddlewareWaitForConnection from "monk-middleware-wait-for-connection"

var monkDebug = Debug("monk:manager")
var MongoClient = _MongoClient

var STATE = {
  CLOSED: "closed",
  OPENING: "opening",
  OPEN: "open",
}

var FIELDS_TO_CAST = ["operations", "query", "data", "update"]

var DEFAULT_OPTIONS = {
  castIds: true,
  middlewares: [
    monkMiddlewareQuery,
    monkMiddlewareOptions,
    monkMiddlewareCastIds(FIELDS_TO_CAST),
    monkMiddlewareFields,
    monkMiddlewareHandleCallback,
    monkMiddlewareWaitForConnection,
  ],
}

/**
 * Monk constructor.
 *
 * @param {Array|String} uri replica sets can be an array or
 * comma-separated
 * @param {Object|Function} opts or connect callback
 * @return {Promise} resolve when the connection is opened
 */

export class Manager extends EventEmitter {
  constructor(uri, opts, fn) {
    super()
    if (!uri) {
      throw Error("No connection URI provided.")
    }

    if (typeof opts === "function") {
      fn = opts
      opts = {}
    }

    opts = opts || {}

    if (!opts.hasOwnProperty("useNewUrlParser")) {
      opts.useNewUrlParser = true
    }
    if (!opts.hasOwnProperty("useUnifiedTopology")) {
      opts.useUnifiedTopology = true
    }

    this._collectionOptions = objectAssign(
      {},
      DEFAULT_OPTIONS,
      opts.collectionOptions || {}
    )
    this._collectionOptions.middlewares =
      this._collectionOptions.middlewares.slice(0)
    delete opts.collectionOptions

    if (Array.isArray(uri)) {
      if (!opts.database) {
        for (var i = 0, l = uri.length; i < l; i++) {
          if (!opts.database) {
            opts.database = uri[i].replace(/([^/])+\/?/, "")
          }
          uri[i] = uri[i].replace(/\/.*/, "")
        }
      }
      uri = uri.join(",") + "/" + opts.database
      monkDebug(
        'repl set connection "%j" to database "%s"',
        uri,
        opts.database
      )
    }

    if (typeof uri === "string") {
      if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
        uri = "mongodb://" + uri
      }
    }

    this._state = STATE.OPENING
    this.emit("opening")

    this._queue = []
    this.on("open",
      (db) => {
        monkDebug("connection opened")
        monkDebug("emptying queries queue (%s to go)", this._queue.length)
        this._queue.forEach(function (cb) {
          cb(db)
        })
        this._queue = []
      }
    )

    this._connectionURI = uri
    this._connectionOptions = opts

    this.open(
      uri,
      opts,
      fn &&
        function (err) {
          fn(err, this)
        }.bind(this)
    )

    this.helper = {
      id: ObjectId,
    }

    this.collections = {}
  }
  /**
   * Then
   *
   * @param {Function} [fn] - callback
   */
  then(fn) {
    const err = new Error(
      "DEPRECATED (manager.then) then is deprecated, please use the promise interface"
    )
    return new Promise(
      function (resolve, reject) {
        this.once("open", resolve)
        this.once("error-opening", reject)
      }.bind(this)
    ).then(fn.bind(null, this))
  }
  /**
   * Catch
   *
   * @param {Function} [fn] - callback
   */
  catch(fn) {
    const err = new Error(
      "DEPRECATED (manager.catch) catch is deprecated, please use the promise interface"
    )
    return new Promise(
      function (resolve) {
        this.once("error-opening", resolve)
      }.bind(this)
    ).then(fn.bind(null))
  }
  /**
   * Lists all collections.
   *
   * @param {Object} [query] - A query expression to filter the list of collections.
   * @return {Array} array of all collections
   */
  async listCollections(query) {
    const db = await this.executeWhenOpened()
    const cols = await db.listCollections(query).toArray()
    return cols.map((x) => this.get(x).name)
  }
  /**
   * Create a collection.
   *
   * @param {String} name - name of the mongo collection
   * @param {Object} [creationOptions] - options used when creating the collection
   * @param {Object} [options] - options to pass to the collection
   * @return {Collection} collection to query against
   */
  create(name, creationOptions, options) {
    this.executeWhenOpened()
      .then(function (db) {
        db.createCollection(name, creationOptions)
      })
      .catch(function (err) {
        this.emit("error", err)
      })

    return this.get(name, options)
  }

  /**
   * Open the connection
   * @private
   */
  async open(uri, opts, fn) {
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
      this.on("reconnect", () => {
        this._state = STATE.OPEN
      })

      this.emit("open", this._db)
      this.emit("reconnect", this._db)
    } catch (error) {
      this._state = STATE.CLOSED
      this.emit("error-opening", error)
      this.emit("error", error)
      err = error
    }
    if (fn) {
      const warn = new Error(
        "DEPRECATED (manager.open) call back function is deprecated, please use the promise interface"
      )
      console.warn(warn)
      fn(err, this)
    }
  }

  /**
   * Execute when connection opened.
   * @private
   */

  executeWhenOpened() {
    return new Promise((resolve) => {
      switch (this._state) {
        case STATE.OPEN:
          return resolve(this._db)
        case STATE.OPENING:
          this._queue.push(resolve)
          break
        case STATE.CLOSED:
        default:
          this._queue.push(resolve)
          this.open(this._connectionURI, this._connectionOptions)
      }
    })
  }

  /**
   * Closes the connection.
   *
   * @param {Boolean} [force] - Force close, emitting no events
   * @return {Promise}
   */

  close(force, fn) {
    if (typeof force === "function") {
      fn = force
      force = false
    }
    if (typeof fn === "function") {
      const warn = new Error(
        "DEPRECATED (manager.close) call back function is deprecated, please use the promise interface"
      )
      console.warn(warn)
    }

    const closeClient = (resolve) => {
      this._client.close(force, () => {
        this._state = STATE.CLOSED
        if (fn) {
          fn()
        }
        this.emit("close")
        resolve()
      })
    }

    return new Promise((resolve) => {
      switch (this._state) {
        case STATE.CLOSED:
          if (fn) {
            fn()
          }
          return resolve()
        case STATE.OPENING:
          this._queue.push(function () {
            closeClient(resolve)
          })
          break
        case STATE.OPEN:
        default:
          closeClient(resolve)
      }
    })
  }

  /**
   * Gets a collection.
   *
   * @param {String} name - name of the mongo collection
   * @param {Object} [options] - options to pass to the collection
   * @return {Collection} collection to query against
   */

  get(name, options) {
    if ((options || {}).cache === false || !this.collections[name]) {
      delete (options || {}).cache
      this.collections[name] = new Collection(
        this,
        name,
        objectAssign({}, this._collectionOptions || {}, options || {})
      )
    }

    return this.collections[name]
  }

  setDefaultCollectionOptions(options) {
    this._collectionOptions = options
  }

  addMiddleware(middleware) {
    if (!this._collectionOptions) {
      this._collectionOptions = {}
    }
    if (!this._collectionOptions.middlewares) {
      this._collectionOptions.middlewares = []
    }
    this._collectionOptions.middlewares.push(middleware)
  }

  /**
   * Add some helpers
   */
  col(...args) {
    return this.get(...args)
  }

  static oid(...args) {
    return helpers.id(...args)
  }
  oid(...args) {
    return helpers.id(...args)
  }

  static id(...args) {
    return helpers.id(...args)
  }
  id(...args) {
    return helpers.id(...args)
  }

  static cast(...args) {
    return helpers.cast(...args)
  }
  cast(...args) {
    return helpers.cast(...args)
  }

}

/*
 * support for calling monk() directly
 */

const monk = function (...args) {
  return new Manager(...args)
}

monk.id = helpers.id
monk.cast = helpers.cast

export default monk
