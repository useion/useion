
var utils       = require('../../../helpers/utils'),
    XRegExp     = require('xregexp'),
    Logger      = require('../../../logger'),
    logger      = new Logger([]),

    r = function (regexp) {
        return eval(regexp.toString());
    };

module.exports = {
    parse: function (body, lang, path, offset) {

        try {
            if (lang === "tpl") lang = "html";
            require.resolve('./drivers/'+lang);
        } catch(e) {
            return { error: true };
        }

        if (!offset) offset = {
            lines:0, chars:0
        };

        var driver = require('./drivers/'+lang);

        var blocks = [],
            char,

            // start count lines at 1
            line_i = 1,

            // indent handling
            indent = driver.indent,
            indent_character = driver.indent_character,
            indent_level = 0,
            indent_first_character = false,
            indent_levels = {},


            // statement names
            statement_names = {},


            // characters where statements start and end
            start_statements_i = {},
            end_statements_i = {},


            // line numbers start, end,
            statement_line_starts = {},
            statement_line_ends = {},

            // character start, end,
            statement_char_starts = {},
            statement_char_ends = {},

            // types (class, method ...)
            statement_types = {},

            // regular expressions
            start_statement_regexp = {},
            end_statement_regexp = {},

            // matches
            start_statement_matched = {},
            end_statement_matched = {},

            statements = {},

            // ids
            started_statement_ids = [],
            started_statement_is = [],
            statements_ids = {}, // statements_ids[statement_id] = i;

            started_ignore_statements = [],

            // parents of statement_id = statement_parents_ids[statement_id]
            statement_parents_ids = {},

            // bodies
            statement_bodies = [],

            // when the next statement can start or end
            next = -1,


            Statement = function () {
                this.id = null;
                this.matched = null;
                this.pos = null;
                this.possible_ends = null;
            },


            Block = function (id, body) {

                this.body_character = body; // body extracted from characters
                this.children = [];

                this.id = id;
                this.children_ids = []; // children
                this.type = null; // class, method...

                this.name = null;
                this.body = body;  // body extracted from lines
                this.line_start = null; // number of start line
                this.line_end = null; // number of end line

                this.line_preserve_start_whitespaces = "";
                this.line_preserve_end_whitespaces = "";

                this.start_statement = null; // statement starts with (match based on number of lines)
                this.end_statement = null;

                this.start_statement_regexp = null; // regexp
                this.start_statement_matched = null; // matched start statement
                this.start_statement_line_start = null; // number of line start from the whole document
                this.start_statement_line_end = null;
                this.start_statement_line_in_start = null; // number of line start from the start of statement
                this.start_statement_line_in_end = null;

                this.end_statement_regexp = null;
                this.end_statement_matched = null;
                this.end_statement_line_start = null;
                this.end_statement_line_end = null;
                this.end_statement_line_in_start = null;
                this.end_statement_line_in_end = null;
            },

            parse_error = false;


        var body_before_matching = ""+body,
            possible_ends_cache = {};

        for (var i in driver.before_matching) {
            body_before_matching = driver.before_matching[i](body_before_matching)
        }

        for (var s in driver.statement) {

            var driver_statement = driver.statement[s],
                match,
                pos = 0,
                possible_ends = {};

            // find possible ends for this driver_statement
            if (driver_statement.end) {
                if (!(driver_statement.end in possible_ends_cache)) {
                    while (match = XRegExp.exec(body_before_matching, r(driver_statement.end), pos)) {
                        pos = match.index;
                        var statement = utils.extend(new Statement(), driver_statement);
                        statement.pos = match.index;
                        statement.matched = match[0];
                        possible_ends[match.index] = statement;
                        pos = match.index + match[0].length;
                    }
                    possible_ends_cache[driver_statement.end] = possible_ends;
                } else {
                    possible_ends = possible_ends_cache[driver_statement.end];
                }
            }

            // find starts and their positions
            pos = 0;
            while (match = XRegExp.exec(body_before_matching, r(driver_statement.start), pos)) {

                pos = match.index;
                var statement = utils.extend(new Statement(), driver_statement);
                statement.pos = match.index;
                statement.matched = match[0];
                statement.possible_ends = possible_ends;
                if (!(match.index in statements))
                    statements[match.index] = statement;
                pos = match.index + match[0].length;
            }

        }



        for (var i = 0, len = body.length; i < len; i++) {

            char        = body[i];

            if (!indent_first_character && char === indent_character) {
                indent_level += 1;
            } else {
                indent_first_character = true;
            }


            var last_type = "unknown";
            if (Object.keys(statement_parents_ids).length > 0) {
                last_type = statement_types[started_statement_ids[started_statement_ids.length-1]];
                if (!last_type) last_type = "unknown";
            }


            var end_ignore = false;
            for (var j in driver.ignore_statement_inside) {
                // There can be only one ignore statement
                if (
                    started_ignore_statements.length === 1 &&
                    driver.ignore_statement_inside[j].start !== started_ignore_statements[0]
                ) continue;

                if (last_type == "comment") continue;

                if (driver.ignore_statement_inside[j].ignore) {
                    var skip = false;
                    for (var k in driver.ignore_statement_inside[j].ignore) {
                        var ignore = driver.ignore_statement_inside[j].ignore[k],
                            possible_string_range = "";

                        for (var l = -ignore.length, m = ignore.length; l < m; l++) {
                            possible_string_range += body[i+l];
                        }

                        if (possible_string_range.indexOf(ignore) > -1) {
                            skip = true;
                            continue;
                        }
                    }
                    if (skip) continue;
                }

                var start = driver.ignore_statement_inside[j].start,
                    end = driver.ignore_statement_inside[j].end,
                    escape = driver.ignore_statement_inside[j].escape,

                    start_chars = "",
                    end_chars = "",
                    escape_chars = "";

                //check if is escaped
                if (escape !== null) {
                    for (var k = 0, l = escape.length; k < l; k++)
                        escape_chars = body[i-k]+escape_chars;

                    if (escape_chars === escape) {
                        continue;
                    }
                }

                for (var k = 0, l = start.length; k < l; k++)
                    start_chars += body[i+k];
                for (var k = 0, l = end.length; k < l; k++)
                    end_chars += body[i+k];

                if ((start !== end && start_chars === start)   ||
                    (start === end && start_chars === start && started_ignore_statements.indexOf(start) === -1)) {

                    started_ignore_statements.push(start);

                } else if (end_chars === end && started_ignore_statements.indexOf(start) !== -1) {

                    started_ignore_statements.splice(started_ignore_statements.indexOf(start), 1);
                    // move and skip
                    i += end_chars.length-1;
                    end_ignore = true;
                }
            }
            if (end_ignore) continue;


            for (var j in started_statement_ids) {
                statement_bodies[started_statement_ids[j]] += char;
            }

            if (i in statements) {

                if (i > next &&

                    last_type !== "comment" &&

                    started_ignore_statements.length === 0

                        // if this statement is allowed within parent types of previous statement

                    && (
                        utils.contains(
                            statements[i].parent_types,
                            last_type
                        )
                    )
                )
                {

                    statement_bodies.push("");

                    var statement_id = statement_bodies.length - 1,
                        matched = statements[i].matched;

                    statements_ids[statement_id] = i;
                    start_statements_i[i+matched.length] = statement_id;
                    statement_bodies[statement_id] = matched[0]; // first character matched

                    statement_parents_ids[statement_id] = started_statement_ids.slice(0);
                    start_statement_regexp[statement_id] = r(statements[i].start).toString();

                    if (statements[i].name) {
                        var name = matched.match(r(statements[i].name)),
                            name_i = 1;
                        if (statements[i].name_i) {
                            name_i = statements[i].name_i;
                        }
                        if (name && name.length >= name_i)
                            statement_names[statement_id] = name[name_i];
                        else
                            statement_names[statement_id] = null;
                    } else {
                        statement_names[statement_id] = null;
                    }

                    start_statement_matched[statement_id] = matched;

                    statement_line_starts[statement_id] = (line_i);
                    statement_char_starts[statement_id] = i;

                    statement_types[statement_id] = statements[i].type;
                    indent_levels[statement_id] = indent_level;

                    // mark this new statement as started
                    started_statement_ids.push(statement_id);
                    started_statement_is.push(i);

                    if (!statements[i].end) {
                        next = i + (matched.length)-2;
                    } else {
                        next = i + (matched.length)-1;
                    }

                }
            }




            var end_statement = function (statement_end) {

                var statement_id = started_statement_ids.pop();
                started_statement_is.pop();

                if (!(typeof statement_end !== 'undefined') || !statement_end.end) {

                    statement_line_ends[statement_id] = line_i;
                    statement_char_ends[statement_id] = parseInt(i)+1; // including this character
                    end_statements_i[i] = statement_id;
                    end_statement_regexp[statement_id]  = null;
                    end_statement_matched[statement_id] = "";

                } else {


                    end_statement_regexp[statement_id] = r(statement_end.end).toString();
                    end_statement_matched[statement_id] = statement_end.matched;

                    statement_line_ends[statement_id] = (line_i) + (statement_end.matched.split("\n").length-1);
                    statement_char_ends[statement_id] = i + statement_end.matched.length;
                    end_statements_i[(i + statement_end.matched.length)] = statement_id;

                    if (utils.endsWith(statement_end.matched, "\n")) {
                        statement_line_ends[statement_id] -= 1;
                    }

                    next = i + (statement_end.matched.length)-1;
                }
            };


            if (!indent || last_type == "comment") {

                // last statement started may end
                var end_statement_id = started_statement_is[started_statement_is.length-1];

                if (
                    typeof end_statement_id !== 'undefined'
                    && started_ignore_statements.length === 0
                    && i > next
                ) {

                    if (end_statement_id in statements) {

                        if (!statements[end_statement_id].end || i in statements[end_statement_id].possible_ends) {
                            end_statement(statements[end_statement_id].possible_ends[i]);
                        }
                    }
                }
            } else if (indent) {

                if (last_type !== "comment" && (char === "\n" || (body.length-1) === i)) {

                    var indent_level_next_line = 0,
                        j = i+1,
                        found = false;

                    if (!((body.length-1) === i))
                        while (!found) {
                            if (body[j] === "\n") {
                                indent_level_next_line = 0;
                            } else if (body[j] === indent_character) {
                                indent_level_next_line += 1;
                            } else {
                                break;
                            }
                            j += 1;
                        }

                    while (indent_level_next_line <= indent_levels[started_statement_ids[started_statement_ids.length-1]]) {

                        var statement_id = started_statement_ids[started_statement_ids.length-1],
                            statements_i = statements_ids[statement_id];

                        // indent does not have possible ends
                        end_statement(statements[statements_i]);
                    }
                }
            }


            // line handling
            if (char === "\n") {
                line_i+=1;
                indent_level = 0;
                indent_first_character = false;
            }

        }



        // parent can be only one
        for (var i in statement_parents_ids) {
            statement_parents_ids[i] = [ statement_parents_ids[i][statement_parents_ids[i].length-1] ];
        }

        // init blocks
        for (var i in statement_bodies) {
            var block = new Block(i, statement_bodies[i]);
            block.line_start = statement_line_starts[i];
            block.line_end = statement_line_ends[i];
            block.char_start = statement_char_starts[i];

            block.name = statement_names[i];
            block.type = statement_types[i];

            block.start_statement_regexp = start_statement_regexp[i];
            block.start_statement_matched = start_statement_matched[i];

            block.start_statement_line_start = block.line_start;
            block.start_statement_line_end = block.line_start + start_statement_matched[i].split("\n").length - 1;
            block.start_statement_line_in_start = 1;
            block.start_statement_line_in_end = start_statement_matched[i].split("\n").length;

            block.start_statement_char_start = block.char_start;
            block.start_statement_char_end = block.char_start + start_statement_matched[i].length;
            block.start_statement_char_in_start = 0;
            block.start_statement_char_in_end = start_statement_matched[i].length;

            block.start_statement = body.substring(block.start_statement_char_start, block.start_statement_char_end);

            if (i in statement_char_ends) {
                block.char_end = statement_char_ends[i];
                block.body = body.substring(block.char_start, block.char_end);

                var start_whitespaces = "";
                for (var j = block.char_start; j >= 0; j--) {
                    if (/[ \t]/.test(body.charAt(j))) {
                        start_whitespaces = body.charAt(j)+start_whitespaces;
                    }
                    if (/\n/.test(body.charAt(j)) || j in end_statements_i) {
                        break;
                    }
                }
                block.line_preserve_start_whitespaces = start_whitespaces;

                var end_whitespaces = "";
                for (var j = block.char_end; j <= body.length; j++) {
                    if (/\n/.test(body.charAt(j)) || j in start_statements_i) {
                        break;
                    }
                    if (/[ \t]/.test(body.charAt(j))) {
                        end_whitespaces += body.charAt(j);
                    }
                }
                block.line_preserve_end_whitespaces = end_whitespaces;

                block.end_statement_regexp = end_statement_regexp[i];
                block.end_statement_matched = end_statement_matched[i];

                block.end_statement_line_start = block.line_end + 1 - end_statement_matched[i].split("\n").length;
                block.end_statement_line_end = block.line_end;
                block.end_statement_line_in_start = block.body.split("\n").length  + 1 - end_statement_matched[i].split("\n").length;
                block.end_statement_line_in_end = block.body.split("\n").length;

                block.end_statement_char_start = block.char_end - end_statement_matched[i].length;
                block.end_statement_char_end = block.char_end;
                block.end_statement_char_in_start = block.body.length - end_statement_matched[i].length;
                block.end_statement_char_in_end = block.body.length;

                block.end_statement = body.substring(block.end_statement_char_start, block.end_statement_char_end);
            } else {
                parse_error = true;
            }

            //block.start_statement = utils.extractLinesRange(body, block.start_statement_line_start, block.start_statement_line_end);
            //block.end_statement = utils.extractLinesRange(body, block.end_statement_line_start, block.end_statement_line_end);

            var children_ids = [];

            for (var j in statement_parents_ids) {
                var parents = statement_parents_ids[j];
                for (var k in parents) {
                    if (parseInt(parents[k]) === parseInt(block.id)) {
                        children_ids.push(j);
                        break;
                    }
                }
            }

            block.children_ids = children_ids;
            blocks.push(block);
        }

        //
        // disable merge of overlapping blocks
        //
        //var lines_overlap = {},
        //    omit_blocks = {};
        //if (!parse_error && !indent) {
        //
        //    // repeat 2 times, because of multiple block overlapping each other
        //    for (var x = 1; x <= 2; x++) {
        //
        //        lines_overlap = {};
        //        for (var i in blocks) {
        //            if (blocks[i].line_start in lines_overlap || (!indent && blocks[i].line_start !== blocks[i].line_end && blocks[i].line_end in lines_overlap)) {
        //
        //                //instead of raising error merge blocks (or increase start of )
        //                var block1 = lines_overlap[blocks[i].line_start] || lines_overlap[blocks[i].line_end],
        //                    block2 = blocks[i];
        //
        //                // start-start
        //                // start-end
        //                // end-end
        //                if (block2.line_start === block1.line_end && block2.line_end === block1.line_end && block1.line_start === block1.line_end) {
        //
        //                } else if (block2.line_start === block1.line_end) {
        //
        //                    var add_body = block2.body.split("\n");
        //                    add_body.shift();
        //                    block1.body += add_body.join("\n");
        //                    block1.line_end = block2.line_end;
        //
        //                    block1.end_statement_regexp = block2.end_statement_regexp;
        //                    block1.end_statement_matched = block2.end_statement_matched;
        //                    block1.end_statement_line_start = block2.end_statement_line_start;
        //                    block1.end_statement_line_end = block2.end_statement_line_end;
        //                    block1.end_statement_line_in_start = block1.end_statement_line_in_start+block2.end_statement_line_in_start-1;
        //                    block1.end_statement_line_in_end = block1.end_statement_line_in_end+block2.end_statement_line_in_end-1;
        //                    block1.end_statement = block2.end_statement;
        //
        //                    //block1.children_ids = block1.children_ids.concat(block2.children_ids).sort();
        //
        //                } else if (block1.start_statement_line_end === block2.line_start) {
        //                    // consider whole block as start of statement
        //                    block1.start_statement_line_end = block2.line_end;
        //                    block1.end_statement_line_in_end += block2.body.split("\n").length - 1;
        //
        //                } else if (block1.end_statement_line_start === block2.line_end) {
        //                    block1.end_statement_line_start = block2.line_start;
        //                    block1.end_statement_line_in_start += block2.body.split("\n").length - 1;
        //                }
        //
        //                blocks[block1.id] = block1;
        //                omit_blocks[block2.id] = block2;
        //
        //
        //                lines_overlap[block1.start_statement_line_start] = block1;
        //                lines_overlap[block1.start_statement_line_end] = block1;
        //                lines_overlap[block1.end_statement_line_start] = block1;
        //                lines_overlap[block1.end_statement_line_end] = block1;
        //            } else {
        //                lines_overlap[blocks[i].start_statement_line_start] = blocks[i];
        //                lines_overlap[blocks[i].start_statement_line_end] = blocks[i];
        //                lines_overlap[blocks[i].end_statement_line_start] = blocks[i];
        //                lines_overlap[blocks[i].end_statement_line_end] = blocks[i];
        //            }
        //        }
        //    }
        //}

        // apply offset

        for (var i in blocks) {
            blocks[i].line_start += offset.lines;
            blocks[i].line_end += offset.lines;
            blocks[i].char_start += offset.chars;
            blocks[i].char_end += offset.chars;
            blocks[i].start_statement_line_start += offset.lines;
            blocks[i].start_statement_line_end  += offset.lines;
            blocks[i].start_statement_char_start += offset.chars;
            blocks[i].start_statement_char_end += offset.chars;
            blocks[i].end_statement_line_start += offset.lines;
            blocks[i].end_statement_line_end += offset.lines;
            blocks[i].end_statement_char_start += offset.chars;
            blocks[i].end_statement_char_end += offset.chars;
        }

        function get_top_most (statements) {
            var top_most_statements = [];
            for (var i in statements) {
                var is_child = false;
                for (var j in statements) {
                    if (statements[j].children_ids.indexOf(i) > -1) {
                        is_child = true;
                        break;
                    }
                }
                if (!is_child) {
                    //if (!(i in omit_blocks)) {
                        top_most_statements.push(i);
                    //}
                }
            }
            return top_most_statements;
        }
        var top_most_blocks = get_top_most(blocks);

        function add_children (statement, statements) {

            var child_ids = [];
            for (var i in statement.children_ids) {
                //if (!(statement.children_ids[i] in omit_blocks)) {
                    child_ids.push(statement.children_ids[i]);
                //}
            }
            statement.children_ids = child_ids;

            var j = 0;
            while (statement.children_ids.length > statement.children.length) {

                    statement.children.push(
                        add_children(statements[statement.children_ids[j]], statements)
                    );

                j++;
            }
            return statement;
        }

        function build_class_tree (top_most_statements, statements) {

            for (var i in top_most_statements) {
                top_most_statements[i] = add_children(statements[top_most_statements[i]], statements);
            }
            return top_most_statements;
        }

        var tree = build_class_tree(top_most_blocks, blocks);

        var root = new Block(null, body);
        root.type = "file";
        root.name = path;
        root.path = path;
        root.children = tree;
        root.line_start = 1;
        root.line_end = body.split("\n").length;

        function add_between (start, children, block) {
            var traversed = false;
            if (block.children)
                for (var i in block.children) {
                    var child = block.children[i];
                    if (child.char_start < start && start < child.char_end) {
                        traversed = true;
                        block.children[i] = add_between(start, children, child);
                    }
                }
            if (!traversed) {
                if (block.children && block.children.length > 0) {
                    if (start < block.children[0].char_start) {
                        // na zaciatok
                        block.children = children.concat(block.children);
                    }
                    for (var i in block.children) {
                        if ((i+1) in block.children)
                            if (block.children[i].char_end < start && start < block.children[i+1].char_start) {
                                // medzi i a i+1
                                block.children =
                                    block.children.slice(0, i+1).concat(children).concat(block.children.slice(i+2));
                            }
                    }
                    if (start > block.children[block.children.length-1].char_end) {
                        // na koniec
                        block.children = block.children.concat(children);
                    }

                } else {
                    block.children = children;
                }
            }

            return block;
        }

        if (driver.between)
            for (var start in driver.between) {
                root = add_between(start, driver.between[start].children, root);
            }

        if (parse_error) {
            logger.log("Parse error "+path+"\n", "red");
            logger.logTree(root);
        }


        return { tree: root, error: parse_error };
    }


};
