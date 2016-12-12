
var Logger      = require('../logger'),
    parser      = require('../parser'),
    utils       = require('../helpers/utils'),
    fs = require("fs"),
    fstools     = require('../helpers/fstools'),
    Promise     = require('promise'),
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    path = require('path'),
    watch_path = argv._.length===1 ? path.resolve(argv._[0]) : false;

module.exports = function (db) {

    this.logger          = new Logger();

    this.init = function (project, done) {


        // console.log(utils.similarText("<span style=\"font-weight: bold; line-height: 30px\">{%=o.product.price%} &#8364;</span>",
        // "<a href=\"#\" class=\"btn btn-success pull-right\" role=\"button\">Add to cart</a>", true));
        // return;


        // console.log(utils.similarText(
        //     "<p style=\"max-width: 150px\">\n<a href=\"#\"></a>\n<span style=\"font-weight: bold; line-height: 30px\">{%=o.product.price%} &#8364;</span>\n<a href=\"#\" class=\"btn btn-success pull-right\" role=\"button\">Add to cart</a>\n</p>",
        //     "<p style=\"max-width: 150px\">\n<a href=\"#\"></a>\n<span style=\"font-weight: bold; line-height: 30px\">{%=o.product.price%} &#8364;</span>\n<k span></sasa>\n</p>",
        //     true));
        // return;

        // var filename = "/home/dash/Projects/DizP/v3/test/code/model/test.cs";
        // var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'cs');
        // this.logger.logTree(changeBlock.tree);
        // return;

        // var filename = "/home/dash/Projects/DizP/v3/test/code/model/test.cpp";
        // var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'cpp');
        // this.logger.logTree(changeBlock.tree);
        // return;

        // var filename = "/home/dash/Projects/DizP/v3/test/code/model/test.rb";
        // var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'rb');
        // this.logger.logTree(changeBlock.tree);
        // return;


                 /*var filename = "/home/dash/Projects/opencart/upload/catalog/view/javascript/common.js";*/
                 //var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'js', filename);
                 //console.log(changeBlock.tree.children[0].children);
                 //this.logger.logTree(changeBlock.tree);
                 //return;

        // var filename = "/home/dash/Projects/DizP/v3/eshop/view/cart.html";
        // var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'html');
        // console.log(changeBlock.tree.children[0].children);
        // this.logger.logTree(changeBlock.tree);
        // return;

        //var filename = "/home/dash/IdeaProjects/DizP/v3/test/code/model/MojaTrieda.php";
        //var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'php');
        //this.logger.logTree(changeBlock.tree);
        //return;

        //var filename = "/home/dash/IdeaProjects/DizP/v3/test/code/model/Article2.php";
        //var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'php');
        //this.logger.logTree(changeBlock.tree);
        //return;

        //var filename = "/home/dash/IdeaProjects/DizP/v3/test/code/model/save.php";
        //var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'php');
        //this.logger.logTree(changeBlock.tree);
        //return;

        // var filename = "/home/dash/Projects/opencart/upload/catalog/view/theme/default/template/checkout/checkout.tpl";
        // var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'html');
        // this.logger.logTree(changeBlock.tree);
        // return;

        //var filename = "/home/dash/IdeaProjects/DizP/v3/test/code/model/test.feature";
        //var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'feature');
        //this.logger.logTree(changeBlock.tree);
        //return;

        //var filename = "/home/dash/IdeaProjects/DizP/v3/test/code/model/test.js";
        //var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'js');
        //this.logger.logTree(changeBlock.tree);
        //return;

        //var filename = "/home/dash/IdeaProjects/DizP/v3/test/code/model/test.css";
        //var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'css');
        //this.logger.logTree(changeBlock.tree);
        //return;

        //var filename = "/home/dash/IdeaProjects/DizP/v3/test/code/model/test.py";
        //var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'py');
        //this.logger.logTree(changeBlock.tree);
        //return;

        //var filename = "/home/dash/IdeaProjects/DizP/v3/test/code/model/test.java";
        //var changeBlock = parser.block.parse(fs.readFileSync(filename, 'utf8'), 'java');
        //this.logger.logTree(changeBlock.tree);
        //return;






        //var str1 = "sa\n\n\n\nma\nb\nc\nd\n",
        //    str2 = "sa\nma\nb\n\n\n\nck\n\n\n\n\nd\n\n\n\n",
        //    merger         = new Merger(db);
        //
        //merger.mergeBodiesWithoutNewLines(str1, str2);
        //
        //return;

        //var Merger      = require('../merger'),
        //    merger         = new Merger(db);
        //
        //merger.merge({
        //    type: "full",
        //    path: "code/model/test.feature",
        //    lang: "feature",
        //    body: fs.readFileSync("/home/dash/IdeaProjects/DizP/v3/test/code/model/test.feature", "utf-8")
        //},[{
        //    type: "partial",
        //    path: "code/model/test2.feature",
        //    lang: "feature",
        //    body: fs.readFileSync("/home/dash/IdeaProjects/DizP/v3/test/code/model/test2.feature", "utf-8")
        //}], function (f) {
        //    console.log("\""+f[0].body+"\"");
        //});
        //return;

        // var
        //    useCaseParser       = new parser.Usecase(),
        //    parser_usecase      = useCaseParser.parse("/home/dash/Projects/DizP/v3/eshop/context/UnitProduct.md");
        //   //  parser_usecase2      = useCaseParser.parse("/home/dash/IdeaProjects/DizP/v3/test/code/test2.md");
        //
        // console.log(parser_usecase);
        // // console.log(parser_usecase2);
        // return;

       // var antlr4 = require('antlr4'),
       //     PHPLexer = require('../../vendor/grammars-v4/php/PHPLexer'),
       //     PHPParser = require('../../vendor/grammars-v4/php/PHPParser');
       //var input = "class Vajk {}";
       //var chars = new antlr4.InputStream(input);
       //var lexer = new PHPLexer.PHPLexer(chars);
       //var tokens  = new antlr4.CommonTokenStream(lexer);
       //var parser = new PHPParser.PHPParser(tokens);
       //parser.buildParseTrees = true;
       //
       // console.log(parser);
       // return;



        var _this               = this,
            logger              = this.logger,
            Usecase             = db.models.usecase,
            Fragment            = db.models.fragment,
            usecase_paths       = [],
            non_usecase_paths   = [];

        fstools.walk(watch_path, function (err, paths) {
            if (err) throw err;


            var remove_usecases1 = [utils.waterfallWrap(project, project.removeUsecases, [])];

            var syncs               = [],
                syncs2              = [],
                useCaseParser       = new parser.Usecase();

            for (var i in paths) {
                var p                   = path.resolve(paths[i]),
                    parser_usecase      = useCaseParser.parse(p);


                if (parser_usecase) {
                    syncs.push(utils.waterfallWrap(Usecase, Usecase.syncUC, [project, parser_usecase]));
                    syncs2.push(utils.waterfallWrap(Usecase, Usecase.syncUC, [project, parser_usecase]));

                    usecase_paths.push(p);
                } else {
                    non_usecase_paths.push(p);
                }
            }


            var full_merges = [];
            for (var i in non_usecase_paths) {

                var p = non_usecase_paths[i];
                full_merges.push(utils.waterfallWrap(Fragment, Fragment.mergeFile, [project, p, watch_path]));

            }



            var remove_usecases2 = [utils.waterfallWrap(project, project.removeUsecases, [])],
                usecase_merges = [];

            for (var i in usecase_paths) {

                var p = usecase_paths[i];
                usecase_merges.push(utils.waterfallWrap(Fragment, Fragment.mergeUsecaseFile, [project, p, watch_path]));

            }

            var actions = remove_usecases1
                .concat(syncs)
                .concat(full_merges)
                .concat(remove_usecases2)
                .concat(syncs2) // for relationships
                .concat(usecase_merges);

            utils.waterfallWithProgress(actions, actions.length, function () {

                logger.log('All synced!', 'green');
                done();
            });





        });



    };


};
