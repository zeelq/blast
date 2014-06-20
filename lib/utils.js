var utils = require('utilities');
module.exports = utils.mixin(utils, {
    'typeof': function(o) {
        var type = Object.prototype
                .toString.call(o)
                .slice(8, -1).toLowerCase();

        if (type === 'number' && isNaN(o)) {
            type = 'NaN';
        }
        return type;
    },

    'isType': function(type, o) {
        return type === this.typeof(o);
    }
});
