var pubsub = {};

(function(q) {
    var topics = {}; // callbacks
    var subUid = -1;

    q.publish = function(topic, args) {
        if (!topics[topic]) {
            return false;
        }

        setTimeout(function() {
            var subscribers = topics[topic];
            var len = subscribers ? subscribers.length : 0;

            while(len--) {
                subscribers[len].func(topic, args);
            }
        });

        return true;
    };

    q.subscribe = function(topic, func) {
        if (!topics[topic]) {
            topics[topic] = [];
        }

        var token = (++subUid).toString();
        topics[topic].push({
            token: token,
            func: func
        });

        return token;
    };

    q.unsubscribe = function(token) {
        for (var m in topics) {
            if (topics[m]) {
                for (var i = 0, j = topics[m].length; i < j; i++) {
                    if (topics[m][i].token === token) {
                        topics[m].splice(i, 1);
                        return token;
                    }
                }
            }
        }
        return false;
    };

})(pubsub);

pubsub.subscribe('ex', function(t, d) {
    console.log(t + ':' + d);
});

pubsub.publish('ex', 'hello world');
pubsub.publish('ex', [1, 2, 3]);
pubsub.publish('ex', {
    name: 'cage',
    age: 27
});

