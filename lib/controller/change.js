
var Logger = require('../logger'),
    Promise     = require('promise'),
    parser = require('../parser'),
    utils = require('../helpers/utils'),
    fstools = require('../helpers/fstools'),
    tmpl = require("blueimp-tmpl"),
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    path = require('path'),
    watch_path = argv._.length===1 ? path.resolve(argv._[0]) : false,
    fs = require("fs");

module.exports = function () {

    var fileChange = require("../file_change");

    this.db              = require('../model')(function (err, db) {return db;});
    this.logger          = new Logger([]);

    this.onFileChange = function (project, path, done) {

        var db = this.db,
            logger = this.logger,
            useCaseParser       = new parser.Usecase(),
            parser_usecase      = useCaseParser.parse(path),
            Usecase             = this.db.models.usecase,
            Fragment            = this.db.models.fragment;


        fs.readFile(path, "utf-8", function (err, b){

        // save change to database
        fileChange.getInstance().fileChange(path, fileChange.getInstance().oldBodyQueryFromDatabase, b, function (old_body, new_body) {

            logger.logFragmentChange(utils.makeHumanReadablePath(path, watch_path), old_body, new_body);

            /**
             * If the file is a use case file, which contains code and tests
             */
            if (parser_usecase) {

                db.transaction(function (err, transaction) {

                    Usecase.upsert(parser_usecase, project, function (usecase, usecase_changes) {
                        if (err) throw err;

                        if (usecase === null) {
                            transaction.rollback(function (err) {
                                if (err) throw err;

                                done();
                                // Done!
                            });
                            return;
                        }


                        // delete in log
                        delete usecase_changes.path;
                        delete usecase_changes.body;

                        delete parser_usecase.tables;
                        delete parser_usecase.fragments;
                        delete parser_usecase.body;

                        delete parser_usecase.sections_start_line;
                        delete parser_usecase.sections_end_line;

                        // print changes
                        if (Object.keys(usecase_changes).length !== 0) {
                            logger.logUsecase(usecase, usecase_changes);
                        }

                        transaction.commit(function (err) {
                            if (err) throw err;

                            Fragment.mergeUsecaseFile(project, path, watch_path).then(function (fragments_updates) {

                              // if any change occured run coverage for the use case
                              if (Object.keys(usecase_changes).length > 0 || fragments_updates.length > 0) {


                                Usecase.find({project: project, id: usecase.id}, function (err, usecases) {
                                    if (err) throw err;

                                    utils.waterfall([
                                      utils.waterfallWrap(usecases[0], usecases[0].getCoverage, [true])
                                    ], function (ress) {
                                        fs.readFile("./lib/coverage/template2.md", "utf-8", function (err, template) {
                                          logger.log(tmpl(template, ress[0]));
                                          done();
                                        });

                                    });

                                });

                              } else {
                                  done();
                              }
                            });


                        });


                    })
                });




                /**
                 * If the file is a code
                 *  propagate changes to use case files if they contain the same method of particular class
                 */
            } else if (utils.startsWith(path, watch_path)) {

                Fragment.mergeFile(project, path, watch_path).then(function () {
                    done();
                });

            } else {
                done();
            }

        });
        });

    };

    this.onFileRemove = function (project, path, done) {

        var logger = this.logger;

        // save change to database
        fileChange.getInstance().fileChange(path, fileChange.getInstance().oldBodyQueryFromDatabase, "", function (old_body, new_body) {

            logger.logFragmentChange(utils.makeHumanReadablePath(path, watch_path), old_body, new_body);


            var Usecase             = this.db.models.usecase,
                Fragment            = this.db.models.fragment;

            Usecase.find({path: path}, function (err, usecases) {
                if (err) throw err;
                if (usecases.length === 0) {


                    var p = utils.makeHumanReadablePath(path, watch_path);

                    Fragment.find({path: p}, function (err, fragments) {
                        if (err) throw err;

                        var fragments_remove = [];
                        for (var i in fragments)
                            fragments_remove.push(fragments[i].removeWithFile());

                        Promise.all(fragments_remove).then(function () {
                            done();
                        });

                    });

                } else {
                    var usecase = usecases[0];

                    usecase.cascadeRemove(function () {
                        done();
                    });
                }

            });
        });
    };
};
