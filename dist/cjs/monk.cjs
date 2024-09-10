'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var util = require('util');
var mongo = require('mongodb');
var Debug = require('debug');
var objectAssign = require('object-assign');
var events = require('events');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var mongo__default = /*#__PURE__*/_interopDefaultLegacy(mongo);
var Debug__default = /*#__PURE__*/_interopDefaultLegacy(Debug);
var objectAssign__default = /*#__PURE__*/_interopDefaultLegacy(objectAssign);

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (args) => f(g(h(args))).
 */

function compose(funcs) {
  if (funcs.length === 0) {
    return function (args) {
      return args;
    };
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce(function (a, b) {
    return function (args) {
      return a(b(args));
    };
  });
}

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
function applyMiddleware(middlewares) {
  return function (monkInstance, collection) {
    var chain = [];
    var middlewareAPI = {
      monkInstance,
      collection
    };
    chain = middlewares.map(function (middleware) {
      return middleware(middlewareAPI);
    });
    return compose(chain);
  };
}

class Collection {
  constructor(manager, name, options) {
    this.manager = manager;
    this.name = name;
    this.options = options;
    this.middlewares = this.options.middlewares || [];
    delete this.options.middlewares;
    this._dispatch = applyMiddleware(this.middlewares)(manager, this);
  }
  bulkWrite(operations, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(args => {
      return args.col.bulkWrite(args.operations, args.options);
    })({
      options: opts,
      operations: operations,
      callback: fn
    }, 'bulkWrite');
  }
  ensureIndex(fields, opts, fn) {
    throw new Error('REMOVED (collection.ensureIndex): use collection.createIndex instead (see https://Automattic.github.io/monk/docs/collection/createIndex.html)');
  }
  geoHaystackSearch(x, y, opts, fn) {
    throw new Error('geoHaystackSearch command is not supported anymore (see https://docs.mongodb.com/manual/reference/command/geoHaystackSearch)');
  }
  geoNear() {
    throw new Error('geoNear command is not supported anymore (see https://docs.mongodb.com/manual/reference/command/geoNear)');
  }
  group(keys, condition, initial, reduce, finalize, command, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    let warn = new Error('DEPRECATED (collection.group): MongoDB 3.6 or higher no longer supports the group command. We recommend rewriting using the aggregation framework.');
    console.warn(warn);
    return this._dispatch(args => {
      return args.col.group(args.keys, args.condition, args.initial, args.reduce, args.finalize, args.command, args.options);
    })({
      options: opts,
      keys: keys,
      condition: condition,
      initial: initial,
      reduce: reduce,
      finalize: finalize,
      command: command,
      callback: fn
    }, 'group');
  }
  mapReduce(map, reduce, opts, fn) {
    return this._dispatch(args => {
      return args.col.mapReduce(args.map, args.reduce, args.options);
    })({
      map: map,
      reduce: reduce,
      options: opts,
      callback: fn
    }, 'mapReduce');
  }
  stats(opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(function remove(args) {
      return args.col.stats(args.options);
    })({
      options: opts,
      callback: fn
    }, 'stats');
  }
  aggregate(stages, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(function aggregate(args) {
      return args.col.aggregate(args.stages, args.options).toArray();
    })({
      options: opts,
      stages: stages,
      callback: fn
    }, 'aggregate');
  }
  count(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    if (typeof query === 'function') {
      fn = query;
      query = {};
    }
    return this._dispatch(function count(args) {
      const {
        estimate,
        ...options
      } = args.options;
      if (estimate) {
        return args.col.estimatedDocumentCount(options);
      }
      return args.col.countDocuments(args.query, options);
    })({
      options: opts,
      query: query,
      callback: fn
    }, 'count');
  }
  createIndex(fields, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(function createIndex(args) {
      return args.col.createIndex(args.fields, args.options);
    })({
      options: opts,
      fields: fields,
      callback: fn
    }, 'createIndex');
  }
  distinct(field, query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    if (typeof query === 'function') {
      fn = query;
      query = {};
    }
    return this._dispatch(function distinct(args) {
      return args.col.distinct(args.field, args.query, args.options);
    })({
      options: opts,
      query: query,
      field: field,
      callback: fn
    }, 'distinct');
  }
  drop(fn) {
    return this._dispatch(function drop(args) {
      return args.col.drop().catch(function (err) {
        if (err && err.message === 'ns not found') {
          return 'ns not found';
        } else {
          throw err;
        }
      });
    })({
      callback: fn
    }, 'drop');
  }
  dropIndex(fields, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(function dropIndex(args) {
      return args.col.dropIndex(args.fields, args.options);
    })({
      options: opts,
      fields: fields,
      callback: fn
    }, 'dropIndex');
  }
  dropIndexes(fn) {
    return this._dispatch(function dropIndexes(args) {
      return args.col.dropIndexes();
    })({
      callback: fn
    }, 'dropIndexes');
  }
  find(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    if ((opts || {}).rawCursor) {
      delete opts.rawCursor;
      return this._dispatch(function find(args) {
        return Promise.resolve(args.col.find(args.query, args.options));
      })({
        options: opts,
        query: query,
        callback: fn
      }, 'find');
    }
    var promise = this._dispatch(function find(args) {
      var cursor = args.col.find(args.query, args.options);
      if (!(opts || {}).stream && !promise.eachListener) {
        return cursor.toArray();
      }
      if (typeof (opts || {}).stream === 'function') {
        promise.eachListener = (opts || {}).stream;
      }
      function close() {
        cursor.close();
      }
      function rewind() {
        cursor.rewind();
      }
      return new Promise(async function (resolve, reject) {
        try {
          while (await cursor.hasNext()) {
            const doc = await cursor.next();
            await promise.eachListener(doc, {
              close,
              rewind
            });
          }
        } catch (err) {
          if (fn) {
            fn(err);
          }
          reject(err);
        }
        resolve();
      });
    })({
      options: opts,
      query: query,
      callback: fn
    }, 'find');
    promise.each = function (eachListener) {
      promise.eachListener = eachListener;
      return promise;
    };
    return promise;
  }
  findOne(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    if (typeof opts === 'string') {
      const warn = new Error('DEPRECATED (findOne.projection): findOne should pass an options object instead of a projection string');
      console.warn(warn);
      opts = {
        projection: opts
      };
    }
    opts = opts || {};
    if (typeof opts.projection === 'string') {
      opts.projection = opts.projection.split(' ').reduce((acc, key) => {
        if (key[0] === '-') {
          acc[key.slice(1)] = 0;
        } else {
          acc[key] = 1;
        }
        return acc;
      }, {});
    }
    return this._dispatch(function findOne(args) {
      return args.col.find(args.query, args.options).limit(1).toArray().then(function (docs) {
        return docs && docs[0] || null;
      });
    })({
      options: opts,
      query: query,
      callback: fn
    }, 'findOne');
  }
  findOneAndDelete(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(function findOneAndDelete(args) {
      return args.col.findOneAndDelete(args.query, args.options).then(function (doc) {
        if (doc && typeof doc.value !== 'undefined') {
          return doc.value;
        }
        if (doc.ok && doc.lastErrorObject && doc.lastErrorObject.n === 0) {
          return null;
        }
        return doc;
      });
    })({
      options: opts,
      query: query,
      callback: fn
    }, 'findOneAndDelete');
  }
  findOneAndUpdate(query, update, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(function findOneAndUpdate(args) {
      var method = 'findOneAndUpdate';
      if (typeof (args.options || {}).returnDocument === 'undefined') {
        args.options.returnDocument = "after";
      }
      if (args.options.replaceOne | args.options.replace) {
        method = 'findOneAndReplace';
      }
      return args.col[method](args.query, args.update, args.options).then(function (doc) {
        if (doc && typeof doc.value !== 'undefined') {
          return doc.value;
        }
        if (doc.ok && doc.lastErrorObject && doc.lastErrorObject.n === 0) {
          return null;
        }
        return doc;
      });
    })({
      options: opts,
      query: query,
      update: update,
      callback: fn
    }, 'findOneAndUpdate');
  }
  indexes(fn) {
    return this._dispatch(function indexes(args) {
      return args.col.indexInformation();
    })({
      callback: fn
    }, 'indexes');
  }
  insert(data, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(function insert(args) {
      var arrayInsert = Array.isArray(args.data);
      if (arrayInsert && args.data.length === 0) {
        return Promise.resolve([]);
      }
      const insertop = arrayInsert ? args.col.insertMany(args.data, args.options) : args.col.insertOne(args.data, args.options);
      return insertop.then(function (result) {
        if (arrayInsert) {
          return args.data.map((doc, i) => {
            return {
              _id: result.insertedIds[i],
              ...doc
            };
          });
        } else {
          const doc = {
            _id: result.insertedId,
            ...args.data
          };
          return doc;
        }
      });
    })({
      data: data,
      options: opts,
      callback: fn
    }, 'insert');
  }
  remove(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(function remove(args) {
      var options = args.options || {};
      var method = options.single || options.multi === false ? 'deleteOne' : 'deleteMany';
      return args.col[method](args.query, args.options);
    })({
      query: query,
      options: opts,
      callback: fn
    }, 'remove');
  }
  update(query, update, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    return this._dispatch(function update(args) {
      var options = args.options || {};
      var method = options.multi || options.single === false ? 'updateMany' : 'updateOne';
      if (options.replace || options.replaceOne) {
        if (options.multi || options.single === false) {
          throw new Error('The `replace` option is only available for single updates.');
        }
        method = 'replaceOne';
      }
      return args.col[method](args.query, args.update, args.options);
    })({
      update: update,
      query: query,
      options: opts,
      callback: fn
    }, 'update');
  }
  index(...args) {
    return this.createIndex(...args);
  }
}

/**
 * Casts to objectid
 *
 * @param {Mixed} str - hex id or ObjectId
 * @return {ObjectId}
 * @api public
 */

function id$1(str) {
  if (str == null) return mongo__default["default"].ObjectId();
  return typeof str === 'string' ? mongo__default["default"].ObjectId.createFromHexString(str) : str;
}

/**
 * Applies ObjectId casting to _id fields.
 *
 * @param {Object} optional, query
 * @return {Object} query
 * @private
 */

function cast(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cast);
  }
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(function (k) {
      if (k === '_id' && obj._id) {
        if (obj._id.$in) {
          obj._id.$in = obj._id.$in.map(id$1);
        } else if (obj._id.$nin) {
          obj._id.$nin = obj._id.$nin.map(id$1);
        } else if (obj._id.$ne) {
          obj._id.$ne = id$1(obj._id.$ne);
        } else {
          obj._id = id$1(obj._id);
        }
      } else {
        obj[k] = cast(obj[k]);
      }
    });
  }
  return obj;
}
var helpers = {
  id: id$1,
  cast
};

