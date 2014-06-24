var fs = require('fs');
var path = require('path');
var pathToRegexp = require('path-to-regexp');

function decode(val) {
    if (val) {
        return decodeURIComponent(val);
    }
}

var urls = {
    '/favicon.ico': function *() {
        var app = this.app;
        var favicon = app.settings.static.favicon;
        this.type = 'image/x-icon';
        this.body = yield fs.readFile.bind(null, favicon);
    }
};

module.exports = function(app) {
    var controllers = app.settings.controllers;
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
                var _ = (p === 'index' || p === '/') ? '' : p;
                urls['/' + _] = R[p];
                counter ++;
            }
        } else {
            var filename = value.slice(0, -3);
            for (var p in R) {
                var _ = (p === 'index' || p === '/') ? '' : '/' + p;
                urls['/' + filename + _] = R[p];
                counter ++;
            }
        }
    });

    return counter ? 
        function *router(next) {
            var m = null;
            var notFound = true;

            for (var r in urls) {
                var pattern = pathToRegexp(r);

                if (m = pattern.exec(this.path)) {
                    var args = m.slice(1).map(decode);
                    var fn = urls[r];

                    try {
                        yield fn.apply(this, args);
                    } catch (e) {
                        console.log(e);
                        this.status = 500;
                        // TODO:
                        // custom 500 page
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
