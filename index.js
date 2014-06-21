var division = require('division');
var path = require('path');
var cluster = new division();
var timeout = 30000;
var autoSize = cluster.get('size');
//var size = Number(process.argv[2]) || autoSize;
// 默认单进程
var size = Number(process.argv[2]) || 1;

cluster.set('args', process.argv.slice(2))
    .set('path', path.join(__dirname, 'server.js'))
    .set('size', size).use('signals');

(function(cluster) {
    cluster.run(function() {
        var master = this;

        console.log('server start at ' + new Date(master.startup) + ' with pid=' + master.pid);

        master.on('fork', function(worker) {
            worker.publish('start');
            worker.instance.on('message', function(msg) {
                var data = msg.data;
                var offset = 0;
                var procNum = undefined;

                if (msg.event == 'config') {
                    if (timeout !== data.timeout) {
                        cluster.set('timeout', timeout = data.timeout);
                    }

                    if (size !== data.procNum) {
                        procNum = data.procNum == 'auto' ? autoSize : (parseInt(data.procNum) || size);
                        offset = procNum - size;

                        if (offset > 0) {
                            master.instance(offset);
                        } else if (offset < 0) {
                            master.decrease(-offset);
                        }

                        size = data.procNum;
                    }
                } else if (msg.event == 'exit') {
                    process.exit();
                }
            });
        });
    });
})(cluster);
