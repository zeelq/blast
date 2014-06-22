var koa = require('koa');
var gzip = require('koa-gzip');
var path = require('path');
var debug = require('debug');
var logger = require('./lib/logger');
var utils = require('./lib/utils');
var commander = require('commander');
var session = require('koa-session');

var colors = require('colors');

var app = koa();

commander.version('0.1.1')
    .option('-d, --dir [path]', 'the project dir')
    .option('-e, --environment settings [file]', 'the config file', 'development')
    .option('-c, --custom settings [file]', 'the developer config file')
    .option('-p, --port [number]', 'listen prot')
    .parse(process.argv);


if (!commander.dir) {
    throw new Error('Missing parameter:project dir');
}

// import settings
var dir = path.resolve(commander.dir);
var defaultSettings = {
    'dir'   : dir,
    'port'  : 8888,
    'host'  : '0.0.0.0',
    'title' : 'Welcome to Blast',
    // session 配置
    'session': {
        'keys': ['the blast session keys'],
        'store': {},
        'cookie': {
            'maxAge': 60 * 60 * 1000
        }
    },
    
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
            'ext'       : 'html',
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
var settings = utils.mixin(defaultSettings, settings, environment, custom, true);
var port = settings.port;

app.name = settings.name;
app.env = commander.environment;
app.settings = settings;

var middlewares = null;

try {
    middlewares = require(settings.middlewares);
} catch(e) {
    middlewares = {};
}

// add logger
app.use(logger());

// gzip
app.use(gzip());

// start request
middlewares['startRequest'] && app.use(middlewares['startRequest']);

// session
if (settings.session) {
    app.keys = settings.session.keys
    app.use(session(settings.session));
}

// add extend
app.use(require('./lib/extend')(app));

// before route
middlewares['beforeRoute'] && app.use(middlewares['beforeRoute']);

// add router
app.use(require('./lib/router')(settings.controllers));

// after send
middlewares['afterRoute'] && app.use(middlewares['afterRoute']);

// listen at port
app.listen(port);

console.log('listening on port ' + port.green);
console.log('======================================== settings ========================================');
console.log(settings);
console.log('======================================== settings ========================================');


/****************************** 开发环境监控文件变动,自动重启 node 服务 ************************/
if (app.env === 'NODE_ENV' || app.env === 'development') {
    var chokidar = require('chokidar');
    var watcherOptions = {
        ignored: /[\/\\]\.|[\/\\]node_modules/,
        persistent: true,
        interval: 1000
    };

    var watcherBlast = chokidar.watch(__dirname, watcherOptions);
    var watcherProject = chokidar.watch(dir, watcherOptions);

    function watcher() {
        process.exit();
    }

    app.once('start', function() {

        // 监控 blast 目录
        watcherBlast.on('add', watcher)
            .on('addDir', watcher)
            .on('change', watcher)
            .on('unlink', watcher)
            .on('unlinkDir', watcher)
            .on('error', watcher);

        // 监控项目根目录
        watcherProject.on('add', watcher)
            .on('addDir', watcher)
            .on('change', watcher)
            .on('unlink', watcher)
            .on('unlinkDir', watcher)
            .on('error', watcher);
    });

    setTimeout(function() {
        app.emit('start');
    }, 200);
}
