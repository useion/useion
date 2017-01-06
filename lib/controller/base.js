var argv = require('minimist')(process.argv.slice(2), {
        boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help", "version"]
    }),
    fstools = require('../helpers/fstools'),
    utils = require('../helpers/utils'),
    parser = require('../parser'),
    Logger = require('../logger'),
    tmp = require('tmp'),
    fs = require('fs'),
    path = require('path'),
    watch_path = argv._.length === 1 ? path.resolve(argv._[0]) : false,
    logger = new Logger([]),
    table = require('markdown-table'),
    orm = require("orm"),
    cp = require('child_process'),
    colors = require('colors'),

    jsdiff = require('diff'),
    formatDate = function(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        hours = hours < 10 ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        var strTime = hours + ':' + minutes + ':' + seconds + ' ';
        return strTime;
        //        return date.getDate() + "." + (date.getMonth()+1) + "." + date.getFullYear() + " " + strTime;
    };;

module.exports = function(db) {

    var ctrl = this;

    this.run = function(project) {

        var Fragment = db.models.fragment,
            base = {},
            _this = this;

        return Fragment.find({
            project_id: project.id //, path: p
        }, function(err, fragments) {
            if (err) throw err;

            for (var i in fragments) {
                var fragment = fragments[i];

                var fragmentBlock = parser.block.parse(fragment.body, fragment.lang, fragment.path);

                if (fragmentBlock.error) {
                    logger.log(colors.red("Cannot parse " + fragment.path));
                } else {
                    var tree = fragmentBlock.tree;

                    // files
                    if (!(tree.name in base)) {
                        base[tree.name] = tree;
                    } else {
                        
                        // classes
                        for (var i in tree.children) {
                            var f = _this.findInTree(base[tree.name], tree.children[i]);
                            if (!f) {
                                base[tree.name].children.push(tree.children[i]);
                            } else {
                                
                                // methods
                                for (var j in tree.children[i].children) {
                                    var f2 = _this.findInTree(base[tree.name].children[f._i], tree.children[i].children[j]);

                                    if (!f2) {
                                        base[tree.name].children[f._i].children.push(tree.children[i].children[j]);
                                    } else {

                                        // up to 3 levels
                                    }
                                }
                            }
                        }


                    }


                }

            }

            _this.print(base);
        })
    }


    this.findInTree = function (tree2, child1) {
        var child2 = null;

        if (tree2 && tree2.children)
            for (var j = 0; j < tree2.children.length; j++) {
                var child2f = tree2.children[j];

                child2f._i = j;

                if (child1.name && child2f.name && child1.name === child2f.name)  {
                    child2 = child2f;
                    break;
                }
                if (!child1.name && !child2f.name && utils.similarText(child1.body, child2f.body, true) >= ctrl.consider_the_same_if_similarity_is_higher_than)  {
                    child2 = child2f;
                    break;
                }
            }
        return child2;
    }



    this.print = function(base) {


        var files = [];

        for (var i in base) {
            files.push(i);
        }

        files = files.sort();

 
        logger.logH1("List of files of the existing code of the use case concerns");
        logger.log("");
        for (var i in files) {
            logger.log(files[i]);
        }
        
        var s = base;
        logger.log("");
        logger.logH1("Structure of the existing code of the use case concerns");
        logger.log("");
        logger.log("```");

        for (var m in files) {
            var l = files[m];
            logger.log(colors.blue(s[l].name + ": " + s[l].type));

            for (var j in s[l].children) {
                logger.log(colors.gray("  |") + colors.blue(s[l].children[j].name + ": " + s[l].children[j].type));

                for (var k in s[l].children[j].children) {
                    logger.log(colors.gray("  |  |") + colors.blue(s[l].children[j].children[k].name + ": " + s[l].children[j].children[k].type));

                }
            }
            logger.log("")
        }
        logger.log("```");



    }
}
