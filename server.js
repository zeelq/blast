var koa = require('koa');
var gzip = require('koa-gzip');
var path = require('path');
var debug = require('debug');
var logger = require('koa-logger');
var utils = require('./lib/utils');
var commander = require('commander');
var session = require('koa-session');

var app = koa();

commander.version('0.1.1')
    .option('-d, --dir [path]', 'The project dir')
    .option('-e, --environment settings [file]', 'The config file', 'development')
    .option('-c, --custom settings [file]', 'The config file')
    .option('-p, --port [number]', 'The prot')
    .parse(process.argv);


if (!commander.dir) {
    throw new Error('Missing parameter:project dir');
}

// import settings
var dir = path.resolve(commander.dir);
var defaultSettings = {
    'dir': dir,
    'port': 8888,
    'host': '0.0.0.0',
    'title': 'Welcome to Blast',
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
        'path': path.join(dir, 'views'),
        // 模板文件缓存位置
        'cache': path.join(dir, 'cache'),
        // 模板引擎
        'engine': {
            // 模板引擎名称
            'name': 'dot',
            // 模板引擎编译方法
            'compile': 'template',
            // 模板后缀
            'ext': 'html',

            'set': null
        }
    },

    // 控制层(routers)目录
    'controllers': {
        'path': path.join(dir, 'controllers')
    },

    // 静态文件配置
    'static': {
        // 静态文件域名
        'domain': 'http://localhost',
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
var custom = commander.custom && require(path.join(dir, commander.custom));
var settings = utils.mixin(defaultSettings, settings, environment, custom, true);
var port = commander.port || settings.port;

settings.port = port;

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

console.log('listening on port ' + port);
console.log('======================================== settings ========================================');
console.log(settings);
console.log('======================================== settings ========================================');