var monkMiddlewareQuery = function queryMiddleware (context) {
  return function (next) {
    return function (args, method) {
      if (!args.query) {
        return next(args, method)
      }

      if (typeof args.query === 'string' || typeof args.query.toHexString === 'function') {
        args.query = {_id: args.query};
      }

      return next(args, method)
    }
  }
};

function fields (obj, numberWhenMinus) {
  if (!Array.isArray(obj) && typeof obj === 'object') {
    return obj
  }

  var fields = {};
  obj = typeof obj === 'string' ? obj.split(' ') : (obj || []);

  for (var i = 0, l = obj.length; i < l; i++) {
    if (obj[i][0] === '-') {
      fields[obj[i].substr(1)] = numberWhenMinus;
    } else {
      fields[obj[i]] = 1;
    }
  }

  return fields
}

var monkMiddlewareOptions = function optionsMiddleware (context) {
  return function (next) {
    return function (args, method) {
      var collection = context.collection;
      if (typeof args.options === 'string' || Array.isArray(args.options)) {
        args.options = { fields: fields(args.options) };
        return next(args, method)
      }
      args.options = args.options || {};
      if (args.options.fields) {
        args.options.fields = fields(args.options.fields, 0);
      }
      if (args.options.sort) {
        args.options.sort = fields(args.options.sort, -1);
      }

      for (var j in collection.options) {
        if (!(j in args.options)) {
          args.options[j] = collection.options[j];
        }
      }
      return next(args, method)
    }
  }
};

