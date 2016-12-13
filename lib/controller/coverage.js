var Logger = require('../logger'),
    logger = new Logger([]),
    parser = require('../parser'),
    utils = require('../helpers/utils'),
    similarity = require('../similarity'),
    coverage = require('../coverage'),
    tmpl = require("blueimp-tmpl"),
    fs = require("fs"),
    regexps = require('../helpers/regexps'),
    fstools = require('../helpers/fstools'),
    Promise = require('promise'),
    argv = require('minimist')(process.argv.slice(2), {
        boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
    }),
    path = require('path'),
    table = require('markdown-table'),
    extractNamesFromCode = function(fragment, names, allowed_types) {
        if (!names)
            var names = [];

        if (fragment.name && (!allowed_types || (allowed_types && utils.contains(allowed_types, fragment.type))))
            names.push(fragment.name);

        for (var i in fragment.children) {
            var child = fragment.children[i];
            names = extractNamesFromCode(child, names, allowed_types);
        }

        return names;
    };

module.exports = function(db) {

    this.generate = function(project) {

        // print header
        // console.log(tmpl(fs.readFileSync("./lib/coverage/template-head.md", "utf-8"), {
        //     colors: require('colors')
        // }));

        var _this = this,
            Usecase = db.models.usecase,
            Step = db.models.step,
            useCaseParser = new parser.Usecase();

        Usecase.find({
            project: project
        }, ["name", "A"], function(err, usecases) {
            if (err) throw err;

            var actions = [];

            for (var i in usecases) {
                var usecase = usecases[i];
                actions.push(utils.waterfallWrap(usecase, usecase.getCoverage, [false]));
            }

            utils.waterfall(actions, function(ress) {
                fs.readFile("./lib/coverage/template2.md", "utf-8", function(err, template) {
                    for (var i in ress) {
                        console.log(tmpl(template, ress[i]));
                    }

                    fstools.walk(project.watch_path, function(paths) {
                        var uc_sizes_tab = [],
                            usecase_paths = [];
                        uc_sizes_tab.push(["Use case", "LoC", "Number of Partials", "LoC of Partials", "LoC of Files"]);

                        for (var i in paths) {
                            var p = path.resolve(paths[i]),

                                parser_usecase = useCaseParser.parse(p);

                            // calculate use case sizes, coverage in LoC, code duplication in use case layer in LoC
                            if (parser_usecase) {

                                usecase_paths.push(p);

                            } else {
                                var lang = fstools.extractExtension(p).toLowerCase(),
                                    block = parser.block.parse(fs.readFileSync(p, 'utf8'), lang, p);

                                // create tree with LoC
                            }
                        }

                        for (var i in usecase_paths) {
                            var parser_usecase = useCaseParser.parse(usecase_paths[i]);

                            var name = parser_usecase.name,
                                loc = fs.readFileSync(p, "utf-8").split("\n").length,
                                fragments_count = parser_usecase.fragments.length,
                                fragments_loc_count = 0,
                                files_loc_count = 0;


                            for (var i in parser_usecase.fragments) {
                                var fragment = parser_usecase.fragments[i],
                                    fragment_path = path.resolve(watch_path, fragment.path),
                                    fragment_lang = fstools.extractExtension(fragment_path).toLowerCase(),
                                    block = parser.block.parse(fragment.body, fragment_lang, fragment_path);


                                // find in tree, count
                                //
                                
                                fragments_loc_count += fragment.body.split("\n").length;
                                files_loc_count += fs.readFileSync(fragment_path, "utf-8").split("\n").length;
                            }

                            uc_sizes_tab.push([name, loc, fragments_count, fragments_loc_count, files_loc_count]);

                        }
                    })

                });
            });

        });
    };

};
