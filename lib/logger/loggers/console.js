
var
    colors = require('colors'),
    jsdiff = require('diff'),
    pathLib  = require('path'),
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    path = require('path'),
    watch_path = argv._.length===1 ? path.resolve(argv._[0]) : false,
    helper = {
        diff: function (body1, body2) {
            return this.extractChanges(jsdiff.diffLines(body1, body2));
        },
        extractChanges: function (diffs) {
            var changes = [];
            for (var i in diffs) {
                if (diffs[i].added || diffs[i].removed) {
                    changes.push(diffs[i])
                }
            }
            return changes
        },
        makeHumanReadablePath: function (path) {
            return pathLib.resolve(path).replace(new RegExp("^"+pathLib.resolve(argv.watch)), '');
        }
    };
    // disable colors
    //colors = {
    //    blue: function (str) { return str; },
    //    yellow: function (str) { return str; },
    //    magenta: function (str) { return str; },
    //    cyan: function (str) { return str; },
    //    white: function (str) { return str; },
    //    green: function (str) { return str; },
    //    red: function (str) { return str; },
    //    grey: function (str) { return str; },
    //    bold: function (str) { return str; },
    //},
    formatDate = function (date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        hours = hours < 10 ? '0'+hours : hours;
        minutes = minutes < 10 ? '0'+minutes : minutes;
        seconds = seconds < 10 ? '0'+seconds : seconds;
        var strTime = hours + ':' + minutes + ':' + seconds + ' ';
        return strTime;
//        return date.getDate() + "." + (date.getMonth()+1) + "." + date.getFullYear() + " " + strTime;
    };

