# Connect SQLite3

connect-sqlite3 is a SQLite3 session store modeled after the TJ's connect-redis store.

> **Requires Node.js >= 22.5.0** — uses the built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) module (`DatabaseSync`). No native addons needed.

> **Note:** `node:sqlite` is currently experimental in Node.js and may emit a warning on startup.

## Installation
```sh
	  $ npm install connect-sqlite3
```

## Options

  - `table='server_sessions'` Database table name
  - `db=dbConnection` A `DatabaseSync` instance from `node:sqlite`
  - `concurrentDB='false'` Enables [WAL](https://www.sqlite.org/wal.html) mode (defaults to false)

> **Note:** The `options` parameter requires an already initialized database connection instead of a file name. This design allows the library to remain flexible about database connection management in your application.

## Usage
```js
    var connect = require('connect'),
        { DatabaseSync } = require('node:sqlite'),
        dbConnection = new DatabaseSync(':memory:'),
        SQLiteStore = require('connect-sqlite3')(connect);

    connect.createServer(
      connect.cookieParser(),
      connect.session({ store: new SQLiteStore({ db: dbConnection }), secret: 'your secret' })
    );
```
  with express 4.x:
```js
    var session = require('express-session');
    var { DatabaseSync } = require('node:sqlite');
    var SQLiteStore = require('connect-sqlite3')(session);

    var dbConnection = new DatabaseSync('./sessions.db');
    app.use(session({
      store: new SQLiteStore({ db: dbConnection }),
      secret: 'your secret',
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
    }));
```
## Test
```sh
    $ npm test
```
