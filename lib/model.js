var path = require('path');
var utils = require('./utils');
var caminte = require('caminte');
var Schema = caminte.Schema;
var CONNECTS = {};
var MODELS = {};

module.exports = function(app) {
    // create connect
    var settings = app.settings;
    var models = settings.models;

    for (var i in models) {
        var m = models[i];
        try {
            CONNECTS[i] = new Schema(m.driver, m);
        } catch (e) {
            console.log('Connect database error: '.red + (e + '').red);
        }
    }

    app.import = function(mod) {
        var results = {};
        if (mod.indexOf('/') !== 0) {
            mod = path.join(settings.dir, mod);
        }

        try {
            var mod = require(mod);
            var name = mod.name;
            var schema = CONNECTS[name];

            if (!name || !schema) {
                throw new Error('Can\' found available connection');
            }

            var tables = null;
            try {
                tables = new mod(schema);
            } catch(e) {
                tables = {};
            }

            for (var t in tables) {
                var n = name + '.' + t;
                var table = MODELS[n];

                if (!table) {
                    var fields = tables[t];
                    var __setter__ = fields['__setter__'];
                    delete fields['__setter__'];
                    table = schema.define(t, fields);
                    utils.isType('function', __setter__) && __setter__.call(table, schema);
                    schema.autoupdate();
                }
                results[t] = table
            }

        } catch (e) {
            console.log(e.toString().red);
        }
        return results;
    };
};