var monkMiddlewareCastIds = function castIdsMiddleware (fieldsToCast) {
  return function (context) {
    return function (next) {
      return function (args, method) {
        if ((args.options || {}).castIds === false) {
          delete args.options.castIds;
          return next(args, method)
        }

        if ((args.options || {}).castIds) {
          delete args.options.castIds;
        }

        fieldsToCast.forEach(function (k) {
          if (args[k]) {
            args[k] = context.monkInstance.cast(args[k]);
          }
        });

        return next(args, method)
      }
    }
  }
};

var monkMiddlewareFields = function fieldsMiddleware (context) {
  return function (next) {
    return function (args, method) {
      if (!args.fields) {
        return next(args, method)
      }

      if (!Array.isArray(args.fields) && typeof args.fields === 'object') {
        return next(args, method)
      }

      var fields = {};
      args.fields = typeof args.fields === 'string' ? args.fields.split(' ') : (args.fields || []);

      for (var i = 0, l = args.fields.length; i < l; i++) {
        fields[args.fields[i]] = 1;
      }

      args.fields = fields;
      return next(args, method)
    }
  }
};

function thenFn (fn) {
  return function (res) {
    if (fn && typeof fn === 'function') {
      setTimeout(fn, 0, null, res);
    }
    return res
  }
}

