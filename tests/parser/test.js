
var Logger      = require('../logger'),
    Merger      = require('../merger'),
    MergeHelper      = require('../merger/helper'),
    logger      = new Logger(['console']),
    parser      = require('../parser'),
    utils       = require('../helpers/utils'),
    fs = require("fs"),
    fstools     = require('../helpers/fstools'),
    Promise     = require('promise'),
    argv        = require('minimist')(process.argv.slice(2)),
    path = require('path');

module.exports = function (db) {

    var a = 3;

    this.dmpTree = function (tree, indent) {
        if (!indent) indent = "";
        console.log(indent+tree.name+": "+tree.type+" - "+tree.line_start+":"+tree.line_end+"    MATCH:"+tree.start_statement_matched);
        if (tree.childs.length > 0) {
            for (var i in tree.childs) {
                this.dmpTree(tree.childs[i], indent+"  ");
            }
        }
    };

    this.init = function (project, done) {


        var blockParser = parser.block('js');
        var changeBlock = blockParser.parse(fs.readFileSync("/home/dash/IdeaProjects/DizP/v3/test/code/model/test.js", 'utf8'), 'js');
        this.dmpTree(changeBlock.tree);
        return;

        /**
         * TODO: in init everything has precedence over use case files
         *
         * - update database of all use case files first (AND SKIP MERGE)
         * - Then, go through base-code and MERGE
         * - Then, go through other files and MERGE
         * - Then, merge use case files
         *
         * And change ignoreInitial to true in chokidar...
         */

        var _this               = this,
            watch_path = path.resolve(argv['watch']),
            base_code_path = path.resolve(argv['base-code']),


            test = function () {

                var aasas = 3,
                    b = 3,
                    c = [
                        '1',
                        2,
                        3,
                        function () {

                        }
                    ];
                


                var    i  =  123,
                       b  =  23;

            },
            test_paths          = [],
            usecase_paths       = [],
            mergeHelper         = new MergeHelper(db)

        fstools.walk(argv.watch, function (err, paths) {
            if (err) throw err;

            var syncs = [];
            var useCaseParser       = new parser.Usecase();

            for (var i in paths) {
                var p = path.resolve(paths[i]),
                    parser_usecase      = useCaseParser.parse(p);

                syncs.push(mergeHelper.syncUseCase(project, parser_usecase));

                if (utils.endsWith(p.toLowerCase(), '.feature')) {
                    test_paths.push(p);
                }
                if (parser_usecase) {
                    usecase_paths.push(p);
                }
            }

            Promise.all(syncs).then(function () {


                /**
                 * After sync
                 */
                if ('base-code' in argv) {

                    var bases = [];

                    bases.push(new Promise(function(resolve, reject) {
                        fstools.walk(argv['base-code'], function (err, paths) {
                            if (err) throw err;

                            var merges = [];

                            /**
                             * add files to queue
                             */
                            for (var i in paths) {
                                var path = paths[i];
                                merges.push(mergeHelper.mergeFull(project, path, base_code_path));
                            }

                            Promise.all(merges).then(function () {
                                resolve(); // finish base-code walk
                            });


                        });

                    }));
                }

                Promise.all(bases).then(function () {


                    var tests = [];

                    for (var i in test_paths) {

                        var path = paths[i];
                        tests.push(mergeHelper.mergeFull(project, path, watch_path));

                    }


                    Promise.all(tests).then(function () {

                        var usecases = [];

                        for (var i in usecase_paths) {

                            //... from uc to base code merge

                            var path = usecase_paths[i];
                            usecases.push(mergeHelper.mergePartial(project, path, watch_path))


                        }


                        Promise.all(usecases).then(function () {


                            logger.log('Initialized!');
                            // finally init is done
                            done();
                        });


                    });


                });


            });

            // a 
        });


    };


};