module.exports = function () {

    this.registerObserver = function () {

    };

    this.log = function (message, color) {
        var c = colors.white;
        if (color) {
            c = colors[color];
        }
        console.log(c(message));
    };
    this.logH1 = function (text) {

      this.log("# "+text);
      return;

        this.log("");
        var message = text;
        var spaces_str = "";
        for (var k = 0; k < message.length; k++) {
            spaces_str += "=";
        }
        this.log(spaces_str+"\n"+message+"\n"+spaces_str+"\n"+"\n");
        //this.log("");

    };
    this.logH2 = function (text) {

      this.log("## "+text);
      return;

        this.log("");
        var message = text;
        var spaces_str = "";
        for (var k = 0; k < message.length; k++) {
            spaces_str += "-";
        }
        this.log(spaces_str+"\n"+message+"\n"+spaces_str+"\n"+"\n");
        //this.log("");

    };

    this.logFragmentsChanges = function (fragments_changes) {

        // divide to sections
        var fragmentChangesArr = fragments_changes.update.concat(fragments_changes.create);
        var f_sections = {
            'code': {
                change: [],
                remove: []
            },
            'tests': {
                change: [],
                remove: []
            }
        };
        for (var i in fragmentChangesArr) {
            var fragment = fragmentChangesArr[i];
            switch (fragment.section) {
                case 'tests':
                    fragment['full_path'] = watch_path + "/" + fragment.path;
                    f_sections.tests.change.push(fragment);
                    break;
                case 'code':
                    fragment['full_path'] = watch_path + "/" + fragment.path;
                    f_sections.code.change.push(fragment);
                    break;
            }
        }
        for (var i in fragments_changes.remove) {
            var fragment = fragments_changes.remove[i];
            switch (fragment.section) {
                case 'tests':
                    fragment['full_path'] = watch_path + "/" + fragment.path;
                    f_sections.tests.remove.push(fragment);
                    break;
                case 'code':
                    fragment['full_path'] = watch_path + "/" + fragment.path;
                    f_sections.code.remove.push(fragment);
                    break;
            }
        }

        if (f_sections.code.change.concat(f_sections.code.remove).length != 0) {
            var m_title = "Code";
            var spaces_str = "";
            for (var k = 0; k < m_title.length; k++) {
                spaces_str += "-";
            }
            this.log(spaces_str+"\n"+m_title+"\n"+spaces_str+"\n"+"\n");
        }

        for (var i in f_sections.code.change) {
            var fragment = f_sections.code.change[i];
            if (fragment.last_body != fragment.body) {
                this.logFragmentChange(helper.makeHumanReadablePath(fragment['full_path']), fragment.last_body, fragment.body);
            }
        }
        for (var i in f_sections.code.remove) {
            var fragment = f_sections.code.remove[i];
            this.log("Fragment removed: "+helper.makeHumanReadablePath(fragment['full_path']), "red");
        }


        if (f_sections.tests.change.concat(f_sections.tests.remove).length != 0) {
            var m_title = "Tests";
            var spaces_str = "";
            for (var k = 0; k < m_title.length; k++) {
                spaces_str += "-";
            }
            this.log(spaces_str+"\n"+m_title+"\n"+spaces_str+"\n"+"\n");
        }

        for (var i in f_sections.tests.change) {
            var fragment = f_sections.tests.change[i];
            if (fragment.last_body != fragment.body) {
                this.logFragmentChange(helper.makeHumanReadablePath(fragment['full_path']), fragment.last_body, fragment.body);
            }
        }
        for (var i in f_sections.tests.remove) {
            var fragment = f_sections.tests.remove[i];
            this.log("Fragment removed: "+helper.makeHumanReadablePath(fragment['full_path']), "red");
        }

    };

    this.logFragmentChange = function (path, body1, body2) {

        if (body1 === body2) return;

        var message = "";

        var m_title = ""+path;
        message += colors.blue(m_title+":\n"+"\n");

        var diff = helper.diff(body1, body2);

        for (var j in diff) {
            if (diff[j].added) {
                var lines = diff[j].value.split("\n");

                for (var k in lines) {
                    message += colors.green("+ ") + colors.white(lines[k]) + "\n";
                }
            }
            if (diff[j].removed) {
                var lines = diff[j].value.split("\n");

                for (var k in lines) {
                    message += colors.red("- ") + colors.white(lines[k]) + "\n";
                }
            }
        }

        console.log(message);
    };




    this.logUsecase = function (usecase, changes) {
        var message = this.recursiveLogUsecase(usecase, 0, changes);
        console.log(message);
    };

    this.recursiveLogUsecase = function (usecase, level, changes) {

        var message = "";
        if (usecase !== null) {

          this.logH1(usecase.name);
          this.log("");

            // var spaces_str = "";
            // for (var k = 0; k < usecase.name.length; k++) {
            //     spaces_str += "-";
            // }
            // message += spaces_str+"\n"+usecase.name+"\n"+spaces_str+"\n"+"\n";
        }

        var spaces = 2,
            levels = [
                colors.blue,
                colors.yellow,
                colors.magenta,
                colors.cyan,
                colors.blue,
                colors.yellow,
                colors.magenta,
                colors.cyan
            ];

        for (var i in changes) {
            var key = i,
                spaces_str = "";

            for (var k = 0; k < spaces*level; k++) {
                spaces_str += " ";
            }

            // go through
            if (Object.prototype.toString.call(changes[i]) == "[object Object]") {

                message += spaces_str + levels[level](key+":") + "\n";
                message += this.recursiveLogUsecase(null, level+1, changes[i]) + "\n";

            } else if (Object.prototype.toString.call(changes[i]) === "[object Array]") {

                message += spaces_str + levels[level](key+":") + "\n";
                message += this.recursiveLogUsecase(null, level+1, changes[i]) + "\n";

            } else {

                message += spaces_str + levels[level](key+":\t") + "`" + changes[i] + "`" + "\n";
            }
        }

        return message;
    };




    this.logTree = function (tree, indent) {
        if (!indent) indent = "";
        if (!tree.line_end) {
            console.log(colors.red('ERROR:'));
        }
        var start = tree.start_statement_matched,
            end = tree.end_statement_matched;

        if (start)  start = start.replace(/\n/g, "\\n");
        if (end)    end = end.replace(/\n/g, "\\n");

        console.log(indent+tree.name+":\t"+colors.grey(tree.type)+",\t"+colors.blue(tree.line_start+"-"+tree.line_end)+"\t\t\""+start+"\""+"\t"+"\""+end+"\"");

        if (tree.children.length > 0) {
            for (var i in tree.children) {
                this.logTree(tree.children[i], indent+"  "+colors.grey("|"));
            }
        }
    };
};
