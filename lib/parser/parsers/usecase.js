
var fs      = require('fs'),
    regexps = require('../../helpers/regexps'),
    utils   = require('../../helpers/utils.js'),
    fstools = require('../../helpers/fstools.js'),
    log     = console.log.bind(console),
    cleanName = function (name) {
        return name
            .replace(/[,\.:]/g, '')
            .replace(/[\s]*$/g, '')
            .replace(/^[\s]*/g, '');
    },


    Usecase = function (name) {
        this.name = name;
        this.specializes = null;
        this.description = null;
        this.level = null;
        this.steps_ordered = [];

        //var default_user = new Actor("User");
        //default_user.description = "Default user";
        //this.actors = {User: default_user};
        this.actors = {};
        this.triggers = [];
        this.preconditions = [];
        this.postconditions = [];
        this.extension_points = {};

        this.fragments = [];
        this.tables = [];

        // defacto ID
        this.path = null;
    },

    Actor = function (name) {
        this.name = cleanName(name);
        this.description = null;
    },

    Step = function (name) {
        this.type = 'step';
        this.no = null;
        this.name = cleanName(name);
        this.section = null;
        this.orig_name = null;
        this.played_by = null;
        this.args = [];
        this.inherited = false;
    },

    Condition = function (name) {
        this.type = 'condition';
        this.no = null;
        this.name = cleanName(name);
        this.section = null;
        this.orig_name = null;
        this.played_by = null;
        this.args = [];
        this.inherited = false;
    };

