# monk-middleware-debug (local version)

A Monk middleware for logging queries and results using the `debug` package. Compatible with MongoDB driver v6+ and MongoDB 8.x.

## Usage

Add this middleware to your Monk instance:

```js
const debugMiddleware = require('../middlewares/debug');

const monk = require('monk');
const db = monk(uri, {
  collectionOptions: {
    middlewares: [
      debugMiddleware,
      // ...other middlewares
    ]
  }
});
```

This will log queries and results to the `monk:query` and `monk:result` debug namespaces.

## Note
- This middleware does **not** use the removed MongoDB Logger API.
- Enable debug output by setting the `DEBUG=monk:*` environment variable.
