var should = require('should'),
    session = require('express-session'),
    { DatabaseSync } = require('node:sqlite'),
    SQLiteStore = require('../lib/connect-sqlite3.js')(session);

const testSuite = function() {
    it('it should save a new session record', function(done) {
        this.memStore.set('1111222233334444', {cookie: {maxAge:2000}, name: 'sample name'}, function(err, rows) {
            should.not.exist(err, 'set() returned an error');
            should.not.exist(rows);
            done();
        });
    });

    it('it should overwrite an existing session record', function(done) {
        this.memStore.set('1111222233334444', {cookie: {maxAge:2001}, name: 'sample name 2'}, function(err, rows) {
            should.not.exist(err, 'set() returned an error');
            should.not.exist(rows);
            done();
        });
    });

    it('it should retrieve an active session', function(done) {
        this.memStore.get('1111222233334444', function(err, session) {
            should.not.exist(err, 'get() returned an error');
            should.exist(session);
            (session).should.eql({cookie: {maxAge:2001}, name: 'sample name 2'}, 'get() returned wrong session data');
            done();
        });
    });

    it('it should gracefully handle retrieving an unkonwn session', function(done) {
        this.memStore.get('hope-and-change', function(err, rows) {
            should.not.exist(err, 'get() unknown session returned an error');
            should.equal(undefined, rows, 'unknown session is not undefined');
            done();
        });
    });

    it('it should only contain one session', function(done) {
        this.memStore.length(function(err, len) {
            should.not.exist(err, 'session count returned an error');
            should.exist(len);
            len.should.equal(1);
            done();
        });
    });

    it('it should clear all session records', function(done) {
        var that = this;
        this.memStore.clear(function(err, success) {
            should.not.exist(err, 'clear returned an error');
            success.should.be.true;

            that.memStore.length(function(err, len) {
                should.not.exist(err, 'session count after clear returned an error');
                should.exist(len);
                len.should.equal(0);
                done();
            });
        });
    });

    it('it should destroy a session', function(done) {
        var that = this;
        this.memStore.set('555666777', {cookie: {maxAge:1000}, name: 'Rob Dobilina'}, function(err, rows) {
            should.not.exist(err, 'set() returned an error');
            should.not.exist(rows);

            that.memStore.destroy('555666777', function(err) {
                should.not.exist(err, 'destroy returned an error');

                that.memStore.length(function(err, len) {
                    should.not.exist(err, 'session count after destroy returned an error');
                    should.exist(len);
                    len.should.equal(0);
                    done();
                });
            });
        });
    });
};

describe('connect-sqlite3 basic test suite', function() {
    describe('using db', function() {
        var dbConnection;

        before(function() {
            dbConnection = new DatabaseSync(':memory:');
            this.memStore = new SQLiteStore({db: dbConnection});
        });

        after(function() {
            dbConnection.close();
        });

        testSuite();
    });

    describe('using getDB()', function() {
        var dbConnection;

        before(function() {
            var getDB = function() { return dbConnection; }
            this.memStore = new SQLiteStore({getDB});
        });

        after(function() {
            dbConnection.close();
        });

        it('database should be lazily initialized on first access', function (done) {
            should.not.exist(dbConnection);
            dbConnection = new DatabaseSync(':memory:');
            // First access triggers dbInit via getter
            this.memStore.length(function(err, len) {
                should.not.exist(err);
                len.should.equal(0);
                done();
            });
        });

        testSuite();
    });

    describe('using wrong getDB()', function () {
        it('it should fail when neither db nor getDB() are set', function () {
            (() => { new SQLiteStore(); }).should.throw();
        });

        it('it should fail when getDB is not a function', function () {
            const invalidDB = 'invalid';
            (() => { new SQLiteStore({ getDB: invalidDB }); }).should.throw();
        });

        it('it should fail when getDB does not return a valid DatabaseSync', function (done) {
            const invalidDB = () => {};
            (() => { this.memStore = new SQLiteStore({ getDB: invalidDB }); }).should.not.throw();
            this.memStore.get('1111222233334444', function(err, session) {
                should.exist(err, 'Delayed db retrieval did not return an error');
                done();
            });
        });
    });

    describe('using getDB() with db outage', function() {
        var dbConnection;

        before(function() {
            dbConnection = new DatabaseSync(':memory:');
            var getDB = function() { return dbConnection; }
            this.memStore = new SQLiteStore({getDB});
        });

        after(function() {
            dbConnection.close();
        });

        it('should survive a temporary outage', function(done) {
            var that = this;
            // Write a session to the original db
            this.memStore.set('test', {cookie: {maxAge:2000}, name: 'content'}, function(err) {
                should.not.exist(err, 'set() before returned an error');

                // Simulate outage
                dbConnectionBackup = dbConnection;
                dbConnection = null;

                that.memStore.get('test', function(err, session) {
                    should.exist(err);

                    dbConnection = dbConnectionBackup;

                    // Operations should work again
                    that.memStore.get('test', function(err, session) {
                        should.not.exist(err, 'get() after outage returned an error');
                        should.exist(session);
                        session.name.should.equal('content');
                        done();
                    });
                });
            });
        });
    });
});
