
var fs = require('fs'),
    path = require('path'),
    utils = require('./utils'),
    Promise = require('promise');

module.exports = {

    extractExtension: function (path) {
        return path.substr(path.lastIndexOf('.') + 1);
    },

    replace: function (path, line_start, line_stop, replacement, done) {
        fs.readFile(path, 'utf-8', function(err, data) {
            if (err) throw err;
            var removed = utils.extractLineRanges(data, [[line_start, line_stop]]);
            if (replacement)
                var body = utils.insertAtLine(line_start, replacement, removed);
            else
                 var body = removed;

            //console.log(replacement);
            fs.writeFile(path, body, function(err) {
                if (err) throw err;
                done();
            });
        });
    },

    mkdirpAsync: function (path, done) {

        var path_split  = path.split('/'),
            path_partial = "",
            create = [],

            do_create = function (path_partial) {
                return function () {
                    return new Promise(function (fulfill, reject) {
                        fs.exists(path_partial, function (exists) {
                            if (!exists) {
                                fs.mkdir(path_partial, function (err) {
                                    //if (err) throw err;
                                    fulfill();
                                })
                            } else {
                                fulfill();
                            }
                        });
                    });
                }
            };

        /*
         * Ensure path is created
         */
        for (var i in path_split) {

            // last is filename
            //if (path_split.length-1 <= i)
            //    break;

            path_partial += path_split[i]+'/';
            if (path_split[i] === "..") continue;

            create.push(do_create(path_partial));
        }

        create.reduce(function(cur, next) {
            return cur.then(next);
        }, Promise.resolve()).then(function () {
            done();
        });
    },

    removeEmptyFoldersRecursiveAsync: function (dir, done) {
        var _this = this;

        fs.exists(dir, function (exists) {
            if (exists) {

                fs.readdir(dir, function (err, list) {

                    var remove = [];

                    for (var i in list) {

                        function do_remove(fn) {

                            return new Promise(function (fulfill, reject) {
                                var filename = path.join(dir, fn);

                                fs.stat(filename, function (err, stat) {

                                    if (filename in [".", ".."]) {
                                        // skip
                                        fulfill();
                                    } else if (stat.isDirectory()) {

                                        // recurse
                                        _this.removeEmptyFoldersRecursiveAsync(filename, function () {
                                            fulfill();
                                        });

                                    } else {
                                        // it is file, leave it
                                        fulfill();
                                    }
                                });
                            });
                        }

                        remove.push(do_remove(list[i]));
                    }

                    Promise.all(remove).then(function () {

                        fs.readdir(dir, function (err, list) {
                            if (list.length === 0) {
                                fs.rmdir(dir, function () {
                                    done();
                                });
                            } else {
                                done();
                            }
                        });
                    });

                });

            }
        });

    },

    copy: function (source, target, cb) {
        var cbCalled = false;

        var rd = fs.createReadStream(source);
        rd.on("error", function(err) {
            done(err);
        });
        var wr = fs.createWriteStream(target);
        wr.on("error", function(err) {
            done(err);
        });
        wr.on("close", function(ex) {
            done();
        });
        rd.pipe(wr);

        function done(err) {
            if (!cbCalled) {
                cb(err);
                cbCalled = true;
            }
        }
    },

    fileIsAscii: function (filename, callback) {
        // Read the file with no encoding for raw buffer access.
        fs.readFile(filename, function(err, buf) {
            if (err) throw err;
            var isAscii = true;
            for (var i=0, len=buf.length; i<len; i++) {
                if (buf[i] > 127) { isAscii=false; break; }
            }
            callback(isAscii); // true iff all octets are in [0, 127].
        });
    },

    /**
     * Inspired by https://violentatom.com/2015/07/08/node-js-chokidar-wait-for-file-copy-to-complete-before-modifying/
     */
    onFileCopyComplete: function (path, prev, unchanged, callback) {
      var _this = this,
          wait = 200,
          waitTill = 1000;
      if (!unchanged) unchanged = 0;
      if (!prev) {
        fs.stat(path, function (err, stat) {
          if (err) throw err;
          setTimeout(function () {_this.onFileCopyComplete(path, stat, unchanged, callback)}, wait);
        });
      } else {
        fs.stat(path, function (err, stat) {
            if (err) throw err;
            if (stat.mtime.getTime() === prev.mtime.getTime()) {
              unchanged += wait;
            } else  {
              unchanged = 0;
            }
            if (stat.mtime.getTime() === prev.mtime.getTime() && unchanged >= waitTill) {
              callback();
            } else {
              setTimeout(function () {_this.onFileCopyComplete(path, stat, unchanged, callback)}, wait);
            }
        });
      }
    },

    /**
     * @author Christopher Jeffrey
     *
     * http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
     */
    walk: function(dir, done) {
        var results = [],
            _this = this;
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                file = path.resolve(dir, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        _this.walk(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    } else {
                        results.push(file);
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    },


    /**
     * @author Yoav Niran
     *
     * https://gist.github.com/yoavniran/adbbe12ddf7978e070c0
     */
    removeFolderRecursiveAsync: function (dirToRemove, callback) {

        var dirList = [];
        var fileList = [];

        function flattenDeleteLists(fsPath, callback) {

            fs.lstat(fsPath, function (err, stats) {

                if (err) {
                    callback(err);
                    return;
                }

                if (stats.isDirectory()) {

                    dirList.unshift(fsPath);  //add to our list of dirs to delete after we're done exploring for files

                    fs.readdir(fsPath, function (err, files) {

                        if (err) {
                            callback(err);
                            return;
                        }

                        var currentTotal = files.length;

                        var checkCounter = function (err) {
                            if (currentTotal < 1 || err) {
                                callback(err);
                            }
                        };

                        if (files.length > 0) {
                            files.forEach(function (f) {
                                flattenDeleteLists(path.join(fsPath, f), function (err) {
                                    currentTotal -= 1;
                                    checkCounter(err);
                                });
                            });
                        }

                        checkCounter(); //make sure we bubble the callbacks all the way out
                    });
                }
                else {
                    fileList.unshift(fsPath); //add to our list of files to delete after we're done exploring for files
                    callback();
                }
            });
        }

        function removeItemsList(list, rmMethod, callback) {

            var count = list.length;

            if (count === 0){
                callback();
                return;
            }

            list.forEach(function (file) {
                fs[rmMethod](file, function (err) {
                    count -= 1;
                    if (count < 1 || err) {
                        callback(err);
                    }
                });
            });
        }

        function onFinishedFlattening(err) {

            if (err) {
                callback(err);
                return;
            }

            removeItemsList(fileList, "unlink", function (err) {//done exploring folders without errors
                if (err) {
                    callback(err);
                    return;
                }

                removeItemsList(dirList, "rmdir", function (err) { //done deleting files without errors
                    callback(err);  //done
                });
            });
        }

        flattenDeleteLists(dirToRemove, onFinishedFlattening);
    },



};
