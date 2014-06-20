module.exports = function(model, config, pool) {
    var M = require('./' + model);
    return new M(config, pool);
};
