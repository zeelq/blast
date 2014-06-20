module.exports = function() {
    var _events = {};

    var _counter = 0;

    function argumentsToArray(args, start, end) {
        if (!arguments.length) {
            return [];
        }

        start = start || 0;
        end = end || args.length;

        try {
            return Array.prototype.slice.call(args, start, end);
        } catch(e) {
            var arr = [];
            for (var i = 0, len = args.length; i < len; i++) {
                arr.push(args[i]);
            }
            return !start && end === args.length ? arr : arr.slice(start, end);
        }
    }

    function _typeof(o) {
        var type = Object.prototype.toString.call(o).slice(8, -1).toLowerCase();
        return type === 'number' ?
            (isNaN(o) ? 'NaN' : type) : type;
    }

    function isType(type, o) {
        return _typeof(o) === type;
    }

    function Bigpipe() {
        var id = 'e' + _counter++;
        this._eid = id;
        _events[id] = _events[id] || {};
    }

    if (!isType('function', Array.prototype.forEach)) {
        Array.prototype.forEach = function(fn) {
            for (var i = 0, len = this.length; i < len; i++) {
                fn(this[i], i, this);
            }
        }
    }

    Bigpipe.prototype = {
        constructor: Bigpipe,

        emit: function(type) {


            var id = this._eid;
            var events = _events[id];
            var listeners = events[type] = events[type] || [];

            for (var i = 0, len = listeners.length; i < len; i++) {
                var handler = listeners[i];
                var args = argumentsToArray(arguments, 1);
                isType('function', handler) && handler.apply(this, args);
            }

           return this;
        },

        addListener: function(type, handler) {

            var id = this._eid;
            var events = _events[id];
            var listeners = events[type] = events[type] || [];
            if (isType('function', handler)) {
                listeners.push(handler);
            } else if (isType('array', handler)) {
                handler.forEach(function(fn) {
                    if (!isType('function', fn)) {
                        throw new Error(fn + 'does not a function');
                    }
                    listeners.push(fn);
                });
            } else {
                throw new Error(handler + 'does not a function');
            }

            for (var i = 0; i < listeners.length; i++) {
                var fn = listeners[i];
                if (!isType('function', fn)){
                    listeners.splice(i, 1);
                }
            }

            return this;
        },

        removeListener: function(type, handler) {
            var id = this._eid;
            var events = _events[id];
            var listeners = events[type] = events[type] || [];

            for (var i = 0, len = listeners.length; i < len; i++) {
                if (listeners[i] === handler) {
                    listeners[i] = null;
                }
            }

            return this;
        },

        removeAllListeners: function(type) {
            var id = this._eid;

            if (type) {
                var events = _events[id];
                events[type] = [];
            } else {
                 _events[id] = {};
            }
        },

        once: function(type, handler) {
            if (!isType('function', handler)) {
                throw new Error(handler + 'does not a function');
            }

            var fired = false;

            function g() {
                this.removeListener(type, g);

                if (!fired) {
                    fired = true;
                    handler.apply(this, arguments);
                }
            }

            this.on(type, g);

            return this;
        }
    };

    Bigpipe.prototype.on = Bigpipe.prototype.addListener;

    var _PIPE_ = new Bigpipe();

    _PIPE_.on('arrive', function(o) {
        var section = o.section;
        var html = o.html || '';

        if (section && isType('string', section)) {
            var dom = document.getElementById(section);
            if (dom) {
                dom.innerHTML = html;
            } else {
                throw new Error('no section available');
            }
        } else {
            throw new Error('section is an invalid selector');
        }
    });

    return _PIPE_;
}
