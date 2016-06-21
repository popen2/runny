var logger = require('./logger');
var r = require('rethinkdb');

var db_config = function() {
    return {
        host: process.env.RETHINKDB_PORT_28015_TCP_ADDR || '127.0.0.1',
        port: process.env.RETHINKDB_PORT_28015_TCP_PORT || 28015,
        db: process.env.RETHINKDB_DB || 'runny',
        authKey: process.env.RETHINKDB_AUTH
    };
};

var connect_to_db = function() {
    return r.connect(db_config()).then(db_conn => {
        module.exports.conn = db_conn;
    }).error(err => {
        logger.error('error: Could not connect to database: ' + err);
        process.exit(1);
    });
};

module.exports = {
    conn: null,
    config: db_config,
    connect: connect_to_db
};
