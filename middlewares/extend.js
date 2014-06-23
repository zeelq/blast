var views = require('co-views');
var utils = require('../lib/utils');
var parse = require('co-body');

module.exports = function(app) {

    var settings = app.settings;

    // reponse 的 write 方法
    var httpWrite = function(chunk, encoding, callback) {
        this.status = 200;
        return this.res.write(chunk, encoding, callback);
    };

    // reponse 的 end 方法
    var httpEnd = function(data, encoding, callback) {
        return this.res.end(data, encoding, callback);
    };

    var render = require('../lib/render')(settings.views);

    // 如果没有 gearman 配置，则不启用 gearman
    var submitJob = settings.gearman ? require('../lib/gearman')(settings.gearman, app.env) : null;

    return function *extend(next) {
        // 复制 response 对象上的 write 和 end 方法
        this.write = httpWrite;
        this.end = httpEnd;

        // render,bigpipe
        utils.mixin(this, render);

        this.submitJob = submitJob;

        // 表单解析
        this.parse = parse;

        yield next;
    };
};