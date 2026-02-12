/**
 * Connect - SQLite3
 * Copyright(c) 2012 David Feinberg
 * MIT Licensed
 * forked from https://github.com/tnantoka/connect-sqlite
 */

/**
 * Module dependencies.
 */
var events = require('events');

/**
 * @type {Integer}  One day in milliseconds.
 */
var oneDay = 86400000;

/**
 * Return the SQLiteStore extending connect's session Store.
 *
 * @param   {object}    connect
 * @return  {Function}
 * @api     public
 */
module.exports = function(connect) {
    /**
     * Connect's Store.
     */
    var Store = (connect.session) ? connect.session.Store : connect.Store;

    /**
     * Remove expired sessions from database.
     * @param   {Object}    store
     * @api     private
     */
    function dbCleanup(store) {
        var now = new Date().getTime();
        try {
            store.db.prepare(`DELETE FROM ${store.table} WHERE ? > expires`).run(now);
        } catch (e) {
            // prevent unhandled errors from setInterval crashing the process
        }
    }

    /**
     * Initialize SQLiteStore with the given options.
     *
     * @param   {Object}    options
     * @api     public
     */
    function SQLiteStore(options) {
        options = options || {};
        Store.call(this, options);

        this.table = options.table || 'server_sessions';
        this.db = options.db;
        this.client = new events.EventEmitter();
        var self = this;

        this.db.exec(`${options.concurrentDb ? 'PRAGMA journal_mode = wal; ' : ''}CREATE TABLE IF NOT EXISTS ${this.table} (session_id PRIMARY KEY, expires, data)`);

        this.client.emit('connect');
        dbCleanup(self);
        setInterval(dbCleanup, oneDay, self).unref();
    }

    /**
     * Inherit from Store.
     */
    SQLiteStore.prototype = Object.create(Store.prototype);
    SQLiteStore.prototype.constructor = SQLiteStore;

    /**
     * Attempt to fetch session by the given session_id.
     *
     * @param   {String}    sessionId
     * @param   {Function}  fn
     * @api     public
     */
    SQLiteStore.prototype.get = function(sessionId, fn) {
        var result;
        try {
            var now = new Date().getTime();
            var row = this.db.prepare(`SELECT data FROM ${this.table} WHERE session_id = ? AND ? <= expires`).get(sessionId, now);
            if (row) result = JSON.parse(row.data);
        } catch (e) {
            return fn(e);
        }
        if (result === undefined) return fn(null);
        fn(null, result);
    };

    /**
     * Commit the given `sess` object associated with the given `sessionId`.
     *
     * @param   {String}    sessionId
     * @param   {Session}   sess
     * @param   {Function}  fn
     * @api     public
     */
    SQLiteStore.prototype.set = function(sessionId, sess, fn) {
        try {
            var maxAge = sess.cookie.maxAge;
            var now = new Date().getTime();
            var expired = maxAge ? now + maxAge : now + oneDay;
            sess = JSON.stringify(sess);

            this.db.prepare(`INSERT OR REPLACE INTO ${this.table} VALUES (?, ?, ?)`).run(sessionId, expired, sess);
        } catch (e) {
            if (fn) fn(e);
            return;
        }
        if (fn) fn(null);
    };

    /**
     * Destroy the session associated with the given `sessionId`.
     *
     * @param   {String}    sessionId
     * @api     public
     */
    SQLiteStore.prototype.destroy = function(sessionId, fn) {
        try {
            this.db.prepare(`DELETE FROM ${this.table} WHERE session_id = ?`).run(sessionId);
        } catch (e) {
            if (fn) fn(e);
            return;
        }
        if (fn) fn(null);
    };

    /**
     * Fetch all sessions.
     *
     * @param   {Function}  fn
     * @api     public
     */
    SQLiteStore.prototype.all = function(fn) {
        var result;
        try {
            var rows = this.db.prepare(`SELECT * FROM ${this.table}`).all();
            result = rows.map((row) => JSON.parse(row.data));
        } catch (e) {
            return fn(e);
        }
        fn(null, result);
    };

    /**
     * Fetch number of sessions.
     *
     * @param   {Function}  fn
     * @api     public
     */
    SQLiteStore.prototype.length = function(fn) {
        var result;
        try {
            var row = this.db.prepare(`SELECT COUNT(*) AS count FROM ${this.table}`).get();
            result = row.count;
        } catch (e) {
            return fn(e);
        }
        fn(null, result);
    };

    /**
     * Clear all sessions.
     *
     * @param   {Function}  fn
     * @api     public
     */
    SQLiteStore.prototype.clear = function(fn) {
        try {
            this.db.exec(`DELETE FROM ${this.table}`);
        } catch (e) {
            return fn(e);
        }
        fn(null, true);
    };

    /**
     * Touch the given session object associated with the given session ID.
     *
     * @param   {string}    sessionId
     * @param   {object}    session
     * @param   {function}  fn
     * @public
     */
    SQLiteStore.prototype.touch = function(sessionId, session, fn) {
        if (session && session.cookie && session.cookie.expires) {
            var now = new Date().getTime();
            var cookieExpires = new Date(session.cookie.expires).getTime();
            try {
                this.db.prepare(`UPDATE ${this.table} SET expires=? WHERE session_id = ? AND ? <= expires`).run(cookieExpires, sessionId, now);
            } catch (e) {
                if (fn) fn(e);
                return;
            }
        }
        if (fn) fn(null, true);
    }

    return SQLiteStore;
};
