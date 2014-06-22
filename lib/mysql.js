var mysql = require('mysql');
var utils = require('./utils');

function Mysql(config, pool) {
    var connection = pool ?
        mysql.createPool(config) : mysql.createConnection(config);

    var query = connection.query;

    connection.query = function(sql, val, cb) {
        connection.connect()
        return query.call(connection, sql, val, cb);
    };

    return connection;
}

module.exports = Mysql;
