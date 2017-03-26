
var Logger = require('../logger'),
    Merger      = require('../merger'),
    parser      = require('../parser'),
    utils       = require('../helpers/utils'),
    fstools     = require('../helpers/fstools'),
    Promise     = require('promise'),
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    path = require('path'),
    watch_path = argv._.length===1 ? path.resolve(argv._[0]) : false,
    fileChange = require("../file_change"),
    fs = require("fs");

module.exports = function (orm, db) {
    var logger          = new Logger([]);

    var Fragment = db.define('fragment', {
            path                : { type: 'text', required: true },
            position            : { type: 'integer', required: true },
            lang                : { type: 'text' },
            body                : { type: 'text', required: true },
            type                : { type: 'text', required: true },
            last_body           : { type: 'text', required: true },
            notation            : { type: 'text', required: true },
            section             : { type: 'text', required: true },
            strategy                : { type: 'text' },
            steps               : { type: 'text' },
            created_at      : { type: 'date', required: true, time: true }
        },
        {
            //autoFetch : true,
            //cache : false,

            hooks: {

                beforeValidation: function () {
                    this.created_at = new Date();
                    this.type = "partial";
                },



            },
            methods: {



                removeWithFile: function () {

                    var fragment = this,
                        useCaseParser       = new parser.Usecase();

                    return new Promise(function(resolve, reject) {
                        var parser_usecase      = useCaseParser.parse(fragment.usecase.path),
                            parser_fragments    = parser_usecase.fragments,
                            replacements        = [];

                        for (var i in parser_fragments) {
                            var parser_fragment = parser_fragments[i];

                            if (parser_fragment.path === fragment.path) {
                                replacements.push(fragment.removeFromFile(parser_fragment));
                            }
                        }

                        utils.waterfall(replacements, function () {
                            fragment.remove(function (err) {
                                if (err) throw err;

                                resolve();
                            })

                        });
                    })
                },

                removeFromFile: function (parser_fragment) {
                    var fragment = this;
                    return function () {new Promise(function (resolve2, reject) {

                        fs.readFile(fragment.usecase.path, "utf-8", function(err, fileBefore) {
                            if (err) throw err;

                            fstools.replace(fragment.usecase.path, parser_fragment.fragment_start_line, parser_fragment.end_line, null, function () {

                                fs.readFile(fragment.usecase.path, "utf-8", function(err, fileAfter) {
                                    if (err) throw err;

                                    logger.logFragmentChange(utils.makeHumanReadablePath(fragment.usecase.path, watch_path), fileBefore, fileAfter);

                                    fileChange.getInstance().fileChange(fragment.usecase.path, fileBefore, fileAfter, function () {
                                        resolve2();
                                    });
                                });
                            });
                        });

                    })}
                },

                updateWithFile: function () {

                    var fragment = this;

                    return new Promise(function(resolve, reject) {

                        var useCaseParser       = new parser.Usecase(),
                            parser_usecase      = useCaseParser.parse(fragment.usecase.path),
                            exists_in_parser    = false;

                        fragment.save(function (err) {
                            if (err) throw err;

                            for (var i in parser_usecase.fragments) {
                                var parser_fragment = parser_usecase.fragments[i];
                                if (!(fragment.path === parser_fragment.path && fragment.position === parser_fragment.position))
                                    continue;

                                exists_in_parser = true;

                                var body_with_notation = "";

                                switch (parser_fragment.notation) {
                                    case '```':
                                        var lang = "";
                                        if (parser_fragment.lang) {
                                            lang = parser_fragment.lang;
                                        }

                                        body_with_notation = "```"+lang+"\n"+fragment.body+"\n```";

                                        break;
                                    case '    ':

                                        var frArr = fragment.body.split("\n");
                                        for (var j in frArr) {
                                            frArr[j] = '    '+frArr[j];
                                        }
                                        body_with_notation = frArr.join("\n");

                                        break;
                                }




                                fs.readFile(fragment.usecase.path, "utf-8", function(err, fileBefore) {
                                    if (err) throw err;

                                    fstools.replace(
                                        fragment.usecase.path,
                                        parser_fragment.start_line,
                                        parser_fragment.end_line,
                                        body_with_notation, function () {

                                            fs.readFile(fragment.usecase.path, "utf-8", function(err, fileAfter) {
                                                if (err) throw err;


                                                fileChange.getInstance().fileChange(fragment.usecase.path, fileBefore, fileAfter, function () {
                                                    resolve();
                                                });

                                            });

                                        });
                                });

                                break;


                            }

                            if (!exists_in_parser) resolve();

                        });
                    });
                },

                mergeFragment: function () {

                    var fragment = this,
                        merger          = new Merger();

                    return new Promise(function (resolve2, reject) {

                        var p = path.resolve(watch_path, fragment.path);

                        fs.exists(p, function(exists) {
                            if (exists) {

                                fs.readFile(p, "utf8", function(err, body) {
                                    if (err) throw err;


                                    merger.merge(fragment, [{
                                        type: "full",               // full implementation
                                        body: body,                 // string - code
                                        path: fragment.path,
                                        lang: fstools.extractExtension(p).toLowerCase()
                                    }], function (updated_code) {


                                        if (updated_code[0].body !== body) {
                                            fs.writeFile(p, updated_code[0].body, function (err) {
                                                if (err) throw err;

                                                logger.logFragmentChange(utils.makeHumanReadablePath(p, watch_path), body, updated_code[0].body);

                                                fileChange.getInstance().fileChange(p, body, updated_code[0].body, function () {
                                                    resolve2();
                                                });
                                            });
                                        } else {
                                            resolve2();

                                        }


                                    });
                                });
                            } else {

                                fstools.mkdirpAsync(path.dirname(p), function () {

                                        fs.writeFile(p, fragment.body, function (err) {
                                            if (err) throw err;

                                            logger.logFragmentChange(utils.makeHumanReadablePath(p, watch_path), "", fragment.body);
                                            fileChange.getInstance().fileChange(p, "", fragment.body, function () {
                                                resolve2();
                                            });
                                        });
                                });
                            }
                        });

                    });
                }

            }
        });

    Fragment.hasOne('usecase', db.models.usecase, { autoFetch : true  });
    Fragment.hasOne('project', db.models.project, { autoFetch : true });


    Fragment.mergeUsecaseFile = function  (project, pathPartial, base) {


        var Usecase             = db.models.usecase,
            useCaseParser       = new parser.Usecase(),
            parser_usecase      = useCaseParser.parse(pathPartial),
            _this               = this;

        return new Promise(function(resolve, reject) {

            Usecase.syncUC(project, parser_usecase).then(function (result) {

                if ('fragments_changes' in result) {

                    var fragments_changes = result.fragments_changes,
                        fragments_updates = fragments_changes.create.concat(fragments_changes.update),
                        fragments_changes_arr  = [];


                    for (var i in fragments_updates) {
                        var fragment = fragments_updates[i];
                        fragments_changes_arr.push(utils.waterfallWrap(fragment, fragment.mergeFragment, []));
                    }

                    utils.waterfall(fragments_changes_arr, function () {
                        resolve(fragments_updates);
                    });


                } else {

                    resolve([]);
                }

            });

        });
    };

    Fragment.mergeFile = function  (project, path_merge, base) {

        var _this           = this,
            merger          = new Merger(),
            Fragment        = db.models.fragment;

        return new Promise(function(resolve, reject) {

            fs.readFile(path_merge, "utf8", function(err, body) {
                if (err) throw err;

                var path_db = utils.makeHumanReadablePath(path_merge, base);
                Fragment.find({path: path_db, project: project}, function (err, db_fragments) {
                    if (err) throw err;

                    if (db_fragments.length > 0) {

                        merger.merge({
                            type: "full",               // full implementation
                            body: body,                 // string - code
                            path: path_merge,
                            lang: fstools.extractExtension(path_merge).toLowerCase()
                        }, db_fragments, function (db_updated_fragments) {

                            for (var j in db_updated_fragments) {
                                var fragment = db_updated_fragments[j];

                                logger.logFragmentChange(utils.makeHumanReadablePath(fragment.usecase.path, watch_path), fragment.last_body, fragment.body);
                            }

                            // find fragments in use case files and apply changes
                            var fragments_to_update = [];

                            for (var i in db_updated_fragments) {
                                var fragment = db_updated_fragments[i];

                                if (fragment.body !== fragment.last_body) {
                                    fragments_to_update.push(utils.waterfallWrap(fragment, fragment.updateWithFile, []));
                                }
                            }

                            utils.waterfall(fragments_to_update, function () {
                                resolve();
                            });


                        });
                    } else {
                        resolve();
                    }

                });

            });
        })
    };


    Fragment.assignStepsToFragments = function (parser_tables, parser_fragments) {


        for (var i in parser_fragments) {

            var fragment = parser_fragments[i],
                found = false;

            // go through tables
            for (var j in parser_tables) {

                // table in section
                if (parser_tables[j].section == fragment.section) {

                    //go through table
                    for (var k in parser_tables[j].table) {
                        var item = parser_tables[j].table[k];

                        // paths are equal
                        if ('Fragments' in item && 'Steps' in item && item['Fragments'] == fragment.path) {

                            // assign
                            var parser_steps = item['Steps'].split(',');

                            // clean whitespaces
                            for (var l in parser_steps) {
                                parser_steps[l] =
                                    parser_steps[l]
                                        .replace(/^\s*/, '')
                                        .replace(/\s*$/, '');

                                var length = parser_steps.length;

                                // step should finish with '.'
                                if (parser_steps[l][length - 1] != '.') {
                                    parser_steps[l] += '.';
                                }

                            }

                            parser_fragments[i].steps = parser_steps.join(",");
                            found = true;
                            break;
                        }

                    }
                }
                if (found) break;

            }
        }

        return parser_fragments;

    };



    return Fragment;
};
