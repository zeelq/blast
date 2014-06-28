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

    // 配置了数据库才加载
    settings.models && require('../lib/model')(app);

    var render = require('../lib/render')(settings.views);

    // 如果没有 gearman 配置，则不启用 gearman
    var submitJob = settings.gearman ? require('../lib/gearman')(settings.gearman, app.env) : null;

    return function *extend(next) {
        // render,bigpipe
        utils.mixin(this, render);

        this.submitJob = submitJob;

        // 表单解析
        this.parse = parse;

        yield next;
    };
};
