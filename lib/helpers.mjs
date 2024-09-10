import mongo from 'mongodb'


/**
 * Casts to objectid
 *
 * @param {Mixed} str - hex id or ObjectId
 * @return {ObjectId}
 * @api public
 */

export function id (str) {
  if (str == null) return mongo.ObjectId()
  return typeof str === 'string' ? mongo.ObjectId.createFromHexString(str) : str
}

/**
 * Applies ObjectId casting to _id fields.
 *
 * @param {Object} optional, query
 * @return {Object} query
 * @private
 */

export function cast (obj) {
  if (Array.isArray(obj)) {
    return obj.map(cast)
  }

  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(function (k) {
      if (k === '_id' && obj._id) {
        if (obj._id.$in) {
          obj._id.$in = obj._id.$in.map(id)
        } else if (obj._id.$nin) {
          obj._id.$nin = obj._id.$nin.map(id)
        } else if (obj._id.$ne) {
          obj._id.$ne = id(obj._id.$ne)
        } else {
          obj._id = id(obj._id)
        }
      } else {
        obj[k] = cast(obj[k])
      }
    })
  }

  return obj
}

export default {
  id,
  cast
}
