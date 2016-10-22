
var Logger      = require('../logger'),
    logger      = new Logger([]),
    parser      = require('../parser'),
    utils       = require('../helpers/utils'),
    similarity       = require('../similarity'),
    coverage       = require('../coverage'),
    tmpl = require("blueimp-tmpl"),
    fs = require("fs"),
    regexps     = require('../helpers/regexps'),
    fstools     = require('../helpers/fstools'),
    Promise     = require('promise'),
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    path = require('path'),
    table = require('markdown-table'),
    extractNamesFromCode = function (fragment, names, allowed_types) {
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

module.exports = function (db) {

    this.generate = function (project) {

        // print header
        // console.log(tmpl(fs.readFileSync("./lib/coverage/template-head.md", "utf-8"), {
        //     colors: require('colors')
        // }));

        var _this = this,
            Usecase = db.models.usecase,
            Step = db.models.step;

        Usecase.find({project: project}, [ "name", "A" ], function (err, usecases) {
            if (err) throw err;

            var actions = [];

            for (var i in usecases) {
              var usecase = usecases[i];
              actions.push(utils.waterfallWrap(usecase, usecase.getCoverage, [false]));
            }

            utils.waterfall(actions, function (ress) {
              fs.readFile("./lib/coverage/template2.md", "utf-8", function (err, template) {
                for (var i in ress) {
                  console.log(tmpl(template, ress[i]));
                }
              });
            });

        });
    };

};
