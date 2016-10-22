
var fs = require('fs'),
    Logger      = require('./logger'),
    logger      = new Logger(),
    Promise     = require('promise'),
    utils       = require('./helpers/utils'),
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    path = require('path'),
    watch_path = argv._.length===1 ? path.resolve(argv._[0]) : false,
    orm      = require('orm'),
    db          = require('./model')(function (err, db) {return db;});

module.exports = {

    instance: null,

    getInstance: function () {
        return this.instance;
    },

    FileChange: function (project, watcher) {

        var pointer_file_change_id     = null,
            decrease_pointer    = false;

        // random strings
        this.oldBodyReadFromFileSystem  = "0860866757";
        this.oldBodyQueryFromDatabase   = "3980070579";

        this.readStdin = function () {

            var _this = this;

            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            process.stdin.on('data', function (text) {

                text = text.replace(/\s*$/, "");

                if (text === "b" || text === "back") {
                    if (watcher) watcher.unwatch();
                    _this.back();
                    if (watcher) watcher.watch();
                }
                if (text === "f" || text === "forward") {
                    if (watcher) watcher.unwatch();
                    _this.forward();
                    if (watcher) watcher.watch();
                }
            });

            console.log("Type \"b\" to revert changes back.")
        };

        this.fileChange = function (path, old_body, new_body, done) {

            var _this = this,
                FileChange = db.models.file_change;

            var old_body_p = new Promise(function (f, r) {
                if (old_body === _this.oldBodyReadFromFileSystem) {
                    fs.exists(path, function (exists) {
                        if (exists)
                            fs.readFile(path, 'utf-8', function (err, o) {
                                f(o);
                            });
                        else
                            f("");
                    });
                } else if (old_body === _this.oldBodyQueryFromDatabase) {
                  FileChange.find({path: path}).order('-created_at').limit(1).all(function (err, file_changes) {
                    if (err) throw err;

                    if (file_changes.length === 0) {
                      f("");
                    } else {
                      f(file_changes[0].new_body);
                    }
                  });
                }
                else {
                    f(old_body)
                }
            });
            old_body_p.then(function (old_body) {
                if (old_body !== new_body) {
                    var o = {
                        path: path,
                        old_body: old_body,
                        new_body: new_body,
                        project: project
                    };
                    FileChange.create([o], function (err, file_changes) {
                        if (err) throw err;
                        pointer_file_change_id = file_changes[0].id;
                        decrease_pointer = false;
                        done(old_body, new_body);
                    });
                } else {
                    done(old_body, new_body);
                }
            });
        };

        this.back = function () {

            var FileChange = db.models.file_change;

            if (pointer_file_change_id === null) {
                FileChange.find({project: project}).order('-created_at').limit(1).all(function (err, file_changes) {
                    if (err) throw err;

                    if (file_changes.length === 0) {
                        logger.log("No more records.")
                    } else {
                        var file_change = file_changes[0];


                        fs.exists(file_change.path, function (exists) {
                            if (exists)
                                fs.readFile(file_change.path, 'utf-8', function (err, orig) {
                                    if (err) throw err;

                                    fs.writeFile(file_change.path, file_change.old_body, function (err) {
                                        if (err) throw err;

                                        logger.logFragmentChange(utils.makeHumanReadablePath(file_change.path, watch_path), orig, file_change.old_body);
                                        pointer_file_change_id = file_change.id;
                                    });
                                });

                            else {
                                logger.log("File " + utils.makeHumanReadablePath(file_change.path, watch_path)+ " no longer exists. Creating.");

                                fs.writeFile(file_change.path, file_change.old_body, function (err) {
                                    if (err) throw err;

                                    logger.logFragmentChange(utils.makeHumanReadablePath(file_change.path, watch_path), "", file_change.old_body);
                                    pointer_file_change_id = file_change.id;
                                });
                            }
                        });
                    }
                });
            } else {
                FileChange.find({id: orm.lte((decrease_pointer)?pointer_file_change_id-1:pointer_file_change_id), project:project}).order('-created_at').limit(1).all(function (err, file_changes) {
                    if (err) throw err;

                    decrease_pointer = true;

                    if (file_changes.length === 0) {
                        logger.log("No more records.")
                    } else {
                        var file_change = file_changes[0];

                        fs.exists(file_change.path, function (exists) {
                            if (exists)
                                fs.readFile(file_change.path, 'utf-8', function(err, orig) {
                                    if (err) throw err;

                                    fs.writeFile(file_change.path, file_change.old_body, function(err) {
                                        if (err) throw err;

                                        logger.logFragmentChange(utils.makeHumanReadablePath(file_change.path, watch_path), orig, file_change.old_body);
                                        pointer_file_change_id = file_change.id;
                                    });
                                });
                            else {
                                logger.log("File "+utils.makeHumanReadablePath(file_change.path, watch_path)+" no longer exists. Creating.");

                                fs.writeFile(file_change.path, file_change.old_body, function(err) {
                                    if (err) throw err;

                                    logger.logFragmentChange(utils.makeHumanReadablePath(file_change.path, watch_path), "", file_change.old_body);
                                    pointer_file_change_id = file_change.id;
                                });
                            }

                        });
                    }
                });
            }
        };


        this.forward = function () {

            var FileChange = db.models.file_change;

            if (pointer_file_change_id === null) {
                logger.log("No more records.");
            } else {

                FileChange.find({id: orm.gte((!decrease_pointer)?pointer_file_change_id+1:pointer_file_change_id), project:project}).order('created_at').limit(1).all(function (err, file_changes) {
                    if (err) throw err;

                    decrease_pointer = false;

                    if (file_changes.length === 0) {
                        logger.log("No more records.");
                    } else {
                        var file_change = file_changes[0];

                        fs.exists(file_change.path, function (exists) {
                            if (exists)
                                fs.readFile(file_change.path, 'utf-8', function(err, orig) {
                                    if (err) throw err;

                                    fs.writeFile(file_change.path, file_change.new_body, function(err) {
                                        if (err) throw err;

                                        logger.logFragmentChange(utils.makeHumanReadablePath(file_change.path, watch_path), orig, file_change.new_body);
                                        pointer_file_change_id = file_change.id;
                                    });
                                });
                            else {
                                logger.log("File "+utils.makeHumanReadablePath(file_change.path, watch_path)+" no longer exists. Creating.");

                                fs.writeFile(file_change.path, file_change.new_body, function(err) {
                                    if (err) throw err;

                                    logger.logFragmentChange(utils.makeHumanReadablePath(file_change.path, watch_path), "", file_change.new_body);
                                    pointer_file_change_id = file_change.id;
                                });
                            }

                        });
                    }
                });
            }
        }
    }

};
