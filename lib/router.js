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

module.exports = function(controller) {
    var routers = fs.readdirSync(controller.path);
    var counter = 0;

    routers.forEach(function(value, key) {
        var f = path.join(controller.path, value);
        var stat = fs.statSync(f);

        if (stat.isFile() && value.slice(-3) !== '.js') return;

        var R;
        try {
            R = require(f);
        } catch (e) {
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
            for (var r in urls) {
                var pattern = pathToRegexp(r);

                if (m = pattern.exec(this.path)) {
                    var args = m.slice(1).map(decode);
                    var fn = urls[r];

                    args.push(next);

                    try {
                        yield fn.apply(this, args);
                    } catch (e) {
                        console.log(e);
                        return this.status = 500;
                    }
                    break;
                }
            }
            yield next;

        } : function *welcome(next) {
            this.set('Content-Type', 'text/html');
            this.body = yield fs.readFile.bind(null, path.join(__dirname, '../view/welcome.html'));
            yield next;
        }
};