module.exports = function () {

    this.sections = [
        "usecase",
        "actors",
        "triggers",
        "main_scenario",
        "main_scenario_fragment",
        "alternate_flows",
        "preconditions",
        "postconditions",
        "extension_points",
        "code",
        "tests"
    ];

    this.system_actors = [
        "System"
    ];

    this.line_separator = " ";

    this.parse = function (path) {

        var data = (fs.existsSync(path)) ? fs.readFileSync(path, 'utf8') : path,
            //match = regexps.comments().exec(data),
            //lines = (match && match.length >= 1) ? match[0].split("\n") : [],
            lines = data.split(/\r\n?|\n/),
            line_start = 0,
            line_end = 0,
            last_line_end = 0,
            skip_to = -1,

            section = null,
            prev_sect = null,
            section_line_no = 0,
            uc = null,
            actor = null,
            condition = null,
            step = null,
            fragment_i = null,

            sections_start_line = {},
            sections_end_line = {},

            step_no_test = 1;

        for (i in lines) {

            line_start = line_end;
            last_line_end = line_end;
            line_end = line_start + (lines[i].length+"\n".length);

            if (skip_to != -1) {
                if (i == skip_to) {
                    skip_to = -1;
                } else {
                    continue;
                }
            }

            var line = lines[i];//.replace(regexps.comments_trash(), '');

            // Remove underlines
            if (/^[\-=]+$/.test(line)) continue;

            // remove empty lines
            //if (/^\s*$/.test(line)) continue;

            // check section and count line per section
            var s;
            prev_sect = section;
            section = (s = this.get_section(line)) ? s : section;
            if (section == "main_scenario_fragment" && prev_sect != "usecase") {
                section = prev_sect;
            }
            if (section === prev_sect) section_line_no++; else section_line_no=1;

            if (section_line_no === 1 && uc)
              sections_start_line[section] = parseInt(i)+1;
            if (section !== prev_sect && uc) {
              if (utils.contains([
                "actors",
                "triggers",
                "main_scenario",
                "main_scenario_fragment",
                "alternate_flows",
                "preconditions",
                "postconditions",
                "extension_points"
              ], prev_sect)) {
                sections_end_line["usecase"] = parseInt(i);
              }
              sections_end_line[prev_sect] = parseInt(i);
            }


            switch (section) {
                case "usecase":
                    if (section_line_no === 1) {
                        if (regexps.use_case_specializes().test(line)) {
                            var specializes = line.match(regexps.use_case_specializes());

                            uc = new Usecase(line
                                .replace(regexps.use_case_begin(), '')
                                .replace(regexps.use_case_specializes(), '')
                                .replace(/\s*$/, ''));

                            uc.specializes = specializes[1].replace(/\s*$/, '');

                        } else {
                            uc = new Usecase(line.replace(regexps.use_case_begin(), ''));
                        }

                        sections_start_line[section] = parseInt(i)+1;

                        uc.body = data;
                        uc.path = path;
                        uc.level = path.split('/')[path.split('/').length-2];

                    } else {
                        uc.description =
                            this.append(line, uc.description);
                    }

                    break;
                case "actors":

                    if (uc === null) break;

                    if (section_line_no === 1)
                        continue;

                    if (regexps.actor_name().test(line)) {
                        var actor_name = regexps.actor_name().exec(line).toString().replace(/[\s]*:[\s]*$/, '');
                        actor = new Actor(actor_name);
                        uc.actors[actor.name] = actor;
                        actor.description = line.replace(regexps.actor_name(), '').replace(/^[\s]*/, '');
                    } else {
                        if (actor !== null)
                            actor.description =
                                this.append(line, actor.description);
                    }

                    break;

                case "extension_points":

                    if (uc === null) break;

                    if (section !== prev_sect) condition = null;

                    if (section_line_no === 1)
                        continue;

                    var a = utils.args.extract(line.replace(new RegExp('^' + user + "\\s+"), ''));
                    var ar = a['args'];
                    if (ar.length === 2) {
                        uc.extension_points[ar[1]] = {"name": ar[0],"step_no": ar[1]};
                        uc.steps_ordered.push(ar[1]);
                    }

                    break;

                case "triggers":
                case "preconditions":
                case "postconditions":

                    if (uc === null) break;

                    if (section !== prev_sect) condition = null;

                    if (section_line_no === 1)
                        continue;

                    var orig_name = line;

                    // inherited
                    var inherited = false;
                    if (regexps.step_inherited().test(line)) {
                        line = line.replace(regexps.step_inherited(), '');
                        inherited = true;
                    }

                    /*
                     * Check if there is a new condition by users
                     * if user variable is not null, there is a new condition by the user
                     */
                    var u,
                        user = null;
                    for (var a in uc.actors) {
                        u = a;
                        if (utils.startsWith(line, u))
                            user = u;
                    }

                    // check if there is a new condition by system
                    for (var i in this.system_actors) {
                        u = this.system_actors[i];
                        if (utils.startsWith(line, u))
                            user = u;
                    }

                    if (user !== null) {
                        // new condition by actor


                        // remove user from line
                        var t_name = utils.args.extract(line.replace(new RegExp('^'+user+"\\s+"), ''));

                        condition = new Condition(t_name['name']);
                        condition.orig_name = orig_name;
                        condition.args = condition.args.concat(t_name['args']);
                        condition.played_by = user;
                        condition.inherited = inherited;

                        if (section === "triggers")
                            uc.triggers.push(condition);
                        else if (section === "preconditions")
                            uc.preconditions.push(condition);
                        else if (section === "postconditions")
                            uc.postconditions.push(condition);

                    } else {

                        var t_name = utils.args.extract(line);

                        if (condition !== null) {
                            // existing condition written in multiple lines
                            condition.name =
                                this.append(t_name['name'], condition.name);
                            condition.orig_name = orig_name;
                            condition.args = condition.args.concat(t_name['args']);
                            condition.inherited = inherited;
                        }
                        else {
                            // condition without actor
                            if (t_name['name']) {
                                condition = new Condition(t_name['name']);
                                condition.orig_name = orig_name;
                                condition.args = condition.args.concat(t_name['args']);
                                condition.inherited = inherited;

                                if (section === "triggers")
                                    uc.triggers.push(condition);
                                else if (section === "preconditions")
                                    uc.preconditions.push(condition);
                                else if (section === "postconditions")
                                    uc.postconditions.push(condition);

                                // if no user or system actors are specified, act as a new condition per line
                                condition = null;
                            }
                        }
                    }


                    break;

                case "main_scenario":
                case "main_scenario_fragment":
                case "alternate_flows":

                    if (uc === null) break;

                    if ((section == "main_scenario" || section == "main_scenario_fragment")   && section_line_no === 1) {
                        uc.steps = {};
                        continue;
                    }
                    if (section == "alternate_flows" && section_line_no === 1)
                        continue;

                    if (section == "main_scenario_fragment" && !/^\s*$/.test(line)) {
                        var step_no = (step_no_test++)+".",
                            step_name = line;

                        step = new Step(step_name);

                        step.section = "main_scenario";
                        step.orig_name = step_name;
                        step.no = step_no;
                        uc.steps_ordered.push(step_no);
                        step.args = [];
                        step.inherited = false;

                        uc.steps[step_no] = step;
                    }
                    else

                    if (regexps.step_begin().test(line)) {
                        var orig_name = line,
                            step_no = regexps.step_begin().exec(line).toString(),
                            step_name = line.replace(regexps.step_begin(), '').replace(/^[\s]*/, '');

                        // inherited
                        var inherited = false;
                        if (regexps.step_inherited().test(step_name)) {
                            step_name = step_name.replace(regexps.step_inherited(), '');
                            inherited = true;
                        }

                        /*
                         * Check if there is a new step by users
                         * if user variable is not null, there is a new step by the user
                         */
                        var u,
                            user = null;
                        for (var a in uc.actors) {
                            u = a;
                            if (utils.startsWith(step_name, u))
                                user = u;
                        }

                        // check if there is a new trigger by system
                        for (var i in this.system_actors) {
                            u = this.system_actors[i];
                            if (utils.startsWith(step_name, u))
                                user = u;
                        }

                        if (user !== null) {
                            // new step by actor

                            // remove user from step_name
                            var t_name = utils.args.extract(step_name.replace(new RegExp('^' + user + "\\s+"), ''));

                            if (!regexps.condition_begin().test(line))
                                step = new Step(t_name['name']);
                            else
                                step = new Condition(t_name['name']);

                            step.section = section;
                            step.orig_name = orig_name;
                            step.no = step_no;
                            uc.steps_ordered.push(step_no);
                            step.args = step.args.concat(t_name['args']);
                            step.played_by = user;
                            step.inherited = inherited;

                            uc.steps[step_no] = step;
                        } else {
                            var t_name = utils.args.extract(step_name);

                            // trigger without actor
                            if (!regexps.condition_begin().test(line))
                                step = new Step(t_name['name']);
                            else
                                step = new Condition(t_name['name']);

                            step.section = section;
                            step.orig_name = orig_name;
                            step.no = step_no;
                            uc.steps_ordered.push(step_no);
                            step.args = step.args.concat(t_name['args']);
                            step.inherited = inherited;

                            uc.steps[step_no] = step;

                        }
                    } else {

                        // existing step written in multiple lines
                        if (step !== null) {
                            var orig_name = line,
                                t_name = utils.args.extract(line);
                            step.name =
                                cleanName(this.append(t_name['name'], step.name));
                            // step.orig_name+=orig_name;
                            step.args = step.args.concat(t_name['args']);
                        }
                    }

                    break;

            /**
             * extract fragments
             */
                case "code":
                case "tests":

                    if (section == "code"   && section_line_no === 1) {
                        fragment_i = null;
                        continue;
                    }
                    if (section == "tests"   && section_line_no === 1) {
                        fragment_i = null;
                        continue;
                    }


                    /**
                     * Start and parse whole table
                     */
                    //if (fragment_i === null && this.isTable(lines, i)) {
                    //
                    //    uc.tables.push({
                    //        section:    section,
                    //        table:      this.parseTable(lines, i)
                    //    });
                    //
                    //    skip_to = this.endTable(lines, i);


                        /**
                         * Start fragment
                         */
                    //} else
                    if ( ( fragment_i === null && regexps.fragment_begin().test(line) )
                    || ( fragment_i !== null && uc.fragments[fragment_i]['end_line'] != -1 && regexps.fragment_begin().test(line) )
                    ) {
                        var orig = line,
                            path = line.replace(regexps.fragment_begin(), '').replace(/^[\s]*/, ''),
                            lang = fstools.extractExtension(path).toLowerCase();

                        var strategy = null;
                        if (utils.startsWith(path, "=")) {
                            strategy = "=";
                        }
                        path = path.replace(/^=/, '');
                        uc.fragments.push({
                            use_case_file_path: path,
                            fragment_start_line: parseInt(i) + 1,
                            position: 0,
                            start_line: -1,
                            end_line:   -1,
                            start:    -1,
                            end:      -1,
                            path:     path,
                            body:     "",
                            section:  section,
                            lang:     lang,
                            notation: null,
                            strategy: strategy
                        });
                        fragment_i = uc.fragments.length-1;

                        /**
                         * Concat other fragment lines
                         */
                    } else if (fragment_i in uc.fragments) {

                        var skip_line = false;
                        // check notation
                        if (!uc.fragments[fragment_i].notation) {
                            for (var j_notation in regexps.fragment_notations) {
                                var notation_start = regexps.fragment_notations[j_notation].start;
                                if (notation_start().test(line)) {
                                    uc.fragments[fragment_i].notation = j_notation;

                                    // special case in this notation of language
                                    if (j_notation == '```') {

                                        //var lang = line.match(notation_start());
                                        //uc.fragments[fragment_i]['lang'] = lang[1];
                                        uc.fragments[fragment_i]['start'] = line_end;
                                        uc.fragments[fragment_i]['start_line'] = parseInt(i) + 1; // because of 0

                                        // skip this line
                                        skip_line = true;
                                    }


                                    if (j_notation == '    ') {
                                        uc.fragments[fragment_i]['start'] = line_start;
                                        uc.fragments[fragment_i]['start_line'] = parseInt(i) + 1; // because of 0
                                    }

                                    break;
                                }
                            }
                        }
                        if (skip_line) continue;

                        if (uc.fragments[fragment_i].notation) {


                            switch (uc.fragments[fragment_i].notation) {
                                case '```':
                                    if (regexps.fragment_notations['```'].end().test(line)) {
                                        // skip end ```
                                        uc.fragments[fragment_i]['end'] = line_end;
                                        uc.fragments[fragment_i]['end_line'] = parseInt(i) + 1;
                                        fragment_i = null;
                                    } else {
                                        uc.fragments[fragment_i]['body'] += line + "\n";
                                    }
                                    break;
                                case '    ':

                                    var j = parseInt(i)+1;
                                    while (/^\s*$/.test(lines[j])) {
                                        j += 1;
                                    }

                                    if (regexps.fragment_notations['    '].end().test(lines[j])) {

                                        if (regexps.fragment_notations['    '].end().test(line) ||
                                            regexps.fragment_notations['    '].end().test(lines[parseInt(i) + 1])) {

                                            if (!(regexps.fragment_notations['    '].end().test(line)) &&
                                                (regexps.fragment_notations['    '].end().test(lines[parseInt(i) + 1]))) {

                                                uc.fragments[fragment_i]['body'] += line.replace(/^[\s]{4}/, '') + "\n";
                                            }

                                            uc.fragments[fragment_i]['end'] = line_end;
                                            uc.fragments[fragment_i]['end_line'] = parseInt(i) + 1;
                                            fragment_i = null;
                                        } else {
                                            uc.fragments[fragment_i]['body'] += line.replace(/^[\s]{4}/, '') + "\n";
                                        }

                                    } else {
                                        uc.fragments[fragment_i]['body'] += line.replace(/^[\s]{4}/, '') + "\n";
                                    }
                                    break;
                            }

                        }

                    }

                    break;

            }

        }

        // remove newlines from the end, because they are added there manually: + "\n"
        if (uc) {
            sections_end_line[section] = parseInt(i)+1;
            uc.sections_start_line = sections_start_line;
            uc.sections_end_line = sections_end_line;

            // if ("code" in sections_start_line && "code" in sections_end_line) {
            //   uc.code_section = utils.extractLinesRange(data, sections_start_line["code"], sections_end_line["code"]);
            // }
            // if ("tests" in sections_start_line && "tests" in sections_end_line) {
            //   uc.tests_section = utils.extractLinesRange(data, sections_start_line["tests"], sections_end_line["tests"]);
            // }

            var path_positions = {};
            for (var i in uc.fragments) {

                if (!(uc.fragments[i].path in path_positions))
                    path_positions[uc.fragments[i].path] = 0;
                else
                    path_positions[uc.fragments[i].path] += 1;

                uc.fragments[i].position = path_positions[uc.fragments[i].path];
                uc.fragments[i].body = uc.fragments[i].body.replace(/(\r\n?|\n)$/, '');
            }
        }

        // if (uc && uc.triggers && uc.triggers) {
        //     console.log('Trigger');
        //     console.log(uc.triggers);
        // }
        // if (uc && uc.extension_points && uc.extension_points) {
        //     console.log('Extension point');
        //     console.log(uc.extension_points);
        // }
        return uc;

    };

    this.isTable = function (lines, i) {
        i = parseInt(i);

        var table_len =  (lines[i].match(/\|/g) || []).length;

        if (   table_len    >= 1  &&
              lines.length >= i+1 &&
             (lines[i+1].match(/\|/g) || []).length      === table_len &&
             (lines[i+1].match(/---/g) || []).length     >= table_len-1 ) {
            return true;
        } else {
            return false;
        }

    };
    this.parseTable = function (lines, i) {
        i = parseInt(i);

        var header = lines[i].split("|"),
            len = header.length - 1,
            table = [];

        // skip | --- | --- |
        i += 2;

        while (lines.length >= i && (lines[i].match(/\|/g) || []).length === len) {
            var item = lines[i].split("|"),
                itemT = {};

            for (var j = 0; j < len; j++) {
                var key = header[j].replace(/^\s*/, '').replace(/\s*$/, ''),
                    value = item[j].replace(/^\s*/, '').replace(/\s*$/, '');
                if (!key) continue;
                itemT[key] = value;
            }

            table.push(itemT);

            i += 1;
        }
        return table;

    };
    this.endTable = function (lines, i) {
        i = parseInt(i);

        var len = (lines[i].match(/\|/g) || []).length;
        i+=1;

        while (lines.length >= i+1 && (lines[i].match(/\|/g) || []).length === len) {
            i+=1;
        }

        return i;
    };

    this.append = function (line, text) {
        if (text === null)
            text = line;
        else
            text += this.line_separator+line;
        return text;
    };

    this.get_section = function(line) {
        var i, section, section_regexp;
        for (i in this.sections) {
            section = this.sections[i];
            section_regexp = regexps.sections[section]();
            if (section_regexp.test(line)) {
                return section;
            }
        }
        return false;
    };
};
