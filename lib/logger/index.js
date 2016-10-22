
var
    ConsoleLogger = require('./loggers/console'),
    loggers = [];

module.exports = function (initialize) {

    for (var i in initialize) {
        switch (initialize[i]) {
            case 'console':
                loggers.push(new ConsoleLogger());
                break;
        }
    }

    this.registerObserver = function (observer) {
        for (var i in loggers) {
            loggers[i].registerObserver(observer);
        }
    };

    this.log = function (text, color) {
        for (var i in loggers) {
            loggers[i].log(text, color);
        }
    };

    this.logH1 = function (text) {
        for (var i in loggers) {
            loggers[i].logH1(text);
        }
    };

    this.logH2 = function (text) {
        for (var i in loggers) {
            loggers[i].logH2(text);
        }
    };

    this.logUsecase = function (usecase, changes) {
        for (var i in loggers) {
            loggers[i].logUsecase(usecase, changes);
        }
    };

    this.logFragmentsChanges = function (fragments_changes) {
        for (var i in loggers) {
            loggers[i].logFragmentsChanges(fragments_changes);
        }
    };

    this.logFragmentChange = function (path, body1, body2) {
        for (var i in loggers) {
            loggers[i].logFragmentChange(path, body1, body2);
        }
    };


    this.logTree = function (tree) {
        for (var i in loggers) {
            loggers[i].logTree(tree);
        }
    };

    this.now = function () {
        var now     = new Date();
        var year    = now.getFullYear();
        var month   = now.getMonth()+1;
        var day     = now.getDate();
        var hour    = now.getHours();
        var minute  = now.getMinutes();
        var second  = now.getSeconds();
        if(month.toString().length == 1) {
            var month = '0'+month;
        }
        if(day.toString().length == 1) {
            var day = '0'+day;
        }
        if(hour.toString().length == 1) {
            var hour = '0'+hour;
        }
        if(minute.toString().length == 1) {
            var minute = '0'+minute;
        }
        if(second.toString().length == 1) {
            var second = '0'+second;
        }
        var dateTime = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
        return dateTime;
    }

};