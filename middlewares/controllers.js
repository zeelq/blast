var fs = require('fs');
var path = require('path');
var utils = require('../lib/utils');
var pathToRegexp = require('path-to-regexp');

function decode(val) {
    if (val) {
        return decodeURIComponent(val);
    }
}

var urls = {
    '/favicon.ico': [function *() {
        var app = this.app;
        var favicon = app.settings.static.favicon;
        this.type = 'image/x-icon';
        this.body = yield fs.readFile.bind(null, favicon);
    }]
};

module.exports = function(app) {
    var settings = app.settings;
    var controllers = settings.controllers;
    var routers = fs.readdirSync(controllers.path);
    var counter = 0;

    routers.forEach(function(value, key) {
        var f = path.join(controllers.path, value);
        var stat = fs.statSync(f);

        if (stat.isFile() && value.slice(-3) !== '.js') return;

        var R;
        try {
            R = new (require(f))(app);
        } catch (e) {
            console.log((e + ' the router ' + f + ' was ignored').red);
            R = {};
        }

        if (value === 'index.js') {
            for (var p in R) {
                if (R.hasOwnProperty(p)) {
                    var _ = (p === 'index' || p === '/') ? '' : p;
                    (urls['/' + _] = urls['/' + _] || []).push(R[p]);
                    counter ++;
                }
            }
        } else {
            var filename = value.slice(0, -3);
            for (var p in R) {
                if (R.hasOwnProperty(p)) {
                    var _ = (p === 'index' || p === '/') ? '' : '/' + p;
                    (urls['/' + filename + _] = urls['/' + filename + _] || []).push(R[p]);
                    counter ++;
                }
            }
        }
    });

    var middlewares = null;

    try {
        middlewares = require(settings.middlewares);
    } catch (e) {
        middlewares = function() {};
    }

    var mws = new middlewares(app);

    for (var p in middlewares) {
        var paths = middlewares[p];
        if (paths === '*') {
            for (var u in urls) {
                if (urls.hasOwnProperty(u) && u !== '/favicon.ico') {
                    urls[u].unshift(mws[p]);
                }
            }
        } else if (utils.isType('array', paths)) {
            if (p.indexOf('!') === 0) {
                for (var u in urls) {
                    if (urls.hasOwnProperty(u) && !~paths.indexOf(u) && u !== '/favicon.ico') {
                        urls[u].unshift(mws[p]);
                    }
                }
            } else {
                for (var u = 0, length = paths.length; u < length; u++) {
                    (urls[paths[u]] = urls[paths[u]] || []).unshift(mws[p]);
                }
            }
        }
    }

    return counter ? 
        function *router(next) {
            var m = null;
            var notFound = true;
            var ctx = this;

            for (var r in urls) {
                var pattern = pathToRegexp(r);

                if (m = pattern.exec(this.path)) {
                    var args = m.slice(1).map(decode);
                    var fns = urls[r];
                    var length = fns.length;

                    for (var i = 0; i < length; i++) {
                        (function(idx) {
                            setImmediate(function() {
                                var fn = fns[idx];
                                try {
                                    fn.apply(ctx, args);
                                } catch(e) {
                                    //console.log('->', e);
                                    ctx.status = 500;
                                    ctx.type = 'html';
                                    ctx.end(e.toString());
                                    // TODO:
                                    // custom 500 page
                                }
                            });
                        })(i);
                    }
                    notFound = false;
                    break;
                }
            }

            if (notFound) {
                // TODO:
                // custom 404 page
                this.status = 404;
            }
            yield next;

        } : function *welcome(next) {
            this.set('Content-Type', 'text/html');
            this.body = yield fs.readFile.bind(null, path.join(__dirname, '../views/welcome.html'));
            yield next;
        }
};
