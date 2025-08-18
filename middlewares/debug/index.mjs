import Debug from 'debug'

// Usage: add this middleware to Monk to log queries and results
export default function debugMiddleware(context) {
  const debugQuery = Debug('monk:query')
  const debugResult = Debug('monk:result')
  return function (next) {
    return function (args, method) {
      debugQuery('%s: %j', method, args)
      return next(args, method).then(function (res) {
        debugResult('%s: %j', method, res)
        return res
      })
    }
  }
}
