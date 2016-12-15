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

                    fstools.walk(project.watch_path, function(err, paths) {
                        var uc_sizes_tab = [],
                            usecase_paths = [],

                            tree = {},
                            totalLoc = 0;

                        uc_sizes_tab.push(["Use case", "LoC", "Partials count", "Partials LoC", "Files LoC"]);

                        for (var i in paths) {
                            var p = path.resolve(paths[i]),
                                parser_usecase = useCaseParser.parse(p);
                            // calculate use case sizes, coverage in LoC, code duplication in use case layer in LoC
                            if (parser_usecase) {
                                usecase_paths.push(p);
                            } else {

                                if (argv.skip && new RegExp(argv.skip).test(p)) {

                                    logger.log("Skipping "+p);
                                    continue;
                                }

                                logger.log("Parsing "+p);

                                var lang = fstools.extractExtension(p).toLowerCase(),
                                    block = parser.block.parse(fs.readFileSync(p, 'utf8'), lang, p);
                                if (block.error) {
                                                                                    
                                    logger.log("Cannot parse "+p, "red");
                                    continue;
                                }


                                tree[p] = _this.buildTree(block.tree);
                                totalLoc += block.tree.body.split("\n").length;
                            }
                        }

                        // uc_tree[path] = merged tree of all ucs
                        var uc_tree = {};

                        for (var i in usecase_paths) {
                            logger.log("Processing a use case in "+usecase_paths[i]);
                            var parser_usecase = useCaseParser.parse(usecase_paths[i]);

                            var name = parser_usecase.name,
                                loc = fs.readFileSync(usecase_paths[i], "utf-8").split("\n").length,
                                fragments_count = parser_usecase.fragments.length,
                                fragments_loc_count = 0,
                                files_loc_count = 0;


                            for (var i in parser_usecase.fragments) {
                                var fragment = parser_usecase.fragments[i],
                                    fragment_path = path.resolve(project.watch_path, fragment.path);

                                if (argv.skip && new RegExp(argv.skip).test(fragment_path)) {

                                    logger.log("Skipping "+fragment_path);
                                    continue;
                                }
                                logger.log("Processing block "+fragment_path);

                                var fragment_lang = fstools.extractExtension(fragment_path).toLowerCase(),
                                    block = parser.block.parse(fragment.body, fragment_lang, fragment_path);

                                if (block.error) {
                                    logger.log("Cannot parse "+fragment_path, "red");
                                    continue;
                                }

                                if (!(fragment_path in uc_tree)) {
                                    uc_tree[fragment_path] = _this.buildTree(block.tree);
                                } else {
                                    uc_tree[fragment_path] = _this.mergeTrees(uc_tree[fragment_path], _this.buildTree(block.tree));
                                }
                                
                                fragments_loc_count += fragment.body.split("\n").length;
                                files_loc_count += fs.readFileSync(fragment_path, "utf-8").split("\n").length;
                            }

                            uc_sizes_tab.push([name, loc, fragments_count, fragments_loc_count, files_loc_count]);

                        }


                        // find uc_tree in tree and count loc and dups
                        //
                        //
                        var uc_loc = 0,
                            dups_loc = 0;
                        
                        for (var p in uc_tree) {
                        
                            var counted = _this.countLoc(tree[p], uc_tree[p]);

                            uc_loc += counted.uc_loc;
                            dups_loc += counted.dups_loc;
                        }

                        var uc_coverage_loc_tab = [];
                        uc_coverage_loc_tab.push(["Base LoC", "UC layer LoC", "Duplicated LoC"]);
                        uc_coverage_loc_tab.push([totalLoc, uc_loc, dups_loc]);
    
                        logger.log("");
                        logger.logH1("Size of use cases");
                        logger.log("");
                        logger.log(table(uc_sizes_tab));
 
                        logger.log("");
                        logger.logH1("Base code coverage");
                        logger.log("");
                        logger.log(table(uc_coverage_loc_tab));

                    })

                });
            });

        });
    };
    this.buildTree = function (tree) {
        
        var t = {"children": {}},
            loc = tree.body.split("\n").length;

        for (var i in tree.children) {
            var child = tree.children[i];
            if (child.name) var child_name = child.name;
            else var child_name = utils.hashCode(child.body);
            t.children[child_name] = this.buildTree(child);
            loc -= child.body.split("\n").length;
        }
        
        if (tree.name) var tree_name = tree.name;
        else var tree_name = utils.hashCode(tree.body);
 
        t["name"] = tree_name;
        t["loc"] = loc;

        return t;

    };

    this.mergeTrees = function (tree1, tree2) {
        var t = {
            "name": tree1.name,
            "children": {},
            "dups": tree1.dups?tree1.dups:0
        };
        t.dups++;

        for (var i in tree1.children) {
            if (i in tree2.children) {
                t.children[i] = this.mergeTrees(tree1.children[i], tree2.children[i]);
            } else {
                t.children[i] = tree1.children[i];
            }
        }
        for (var i in tree2.children) {
            if (i in tree1.children) {
                t.children[i] = this.mergeTrees(tree1.children[i], tree2.children[i]);
            } else {
                t.children[i] = tree2.children[i];
            }
        }

        return t;
    
    };

    this.countLoc = function (treeAll, tree) {
        
        var uc_loc = 0,
            dups_loc = 0;


        for (var i in tree.children) {
            var child = tree.children[i],
                chAll = null;

            for (var j in treeAll.children) {
                if (treeAll.children[j].name === child.name) {
                    chAll = treeAll.children[j];
                    break;
                }
            }

            if (chAll) {
                uc_loc += chAll.loc;
                if (child.dups > 1) {
                    dups_loc += chAll.loc;
                }
                var counted = this.countLoc(chAll, child);
                uc_loc+=counted.uc_loc;
                dups_loc+=counted.dups_loc;

            } else {
                console.log("ERR: You should --sync first");
            }


        }

        return {uc_loc: uc_loc, dups_loc: dups_loc};

    }

};
