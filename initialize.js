module.exports = function(commander) {

    // import settings
    var fs = require('fs');
    var path = require('path');
    var mkdirp = require('mkdirp');
    var utils = require('./lib/utils');

    var dir = path.resolve(commander.dir);

    // default settings
    this.settings = {
        'dir'   : dir,
        'port'  : 8888,
        'host'  : '0.0.0.0',
        'title' : 'Welcome to Blast',

        'gzip': true,

        'csrf': true,

        // session 配置
        /*
        'session': {
            'keys': ['the blast session keys'],
            'store': {},
            'cookie': {
                'maxAge': 60 * 60 * 1000
            }
        },
        */
        
        // 自定义中间件
        'middlewares': path.join(dir, 'middlewares'),

        // 视图设置
        'views': {
            // 模板文件位置
            'path'      : path.join(dir, 'views'),
            // 模板文件缓存位置
            'cache'     : path.join(dir, 'cache'),
            // 模板引擎
            'engine'    : {
                // 模板引擎名称
                'name'      : 'dot',
                // 模板引擎编译方法
                'compile'   : 'template',
                // 模板后缀
                'ext'       : '.html',
                // 配置模板引擎,如果需要，可以指定一个函数，作为模板引擎对象的一个方法被调用
                'configure': null
            }
        },

        // 控制层(routers)目录
        'controllers': {
            'path': path.join(dir, 'controllers')
        },

        // 静态文件配置
        'static': {
            // 静态文件域名
            'domain': '/',
            // favicon图标位置
            'favicon': path.join(dir, 'favicon.ico')
        },

        // 日志
        'log': {
            // 日志位置
            'path': '/opt/log'
        }
    };

    var settings = require(path.join(dir, 'settings'));
    var environment = commander.environment && require(path.join(dir, commander.environment));
    var custom = commander.custom && require(path.join(dir, commander.custom)) || {};

    settings = utils.mixin(this.settings, settings, environment, custom, true);
    settings.port = commander.port || settings.port;

    this.name = settings.name;
    this.env = commander.environment;

    // cache model
    this.cache = require('./lib/cache/Manage');

    var engine = require(settings.views.engine.name);
    // 执行模板配置方法
    'function' === typeof settings.views.engine.configure && 
        settings.views.engine.configure.call(engine);

    var proto = this.constructor.prototype;
    // 模板编译
    proto.compileTemplate = function(file) {
        var settings = this.settings;
        var viewConfig = settings.views;
        var ext = viewConfig.engine.ext;

        var source = viewConfig.path;
        var target = viewConfig.cache;

        var compileMethod = viewConfig.engine.compile;
        var basename = path.basename(file);
        var extname = path.extname(basename);
        var dir = path.join(target, file.slice(source.length + 1, -basename.length));

        // 建立缓存目录
        if (!fs.existsSync(dir)) {
            mkdirp.sync(dir);
            fs.chmodSync(dir, '0777');
        }

        var html = '';

        // 编译后统一为js文件
        var cacheFile = path.join(dir, basename + '.js');
        try {
            html = fs.readFileSync(file + ext, {'encoding': 'utf8'});
        } catch(e) {
            try {
                html = fs.readFileSync(file, {'encoding': 'utf8'});
            } catch(e) {
                console.log(e);
                throw new Error(file + ext + ' or ' + file + ' does not exists!');
            }
        }

        var js = '';
        try {
            js = engine[compileMethod](html).toString();
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

        var tmf = null;
        try {
            tmf = require(cacheFile);
            this.cache.set(file, tmf);
        } catch (e) {
            console.log(e);
            throw new Error(e);
        }

        console.log(('Cache the template to ' + cacheFile + ' successful!').green);
        return tmf;
    };

    // 填充数据
    proto.fill = function(view, data, options) {
        options = options || {};
        var ext = this.settings.views.engine.ext;

        if (!view || options.format === 'json') {
            try {
                return data;
            } catch(e) {
                return utils.errorToJSON(e);
            }
        } else {
            var viewConfig = this.settings.views;
            var file = view.indexOf('/') === 0 ? view : path.join(viewConfig.path, view);
            var tmf = this.cache.get(file) || this.cache.get(file + ext) || this.compileTemplate(file);
            var html = '';
            try {
                return tmf(data);
            } catch(e) {
                return JSON.stringify(utils.errorToJSON(e));
            }
        }
    };

    // 初始化编译所有模板
    (function() {
        var config = this.settings.views;
        var source = config.path;
        var target = config.cache;
        var ext = config.engine.ext;
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

        var app = this;
        rs.forEach(function(v, k) {
            app.compileTemplate(v);
        });
    }).call(this);

    proto.__defineGetter__('locals', function() {
        return this.LOCALS || {};
    });

    proto.__defineSetter__('locals', function(val) {
           
    });

    // 缓存 bigpipe 代码
    proto._bigpipeScript = require('./lib/fe-bigpipe').toString();
    
    return settings;
};