function catchFn (fn) {
  return function (err) {
    if (fn && typeof fn === 'function') {
      setTimeout(fn, 0, err);
      return
    }
    throw err
  }
}

var monkMiddlewareHandleCallback = function handleCallback (context) {
  return function (next) {
    return function (args, method) {
      return next(args, method).then(thenFn(args.callback)).catch(catchFn(args.callback))
    }
  }
};

var monkMiddlewareWaitForConnection = function waitForConnection (context) {
  return function (next) {
    return function (args, method) {
      return context.monkInstance.executeWhenOpened().then(function (db) {
        return db.collection(context.collection.name)
      }).then(function (col) {
        args.col = col;
        return next(args, method)
      })
    }
  }
};

var monkDebug = Debug__default["default"]("monk:manager");
var MongoClient = mongo__default["default"].MongoClient;
var STATE = {
  CLOSED: "closed",
  OPENING: "opening",
  OPEN: "open"
};
var FIELDS_TO_CAST = ["operations", "query", "data", "update"];
var DEFAULT_OPTIONS = {
  castIds: true,
  middlewares: [monkMiddlewareQuery, monkMiddlewareOptions, monkMiddlewareCastIds(FIELDS_TO_CAST), monkMiddlewareFields, monkMiddlewareHandleCallback, monkMiddlewareWaitForConnection]
};

/**
 * Monk constructor.
 *
 * @param {Array|String} uri replica sets can be an array or
 * comma-separated
 * @param {Object|Function} opts or connect callback
 * @return {Promise} resolve when the connection is opened
 */

