var koa = require('ext-koa');
var gzip = require('koa-gzip');
var path = require('path');
var logger = require('./middlewares/logger');
var commander = require('commander');
//var session = require('koa-session');

var colors = require('colors');

var app = koa();

commander.version('0.1.1')
    .option('-d, --dir [path]', 'the project dir')
    .option('-e, --environment settings [file]', 'the config file', 'development')
    .option('-c, --custom settings [file]', 'the developer config file')
    .option('-p, --port [number]', 'listen prot')
    .parse(process.argv);


if (!commander.dir) {
    throw new Error('Missing parameter:project directory');
}

// initialize app
var settings = require('./initialize').call(app, commander);

// 加载中间件
var middlewares = null;

try {
    middlewares = require(settings.middlewares);
} catch(e) {
    middlewares = {};
}

// add logger
settings.log && app.use(logger());

// gzip
//settings.gzip && app.use(gzip());

// start request
middlewares['startRequest'] && app.use(middlewares['startRequest']);

// session
/*
if (settings.session) {
    app.keys = settings.session.keys
    app.use(session(settings.session));
}
*/

// add extend
app.use(require('./middlewares/extend')(app));

// before route
middlewares['beforeRoute'] && app.use(middlewares['beforeRoute']);

// add controllers
app.use(require('./middlewares/controllers')(app));

// after send
middlewares['afterRoute'] && app.use(middlewares['afterRoute']);

// listen at port
app.listen(settings.port);


if (app.env === 'NODE_ENV' || app.env === 'development') {
    console.log('listening on port ' + settings.port.green);
    console.log('======================================== settings ========================================');
    console.log(settings);

    /****************************** 开发环境监控文件变动,自动重启 node 服务 ************************/
    var chokidar = require('chokidar');
    var watcherOptions = {
        //ignored: /[\/\\]\.|[\/\\]node_modules/,
        ignored: /[\/\\]\.|[\/\\]node_modules/,
        persistent: true,
        ignoreInitial: true
    };

    var watcherBlast = chokidar.watch(__dirname, watcherOptions);
    var watcherProject = chokidar.watch(settings.dir, watcherOptions);

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
    app.emit('start');
}
