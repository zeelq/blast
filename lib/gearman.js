module.exports = function(config, env) {
    var gearmanode = require('gearmanode');
    var utils = require('./utils');

    // clent池
    var clientPools = [];

    // 初始化时创建 client 的个数
    var initClients = config.initClients || 256;

    // 创建新的 client
    function createNewClient(servers) {
        console.log('=> new gearman client was created!');
        return gearmanode.client({
            servers: servers
        });
    }

    // 销毁 client
    function destroyClients() {
        // todo
    }

    // 初始化一批 client 备用
    for (var i = initClients; i--;) {
        clientPools.push(gearmanode.client());
    }

    // worker 列表
    var workers = config.workers = config.workers || {};
    env = env || 'development';
    if (utils.isType('string', workers)) {
        try {
            workers = require(workers)[env] || {};
        } catch(e) {
            workers = {};
        }
    }

    return function(worker, args, options, callback) {
        // 取到 worker 的配置
        // 没有取到时应返回错误 no gearman server is avariable
        var servers = workers[worker];
        var argsLength = arguments.length;
        var callback = arguments[argsLength - 1];
        var args = Array.prototype.slice.call(arguments, 0, -1);
        var ctx = this;

        // 从 client 池中取出一个 client
        // 并初始化 server
        var client = clientPools.shift();

        client ? client.initServers({
            servers: servers
        }) : client = createNewClient(servers);

        var submitJob = client.submitJob;
        var job = submitJob.apply(client, args);

        job.on('complete', function() {
            var data = {
                "name": job.name,
                "payload": job.payload,
                "response": job.response
            };
            callback.call(ctx, null, data);
            client.close();

            // 回收到client池
            clientPools.push(client);
        });

        return job;
    }
};
