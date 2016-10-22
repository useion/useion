
var chokidar = require('chokidar'), // lib to watch for file changes
    Logger = require('./logger'),
    fstools = require('./helpers/fstools'),
    ChangeController = require('./controller/change'),
    dq = require ("deferred-queue"),
    queue = dq();

module.exports = function (project) {

    this.logger          = new Logger([]);
    this.project         = project;
    this.watcher         = null;

    this.watch = function () {

        var logger          = this.logger,
            project         = this.project,
            changeCtrl      = new ChangeController(),

            watch_path      = this.project.watch_path;

        if (this.watcher) this.unwatch();

        this.watcher        = chokidar.watch(watch_path, {
            ignored: ".*(?<!(cpp)|(cs)|(css)|(feature)|(html)|(tpl)|(md)|(java)|(js)|(php)|(py)|(rb))$",
            ignoreInitial: true
        });

        this.watcher
            .on('add', function(path) {
                queue.push(function (cb) {
                  fstools.onFileCopyComplete(path, null, null, function (){
                    changeCtrl.onFileChange(project, path, function () {
                        cb();
                    });
                });
              });
            })
            .on('change', function(path) {
                queue.push(function (cb) {
                  fstools.onFileCopyComplete(path, null, null, function (){
                    changeCtrl.onFileChange(project, path, function () {
                        cb();
                    });
                });
              });
            })
            .on('unlink', function(path) {
                queue.push(function (cb) {
                    changeCtrl.onFileRemove(project, path, function () {
                        cb();
                    });
                });
            })
            .on('ready', function() {
                queue.push(function (cb) {
                    cb();
                });
            });

        console.log("Watching for changes in folder "+watch_path);

    };

    this.unwatch = function () {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    };


};