class Manager extends events.EventEmitter {
  constructor(uri, opts, fn) {
    super();
    if (!uri) {
      throw Error("No connection URI provided.");
    }
    if (typeof opts === "function") {
      fn = opts;
      opts = {};
    }
    opts = opts || {};
    if (!opts.hasOwnProperty("useNewUrlParser")) {
      opts.useNewUrlParser = true;
    }
    if (!opts.hasOwnProperty("useUnifiedTopology")) {
      opts.useUnifiedTopology = true;
    }
    this._collectionOptions = objectAssign__default["default"]({}, DEFAULT_OPTIONS, opts.collectionOptions || {});
    this._collectionOptions.middlewares = this._collectionOptions.middlewares.slice(0);
    delete opts.collectionOptions;
    if (Array.isArray(uri)) {
      if (!opts.database) {
        for (var i = 0, l = uri.length; i < l; i++) {
          if (!opts.database) {
            opts.database = uri[i].replace(/([^/])+\/?/, "");
          }
          uri[i] = uri[i].replace(/\/.*/, "");
        }
      }
      uri = uri.join(",") + "/" + opts.database;
      monkDebug('repl set connection "%j" to database "%s"', uri, opts.database);
    }
    if (typeof uri === "string") {
      if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
        uri = "mongodb://" + uri;
      }
    }
    this._state = STATE.OPENING;
    this.emit("opening");
    this._queue = [];
    this.on("open", db => {
      monkDebug("connection opened");
      monkDebug("emptying queries queue (%s to go)", this._queue.length);
      this._queue.forEach(function (cb) {
        cb(db);
      });
      this._queue = [];
    });
    this._connectionURI = uri;
    this._connectionOptions = opts;
    this.open(uri, opts, fn && function (err) {
      fn(err, this);
    }.bind(this));
    this.helper = {
      id: mongo__default["default"].ObjectId
    };
    this.collections = {};
  }
  /**
   * Then
   *
   * @param {Function} [fn] - callback
   */
  then(fn) {
    return new Promise(function (resolve, reject) {
      this.once("open", resolve);
      this.once("error-opening", reject);
    }.bind(this)).then(fn.bind(null, this));
  }
  /**
   * Catch
   *
   * @param {Function} [fn] - callback
   */
  catch(fn) {
    return new Promise(function (resolve) {
      this.once("error-opening", resolve);
    }.bind(this)).then(fn.bind(null));
  }
  /**
   * Lists all collections.
   *
   * @param {Object} [query] - A query expression to filter the list of collections.
   * @return {Array} array of all collections
   */
  async listCollections(query) {
    const db = await this.executeWhenOpened();
    const cols = await db.listCollections(query).toArray();
    return cols.map(x => this.get(x).name);
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
    this.executeWhenOpened().then(function (db) {
      db.createCollection(name, creationOptions);
    }).catch(function (err) {
      this.emit("error", err);
    });
    return this.get(name, options);
  }

  /**
   * Open the connection
   * @private
   */
  async open(uri, opts, fn) {
    let err;
    try {
      const client = await MongoClient.connect(uri, opts);
      this._state = STATE.OPEN;
      this._client = client;
      this._db = client.db();

      // set up events
      // ;['authenticated', 'close', 'error', 'fullsetup', 'parseError', 'reconnect', 'timeout'].forEach((eventName) => {
      //   this._db.on(eventName, (e) => {
      //     this.emit(eventName, e)
      //   })
      // })
      this.on("reconnect", () => {
        this._state = STATE.OPEN;
      });
      this.emit("open", this._db);
      this.emit("reconnect", this._db);
    } catch (error) {
      this._state = STATE.CLOSED;
      this.emit("error-opening", error);
      this.emit("error", error);
      err = error;
    }
    if (fn) {
      const warn = new Error("DEPRECATED (manager.open) call back function is deprecated, please use the promise interface");
      console.warn(warn);
      fn(err, this);
    }
  }

  /**
   * Execute when connection opened.
   * @private
   */

  executeWhenOpened() {
    return new Promise(resolve => {
      switch (this._state) {
        case STATE.OPEN:
          return resolve(this._db);
        case STATE.OPENING:
          this._queue.push(resolve);
          break;
        case STATE.CLOSED:
        default:
          this._queue.push(resolve);
          this.open(this._connectionURI, this._connectionOptions);
      }
    });
  }

  /**
   * Closes the connection.
   *
   * @param {Boolean} [force] - Force close, emitting no events
   * @return {Promise}
   */

  close(force, fn) {
    if (typeof force === "function") {
      fn = force;
      force = false;
    }
    if (typeof fn === "function") {
      const warn = new Error("DEPRECATED (manager.close) call back function is deprecated, please use the promise interface");
      console.warn(warn);
    }
    const closeClient = resolve => {
      this._client.close(force, () => {
        this._state = STATE.CLOSED;
        if (fn) {
          fn();
        }
        this.emit("close");
        resolve();
      });
    };
    return new Promise(resolve => {
      switch (this._state) {
        case STATE.CLOSED:
          if (fn) {
            fn();
          }
          return resolve();
        case STATE.OPENING:
          this._queue.push(function () {
            closeClient(resolve);
          });
          break;
        case STATE.OPEN:
        default:
          closeClient(resolve);
      }
    });
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
      delete (options || {}).cache;
      this.collections[name] = new Collection(this, name, objectAssign__default["default"]({}, this._collectionOptions || {}, options || {}));
    }
    return this.collections[name];
  }
  setDefaultCollectionOptions(options) {
    this._collectionOptions = options;
  }
  addMiddleware(middleware) {
    if (!this._collectionOptions) {
      this._collectionOptions = {};
    }
    if (!this._collectionOptions.middlewares) {
      this._collectionOptions.middlewares = [];
    }
    this._collectionOptions.middlewares.push(middleware);
  }

  /**
   * Add some helpers
   */
  col(...args) {
    return this.get(...args);
  }
  static oid(...args) {
    return helpers.id(...args);
  }
  oid(...args) {
    return helpers.id(...args);
  }
  static id(...args) {
    return helpers.id(...args);
  }
  id(...args) {
    return helpers.id(...args);
  }
  static cast(...args) {
    return helpers.cast(...args);
  }
  cast(...args) {
    return helpers.cast(...args);
  }
}

/*
 * support for calling monk() directly
 */

const monk = function (...args) {
  return new Manager(...args);
};
monk.id = helpers.id;
monk.cast = helpers.cast;

const id = helpers.id;

exports.Collection = Collection;
exports["default"] = monk;
exports.helpers = helpers;
exports.id = id;
exports.manager = monk;
//# sourceMappingURL=monk.cjs.map
