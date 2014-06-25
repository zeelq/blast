var fs = require('fs');
var path = require('path');
var assert = require('assert');
var mkdirp = require('mkdirp');
var utils = require('./utils');
var colors = require('colors');

var templateCaches = {};

// 预编译所有模板
function compileAllTemplate(engine, config) {
    var source = config.path;
    var target = config.cache;
    var ext = '.' + config.engine.ext;
    var compileMethod = config.engine.compile;
    var rs = [];

    function walkDir(dir) {
        var files = fs.readdirSync(dir);

        files.forEach(function(v, k) {
            var f = path.join(dir, v);
            var stat = fs.statSync(f);

            stat.isDirectory() ? 
                v.indexOf('.') !== 0 && walkDir(f) :
                path.extname(f) === ext && rs.push(f);
        });
    }

    // 获取所有模版
    walkDir(source);

    rs.forEach(function(v, k) {
        compileTemplate(engine, compileMethod, v, config);
    });
}

// 编译模板
function compileTemplate(engine, method, file, config) {
    var source = config.path;
    var target = config.cache;
    var ext = '.' + config.engine.ext;

    var basename = path.basename(file);
    var extname = path.extname(basename);
    var dir = path.join(target, file.slice(source.length + 1, -basename.length));
    
    var tmf = templateCaches[file] || templateCaches[file + ext];

    // 先从 templateCaches 中取
    // 取不到则先编译，然后返回
    if (tmf) { return tmf; }

    // 建立缓存目录
    if (!fs.existsSync(dir)) {
        mkdirp.sync(dir);
        fs.chmodSync(dir, '0777');
    }

    // 读取
    var html = '';
    var cacheFile = '';
    try {
        html = fs.readFileSync(file + ext, {'encoding': 'utf8'});
        cacheFile = path.join(dir, basename + ext);
    } catch(e) {
        try {
            html = fs.readFileSync(file, {'encoding': 'utf8'});
            cacheFile = path.join(dir, basename);
        } catch(e) {
            console.log(e);
            throw new Error(file + ext + ' or ' + file + ' does not exists!');
        }
    }

    var js = '';

    try {
        js = engine[method](html).toString();
    } catch(e) {
        js = 'function(){}';
        console.log(e);
        throw new Error(e);
    }

    js = 'module.exports=' + js;

    try {
        fs.writeFileSync(cacheFile, js, {'encoding': 'utf8'});
        fs.chmodSync(cacheFile, '0777');
    } catch (e) {
        console.log(e);
        throw new Error(e);
    }

    try {
        tmf = templateCaches[file] = require(cacheFile);
    } catch (e) {
        console.log(e);
        throw new Error(e);
    }

    console.log(('Cache the template to ' + cacheFile + ' successful!').green);
    return tmf;
}

module.exports = function(config) {
    // 导入模板引擎
    var engine = require(config.engine.name);
    var compileMethod = config.engine.compile;
    var configure = config.engine.configure;

    utils.isType('function', configure) && configure.call(this);

    // 预先编译所有模板
    console.log('=================== compile template start ===================');
    compileAllTemplate(engine, config);
    console.log('=================== compile template end ===================');

    return {
        // 添加一个 pipe
        use: function() {
            var obj = arguments[0];
            var method = obj[arguments[1]];
            var argslen = arguments.length;
            var args = Array.prototype.slice.call(arguments, 2, -1);
            var callback = arguments[argslen - 1];
            var ctx = this;


            assert(arguments.length > 2, 'app.use() requires at least 3 arugmnets');
            assert(utils.isType('function', method), 
                    'app.use() requires the first and the second argument must be an Object, and one method name of it');

            assert(utils.isType('function', callback), 'app.use() last argument requires a function');

            // pagelet计数
            this._taskCounter = this._taskCounter || 0;
            this._taskCounter ++;

            this.respond = false;

            // 开启 bigpipe
            this._chunked = true;

            args.push(function(err) {
                ctx._taskCounter --;
                if (err) {
                    console.log(err);
                    ctx.status = 500;
                    callback.call(ctx, err);
                    !ctx._taskCounter && ctx.end();
                    return this;
                }

                var res = Array.prototype.slice.call(arguments, 1);

                res.unshift(null);
                try {
                    callback.apply(ctx, res);
                } catch(e) {
                    console.log(e);
                }
                !ctx._taskCounter && ctx.end();
            });

            setImmediate(function () {
                method.apply(obj, args);
            });
        },

        // 解析模板
        transform: function(view, data) {
            // 无参数， 返回空字符串
            if (!view && !data) {
                return '';
            // 只有 data, 直接返回 json 格式的字符串
            } else if(!view && data) {
                try {
                    return JSON.stringify(data);
                } catch(e) {
                    return 'PARSE JSON ERROR';
                }
            }

            data = data || {};
            var f = view.indexOf('/') === 0 ? view : path.join(config.path, view);
            var tmf = compileTemplate(engine, compileMethod, f, config);
            return tmf(data);
        },

        // 渲染 pipe 片段
        pagelet: function(view, data, options) {
            // this._chunked 为 false， 则不开启 bigpipe
            if (!this._chunked) {return this;}

            var app = this.app;
            var headerSent = this.headerSent;
            var hasSetType = !!this.type;

            this.pageletData = this.pageletData || {};

            var LOCALS = this.LOCALS;

            switch (arguments.length) {
                case 2:
                    if (!utils.isType('string', view)) {
                        options = data;
                        data = view || {};
                        view = '';
                    } else {
                        options = data;
                        data = {
                            LOCALS: LOCALS
                        };
                    }
                    break;
                case 3:
                    data = data || {};
                    break;

                default:
                    this.end();
                    return this;
            }

            if (view) {
                var html = this.transform(view, data);
                if (this._chunked) {
                    var o = {
                        section: options.section,
                        html: html
                    };
                    var script = '<script>' +
                        '_PIPE_.emit("arrive",' + JSON.stringify(o) + ' )' +
                        '</script>';
                }
                this.write(script);
            } else {
                !headerSent && !hasSetType && (this.type = 'json');
                this.pageletData[options.section] = data;

                if (!this._taskCounter) {
                    var json = this.transform('', this.pageletData);
                    this.write(json);
                    delete this.pageletData;
                }
            }
            return this;
        },

        render: function(view, data) {
            var app = this.app;
            var headerSent = this.headerSent;
            var hasSetType = !!this.type;

            var LOCALS = this.LOCALS;

            switch (arguments.length) {
                case 0:
                    return this.body = '';
                    break;
                case 1:
                    if (!utils.isType('string', view)) {
                        data = view || {};
                        view = '';
                    } else {
                        data = {
                            LOCALS: LOCALS
                        };
                    }
                    break;
                case 2:
                    if (!utils.isType('string', view)) {
                        data = view || {};
                        view = '';
                    } else {
                        data = data || {};
                        data.LOCALS = LOCALS;
                    }
                    break;
            }

            if (view) {
                var html = this.transform(view, data);
                if (this._chunked) {
                    !headerSent && !hasSetType && (this.type = 'html');
                    var bigpipeScript = require('./fe-bigpipe').toString();
                    var script = '<script> var _PIPE_ = ' + bigpipeScript + '()</script>';
                    this.write(html);
                    this.write(script);
                } else {
                    this.body = html;
                }
            } else {
                !headerSent && !hasSetType && (this.type = 'html');
                if (!this._chunked) {
                    this.body = data;
                } else {
                    this.pageletData = data;
                }
            }
            return this;
        }
    };
};
