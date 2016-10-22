
var parser = require('./parser'),
    utils       = require('./helpers/utils'),
    jsdiff = require('diff'),
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    path = require('path'),
    watch_path = argv._.length===1 ? path.resolve(argv._[0]) : false;

module.exports = function () {

    this.merge_strategy = {
        // text:
        txt:     'update', // since txt cannot be parsed it is just updated 1:1

        // code:
        php:    'block',
        cpp:    'block',
        cs:    'block',
        js:     'block',
        java:   'block',
        python: 'block',
        feature:    'block',
        rb:     'block',
        py:     'block',
        html:   'block',
        tpl:     'block',
        css:    'block'
    };

    this.update = {

        html:   ["unknown", "comment", "template"],
        tpl:    ["unknown", "comment", "template"],
        css:    ["comment"],
        js:     ["assignment", "comment", "function", "function-call", "assignment"],

        php:    ["method", "attribute", "attribute-assignment", "comment", "statement"],
        java:   ["method", "attribute", "attribute-assignment", "comment", "statement"],
        cpp:    ["method", "include", "attribute", "attribute-assignment", "comment", "statement"],
        rb:     ["method", "attribute", "attribute-assignment", "comment", "statement"],
        cs:     ["method", "attribute", "attribute-assignment", "comment", "statement"],
        py:     ["method", "comment"],
        python: ["method", "comment"],

        feature: ["scenario", "comment", "g"],
    };

    this.preserve_newlines = {

        html:   ["file", "tag"],
        tpl:    ["file", "tag"],
        css:    ["file", "selector"],
        js:     ["file", "class"],

        php:    ["file", "class"],
        java:   ["file", "class"],
        cpp:    ["file", "namespace", "class"],
        cs:     ["file", "namespace", "class"],
        rb:     ["file", "module", "class"],
        py:     ["file", "class"],
        python: ["file", "class"],

        feature: ["file", "feature"],
    };

    this.indent = ["py", "python", "feature"];


    // if no name, consider block if similarity is higher than 75
    this.consider_block_if_similarity_threshold_is_higher_than = 70;

    this.merge = function (change, merge_these_fragments, done) {

        // type of merge
        switch (this.merge_strategy[change.lang]) {

            case 'block':
                switch (change.type) {

                    /**
                     * base code change
                     */
                    case "full":

                        var changeBlock = parser.block.parse(change.body, change.lang, utils.makeHumanReadablePath(change.path, watch_path));

                        if (!changeBlock.error) {
                            for (var i in merge_these_fragments) {

                                var fragment = merge_these_fragments[i],
                                    fragmentBlock = parser.block.parse(fragment.body, fragment.lang, fragment.path);

                                if (!fragmentBlock.error) {
                                    fragment.last_body = fragment.body;
                                    fragment.body = this.mergeFull(
                                        changeBlock.tree,
                                        fragmentBlock.tree,
                                        fragment.lang).body;

                                    merge_these_fragments[i] = fragment;
                                }

                            }
                        }
                        break;

                    /**
                     * partial change
                     */
                    case "partial":

                        var changeBlock = parser.block.parse(change.body, change.lang, change.path, watch_path);

                        if (!changeBlock.error) {

                            for (var i in merge_these_fragments) {

                                var fragment = merge_these_fragments[i],
                                    fragmentBlock = parser.block.parse(fragment.body, fragment.lang, utils.makeHumanReadablePath(fragment.path, watch_path));

                                if (!fragmentBlock.error) {

                                    fragment.last_body = fragment.body;
                                    fragment.body = this.mergePartial(
                                        changeBlock.tree,
                                        fragmentBlock.tree,
                                        fragment.lang).body;

                                    merge_these_fragments[i] = fragment;
                                }
                            }
                        }

                        break;
                }

                break; //break block merge


            case 'update':
                for (var i in merge_these_fragments) {
                    var fragment = merge_these_fragments[i];
                    fragment.last_body = fragment.body;
                    fragment.body = change.body;
                    merge_these_fragments[i] = fragment;
                }
                break;
        }

        done(merge_these_fragments);
    };

    this.mergePartial = function (change, fragment, lang) {

        if (utils.contains(this.update[lang], fragment.type)) {
            fragment.body = change.body;
            return fragment;
        }

        if (change.body === fragment.body) {
            // nothing to do
            return fragment;
        }


        var sim = this.countSimilaritiesOfStatementsWithoutName(change, fragment, lang),
            counted_similarities = sim.counted_similarities,
            fragment_statements_found_by_similarity = sim.fragment_statements_found_by_similarity;


        var traverse = this.traverseThroughTreeAndUpdateChildren(
            change,
            fragment,
            lang,
            counted_similarities,
            this.mergePartial);

        fragment = traverse.fragment;

        var ne = this.findChildren(change, fragment, lang, counted_similarities),

            non_existing_children_in_fragment = ne.non_existing_children_in_fragment,
            non_existing_children_in_change = ne.non_existing_children_in_change;

        var merge_fragments = [];


        /**
         * add existing and updated fragments to merged body
         */
        for (var i in fragment.children) {
            var child = fragment.children[i];
            if (!child.name && !fragment_statements_found_by_similarity[i]) continue;
            child.is_change = false;
            child.i = i;
            merge_fragments.push(child);
        }


        for (var i in non_existing_children_in_change) {
            var child = fragment.children[non_existing_children_in_change[i]];
            if (child.name) continue;
            child.is_change = false;
            merge_fragments.push(child);
        }

        // sort merge_fragments by line_start
        merge_fragments = utils.sortByKey(merge_fragments, 'char_start');


        /**
         * add new fragments to merged body
         */
        var merge_changes = [];
        for (var i in non_existing_children_in_fragment) {
            var child = change.children[non_existing_children_in_fragment[i]];
            child.is_change = true;
            child.add = false;
            child.i = i;
            merge_changes.push(child);
        }

        merge_changes = utils.sortByKey(merge_changes, 'char_start');

        merge_fragments = merge_fragments.concat(merge_changes);


        var ex = this.extractChildren(change, fragment),
            change_body = ex.change_body,
            fragment_body = ex.fragment_body;

        var exse = this.extractStartEnd(change, fragment, change_body, fragment_body, lang),
            change_body_without_start_end_statements = exse.change_body_without_start_end_statements,
            change_start_statement = exse.change_start_statement,
            change_end_statement = exse.change_end_statement,
            fragment_body_without_start_end_statements = exse.fragment_body_without_start_end_statements;


        // fix formatting
        if (change_body_without_start_end_statements === "" && merge_fragments.length > 0) {
            change_body_without_start_end_statements = "\n";
        }

        /**
         * merge bodies, preserve positions (newlines) of fragment_body
         */
        var merged_body;
        if (utils.contains(this.preserve_newlines[lang], fragment.type)) {
            merged_body = this.mergeBodiesButPreserveNewLines(fragment_body_without_start_end_statements, change_body_without_start_end_statements);
            merged_body = change_start_statement + merged_body + change_end_statement;
        } else {
            merged_body = change_body;
        }
        change_body = merged_body;



        var change_end_statement_in = change_body.split("\n").length -
                ((change.end_statement_line_end!==null && change.end_statement_line_start!==null)?
                    (change.end_statement_line_end-change.end_statement_line_start):0), // end of statement
            added_statements = [], // added statements and their position [[START, STOP]]
            shift = 0;

        /**
         * proceed with line merge algorithm
         */
        for (var i in merge_fragments) {

            var child = merge_fragments[i];

            var corr = child.is_change?(change.line_start?change.line_start:0):(fragment.line_start?fragment.line_start:0),
                estimate_start_line = child.line_start + 1 + shift - corr,
                len = child.body.split("\n").length;


            if (estimate_start_line <= change.start_statement_line_in_end) {
                estimate_start_line = change.start_statement_line_in_end + 1;
                shift += 1;
            }

            // move out of already-added statements
            for (var j in added_statements) {
                if (added_statements[j][0] !== added_statements[j][1] && (added_statements[j][0] < estimate_start_line && estimate_start_line <= added_statements[j][1])) {
                    estimate_start_line = added_statements[j][1] + 1;// not sure if + 1 here
                }
            }

            if (estimate_start_line > change_end_statement_in) {
                estimate_start_line = change_end_statement_in;
                if (utils.contains(this.indent, lang) || fragment.type === "file")
                    estimate_start_line += 1;
            }


            // move end of statement
            change_end_statement_in += len;

            // move statements
            for (var j in added_statements) {
                if (estimate_start_line <= added_statements[j][0]) {
                    added_statements[j][0] += len;
                    added_statements[j][1] += len;
                }
            }

            // insert statement
            change_body = utils.insertAtLine(
                estimate_start_line,
                child.line_preserve_start_whitespaces+child.body,//+child.line_preserve_end_whitespaces,
                change_body);

            // new added statement
            added_statements.push([estimate_start_line, estimate_start_line + len - 1]);

            // increment shift based on length
            if (child.line_length_change) {
                shift += child.line_length_change;
            }
            var next = parseInt(i)+1;
            if (next < merge_fragments.length) {
                if (merge_fragments[next].line_start === child.line_end && (
                        (merge_fragments[next].is_change && child.is_change) ||
                        (!merge_fragments[next].is_change && !child.is_change)
                    )) {
                    shift += 1;
                }
            }
        }

        // update
        fragment.body = change_body;

        // fragment is updated
        return fragment;

    };

    this.mergeFull = function (change, fragment, lang) {

        if (utils.contains(this.update[lang], fragment.type)) {
            fragment.body = change.body;
            return fragment;
        }

        if (change.body === fragment.body) {
            // nothing to do
            return fragment;
        }

        var sim = this.countSimilaritiesOfStatementsWithoutName(change, fragment, lang),
            counted_similarities = sim.counted_similarities;


        var traverse = this.traverseThroughTreeAndUpdateChildren(
            change,
            fragment,
            lang,
            counted_similarities,
            this.mergeFull);

        fragment = traverse.fragment;

        var existing_children_in_change =
            this.findChildren(change, fragment, lang, counted_similarities).existing_children_in_change;

        var ex = this.extractChildren(change, fragment),
            change_body = ex.change_body,
            fragment_body = ex.fragment_body;

        var exse = this.extractStartEnd(change, fragment, change_body, fragment_body, lang),
            change_body_without_start_end_statements = exse.change_body_without_start_end_statements,
            change_start_statement = exse.change_start_statement,
            change_end_statement = exse.change_end_statement,
            fragment_body_without_start_end_statements = exse.fragment_body_without_start_end_statements;

        /**
         * merge bodies, preserve positions (newlines) of fragment_body
         */
        var merged_body;
        if (utils.contains(this.preserve_newlines[lang], fragment.type)) {
            merged_body = this.mergeBodiesButPreserveNewLines(fragment_body_without_start_end_statements, change_body_without_start_end_statements);
            merged_body = change_start_statement + merged_body + change_end_statement;
        } else {
            merged_body = change_body;
        }
        change_body = merged_body;


        /**
         * perform merge
         */

        var change_end_statement_in = change_body.split("\n").length -
                ((change.end_statement_line_end!==null && change.end_statement_line_start!==null)?
                    (change.end_statement_line_end-change.end_statement_line_start):0), // end of statement
            added_statements = [], // added statements and their position [[START, STOP]]
            shift = 0;


        for (var i in existing_children_in_change) {

            var id = existing_children_in_change[i],
                child = fragment.children[id];

            var corr = child.is_change?(change.line_start?change.line_start:0):(fragment.line_start?fragment.line_start:0),
                estimate_start_line = child.line_start + 1 + shift - corr,
                len = child.body.split("\n").length;


            if (estimate_start_line <= change.start_statement_line_in_end) {
                estimate_start_line = change.start_statement_line_in_end + 1;
                shift += 1;
            }

            // move out of already-added statements
            for (var j in added_statements) {
                if (added_statements[j][0] !== added_statements[j][1] && (added_statements[j][0] < estimate_start_line && estimate_start_line <= added_statements[j][1])) {
                    estimate_start_line = added_statements[j][1] + 1;// not sure if + 1 here
                }
            }

            if (estimate_start_line > change_end_statement_in) {
                estimate_start_line = change_end_statement_in;
                if (utils.contains(this.indent, lang) || fragment.type === "file")
                    estimate_start_line += 1;
            }


            // move end of statement
            change_end_statement_in += len;

            // move statements
            for (var j in added_statements) {
                if (estimate_start_line <= added_statements[j][0]) {
                    added_statements[j][0] += len;
                    added_statements[j][1] += len;
                }
            }

            // insert statement
            change_body = utils.insertAtLine(
                estimate_start_line,
                child.line_preserve_start_whitespaces+child.body,//+child.line_preserve_end_whitespaces,
                change_body);

            // new added statement
            added_statements.push([estimate_start_line, estimate_start_line + len - 1]);

            // increment shift based on length
            if (child.line_length_change) {
                shift += child.line_length_change;
            }
            var next = existing_children_in_change[parseInt(i)+1];
            if (next < fragment.children.length) {
                if (fragment.children[next].line_start === child.line_end) {
                    shift += 1;
                }
            }
        }

        // update
        fragment.body = change_body;

        // fragment is updated
        return fragment;

    };

    this.countSimilaritiesOfStatementsWithoutName = function (change, fragment, lang) {

        var counted_similarities = {},
            counted_similarities_with_threshold = {},
            fragment_statements_found_by_similarity = {},
            count_similarities = {};

        /**
         * count similarities of statements without name
         */
        for (var i in change.children) {
            for (var j in fragment.children) {
                if (!change.children[i].name &&
                    !fragment.children[j].name
                ) {
                    var id_similarity = i<j?i+"-"+j:j+"-"+ i;
                    if (!counted_similarities[id_similarity]) {
                        if (utils.contains(this.preserve_newlines[lang], fragment.type)) {
                            var b1 = utils.extractEmptyLines(change.children[i].body),
                                b2 = utils.extractEmptyLines(fragment.children[j].body);
                        } else {
                            var b1 = change.children[i].body,
                                b2 = fragment.children[j].body;
                        }
                        counted_similarities[id_similarity] =
                            utils.similarText(
                                b1,
                                b2, true);
                    }
                    if (counted_similarities[id_similarity] >= this.consider_block_if_similarity_threshold_is_higher_than) {
                        fragment_statements_found_by_similarity[j] = i;
                        counted_similarities_with_threshold[id_similarity] = counted_similarities[id_similarity];
                    }

                    if (!(i in count_similarities)) {
                        count_similarities[i] = [];
                    }
                    count_similarities[i].push(j);
                }
            }
        }

        counted_similarities = counted_similarities_with_threshold;


        for (var i in count_similarities) {
            if (count_similarities[i].length > 1) {
                var change_id = i,
                    best_score = -1,
                    best_fragment_id = -1;

                for (var j in count_similarities[i]) {
                    var fragment_id = count_similarities[i][j];
                    var id_similarity = change_id<fragment_id?change_id+"-"+fragment_id:fragment_id+"-"+ change_id;
                    if (counted_similarities[id_similarity] > best_score) {
                        best_score = counted_similarities[id_similarity];
                        best_fragment_id = fragment_id;
                    }
                }


                for (var j in count_similarities[i]) {
                    var fragment_id = count_similarities[i][j];
                    var id_similarity = change_id<fragment_id?change_id+"-"+fragment_id:fragment_id+"-"+ change_id;
                    if (!counted_similarities[id_similarity] || best_fragment_id === fragment_id) continue;

                    delete counted_similarities[id_similarity];
                    if (fragment_statements_found_by_similarity[fragment_id] === change_id) {
                        delete fragment_statements_found_by_similarity[fragment_id];
                    }
                }

            }
        }



        return {
            // if there is the a similarity consider it found
            counted_similarities: counted_similarities,
            fragment_statements_found_by_similarity: fragment_statements_found_by_similarity
        }

    };

    this.traverseThroughTreeAndUpdateChildren = function (change, fragment, lang, counted_similarities, mergeFunction) {

        /**
         * traverse through tree and update children and find existing children in fragment - these are updated
         */
        for (var j in fragment.children) {
            var found = false;
            for (var i in change.children) {
                if (change.children[i].name && change.children[i].name === fragment.children[j].name) {
                    found = true;
                    break;
                }
                if (!change.children[i].name && !fragment.children[j].name) {
                    var id_similarity = i<j?i+"-"+j:j+"-"+ i;
                    if (id_similarity in counted_similarities) {
                        found = true;
                        break;
                    }
                }
            }
            if (found) {
                var char_len_before = fragment.children[j].body.length,
                    line_len_before = fragment.children[j].body.split("\n").length;
                fragment.children[j] = mergeFunction.apply(this, [change.children[i], fragment.children[j], lang]);
                fragment.children[j].char_length_change = fragment.children[j].body.length - char_len_before;
                fragment.children[j].line_length_change = fragment.children[j].body.split("\n").length - line_len_before;
            }
        }

        return {
            fragment: fragment
        }

    };


    this.findChildren = function (change, fragment, lang, counted_similarities) {

        var existing_children_in_change = [],
            non_existing_children_in_fragment = [],
            non_existing_children_in_change = [];

        /**
         * find non existing children in fragment - de facto these fragments are added
         */
        for (var i in change.children) {
            var found = false;
            for (var j in fragment.children) {
                if (change.children[i].name && change.children[i].name === fragment.children[j].name) {
                    found = true;
                    break;
                }

                if (!change.children[i].name && !fragment.children[j].name) {
                    var id_similarity = i<j?i+"-"+j:j+"-"+ i;
                    if (id_similarity in counted_similarities) {
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                non_existing_children_in_fragment.push(i);
            }
        }


        for (var i in fragment.children) {
            var found = false;
            for (var j in change.children) {
                if (change.children[j].name && change.children[j].name === fragment.children[i].name) {
                    found = true;
                    break;
                }

                if (!change.children[j].name && !fragment.children[i].name) {
                    var id_similarity = i<j?i+"-"+j:j+"-"+ i;

                    if (id_similarity in counted_similarities) {
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                /**
                 * these add as well, NO NAME elems! that were extracted
                 */
                non_existing_children_in_change.push(i);
            } else {
                existing_children_in_change.push(i);
            }
        }

        return {
            non_existing_children_in_fragment: non_existing_children_in_fragment,
            non_existing_children_in_change: non_existing_children_in_change,
            existing_children_in_change: existing_children_in_change
        }
    };

    this.extractChildren = function (change, fragment) {


        /**
         * extract statements from body
         *
         * they are extracted because they can be located somewhere else than the place of change
         */

        var change_body = change.body,
            fragment_body = fragment.body,
            offset = 0;

        for (var i in change.children) {
            var start   = (change.children[i].char_start-(change.char_start?change.char_start:0))-offset,
                end     = start+change.children[i].body.length,
                part1   = change_body.substring(0,start),
                part2   = change_body.substring(end,change_body.length);

            change_body = part1 + part2;

            var part1_lines = part1.split("\n"),
                part2_lines = part2.split("\n"),
                line        = part1_lines[part1_lines.length-1]+part2_lines[0],
                possible_remove_line_offset = 0;

            if (/^\s*$/.test(line)) {
                var line_i = part1_lines.length - 1;
                change_body = utils.extractLineRanges(change_body, [[line_i+1, line_i+1]], []);
                possible_remove_line_offset = line.length+1;
            }
            offset += change.children[i].body.length + possible_remove_line_offset;
        }

        offset = 0;
        for (var i in fragment.children) {
            var len_before_merge = fragment.children[i].char_end - fragment.children[i].char_start,
                start   = (fragment.children[i].char_start-(fragment.char_start?fragment.char_start:0))-offset,
                end     = start + len_before_merge,
                part1   = fragment_body.substring(0,start),
                part2   = fragment_body.substring(end,fragment_body.length);


            fragment_body = part1 + part2;

            var part1_lines = part1.split("\n"),
                part2_lines = part2.split("\n"),
                line        = part1_lines[part1_lines.length-1]+part2_lines[0],
                possible_remove_line_offset = 0;

            if (/^\s*$/.test(line)) {
                var line_i = part1_lines.length - 1;
                fragment_body = utils.extractLineRanges(fragment_body, [[line_i+1, line_i+1]], []);
                possible_remove_line_offset = line.length + 1;
            }

            offset += len_before_merge + possible_remove_line_offset;
        }

        return {
            change_body: change_body,
            fragment_body: fragment_body
        };

        //var    change_ranges = [],
        //    fragment_ranges = [],
        //    change_extracted = 0,
        //    fragment_extracted = 0;
        //
        //for (var i in change.children) {
        //    var start = change.children[i].line_start - change.line_start,
        //        start_ex = start + 1,
        //        end_ex = start + change.children[i].body.split("\n").length;
        //
        //    change_ranges.push([start_ex,  end_ex ]);
        //    change_extracted += (change.children[i].body.split("\n").length);
        //}
        //for (var i in fragment.children) {
        //    var start = fragment.children[i].line_start - fragment.line_start,
        //        fragment_shift = 0;
        //    if (fragment.children[i].length_change) {
        //        fragment_shift = fragment.children[i].length_change;
        //    }
        //    var start_ex = start + 1,
        //        end_ex = start + fragment.children[i].body.split("\n").length - fragment_shift;
        //
        //    fragment_ranges.push([start_ex, end_ex ]);
        //    fragment_extracted += (fragment.children[i].body.split("\n").length);
        //}
        //
        //var change_body     = utils.extractLineRanges(change.body, change_ranges, []);
        //var fragment_body   = utils.extractLineRanges(fragment.body, fragment_ranges, []);
        //
        //return {
        //    change_body: change_body,
        //    fragment_body: fragment_body
        //};

    };

    this.extractStartEnd = function (change, fragment, change_body, fragment_body, lang) {


        if (change.start_statement_char_end) {
            var len_change_start_statement  = change.start_statement_char_end - change.start_statement_char_start,
                len_change_end_statement    = change.end_statement_char_end   - change.end_statement_char_start,

                change_start_statement      = change_body.substring(0, len_change_start_statement),
                change_end_statement        = change_body.substring(change_body.length - len_change_end_statement, change_body.length),

                change_body_without_start_end_statements    =
                    change_body.substring(len_change_start_statement, change_body.length - (len_change_end_statement));
        } else {
            var change_start_statement      = "",
                change_end_statement        = "",

                change_body_without_start_end_statements    = change_body;
        }

        if (fragment.start_statement_char_end) {
            var len_fragment_start_statement                = fragment.start_statement_char_end - fragment.start_statement_char_start,
                len_fragment_end_statement                  = fragment.end_statement_char_end   - fragment.end_statement_char_start,
                fragment_body_without_start_end_statements  =
                    fragment_body.substring(len_fragment_start_statement, fragment_body.length - (len_fragment_end_statement));
        } else {
            var fragment_body_without_start_end_statements  = fragment_body;
        }

        return {
            change_body_without_start_end_statements: change_body_without_start_end_statements,
            change_start_statement: change_start_statement,
            change_end_statement: change_end_statement,
            fragment_body_without_start_end_statements: fragment_body_without_start_end_statements
        };

        //if (change.end_statement_line_start) {
        //    if (!utils.contains(this.indent, lang)) {
        //        var change_start_statement = utils.extractLinesRange(change_body, 1, change.start_statement_line_in_end),
        //            len_end = change.end_statement_line_end - change.end_statement_line_start,
        //            change_end_statement = utils.extractLinesRange(change_body, change_body.split("\n").length - len_end, change_body.split("\n").length),
        //            change_body_without_start_end_statements = utils.extractLineRanges(change_body, [
        //                [1, change.start_statement_line_in_end],
        //                [change_body.split("\n").length - len_end, change_body.split("\n").length]
        //            ]);
        //    } else {
        //        var change_start_statement = utils.extractLinesRange(change_body, 1, change.start_statement_line_in_end),
        //            change_end_statement = "",
        //            change_body_without_start_end_statements = utils.extractLineRanges(change_body, [
        //                [1, change.start_statement_line_in_end]
        //            ]);
        //    }
        //
        //} else {
        //    var change_body_without_start_end_statements = change_body,
        //        change_start_statement  = "",
        //        change_end_statement    = "";
        //}
        //
        //if (fragment.end_statement_line_start) {
        //    if (!utils.contains(this.indent, lang)) {
        //        var len_end                 = fragment.end_statement_line_end - fragment.end_statement_line_start;
        //        var fragment_body_without_start_end_statements = utils.extractLineRanges(fragment_body, [
        //            [1, fragment.start_statement_line_in_end],
        //            [fragment_body.split("\n").length-len_end, fragment_body.split("\n").length]
        //        ]);
        //    } else {
        //        var fragment_body_without_start_end_statements = utils.extractLineRanges(fragment_body, [
        //            [1, fragment.start_statement_line_in_end]
        //        ]);
        //    }
        //
        //} else {
        //    var fragment_body_without_start_end_statements = fragment_body;
        //}
        //
        //
        //return {
        //    change_body_without_start_end_statements: change_body_without_start_end_statements,
        //    change_start_statement: change_start_statement,
        //    change_end_statement: change_end_statement,
        //    fragment_body_without_start_end_statements: fragment_body_without_start_end_statements
        //};


    };


    this.mergeBodiesButPreserveNewLines = function (preserve_text, new_text) {

        var preserve_lines = preserve_text.split("\n"),
            new_lines      = new_text.split("\n"),

            preserve_lines_wnl = [], // wnl = without new lines
            new_lines_wnl = [];

        for (var i in preserve_lines)
            if (!(/^\s*$/.test(preserve_lines[i])))
                preserve_lines_wnl.push(preserve_lines[i]);

        for (var i in new_lines) {
            if (!(/^\s*$/.test(new_lines[i])))
                new_lines_wnl.push(new_lines[i]);
        }

        preserve_lines_wnl = preserve_lines_wnl.join("\n");
        new_lines_wnl = new_lines_wnl.join("\n");


        var diffs = jsdiff.diffLines(preserve_lines_wnl, new_lines_wnl);

        var preserve_cur_line = 0,
            new_cur_line = 0,
            final_new_text = [];


        for (var i in diffs) {
            var diff = diffs[i];

            var action = "none";
            if (diff.added) action = "added";
            if (diff.removed) action = "removed";

            switch (action) {
                case "none":

                    var matched_lines = 0,
                        match_lines = diff.value.replace(/(^\n)/, "").replace(/(\n$)/, "").split("\n");

                    var j;
                    for (j = preserve_cur_line; j < preserve_lines.length; j++) {
                        if (match_lines[matched_lines] === preserve_lines[j]) {
                            matched_lines++;
                        }
                        final_new_text.push(preserve_lines[j]);
                        if (matched_lines >= (match_lines.length)) {
                            j+=1;
                            break;
                        }
                    }
                    preserve_cur_line = j;



                    // move new lines cursor
                    matched_lines = 0;
                    for (j = new_cur_line; j < new_lines.length; j++) {
                        if (match_lines[matched_lines] === new_lines[j]) {
                            matched_lines++;
                        }
                        if (matched_lines >= (match_lines.length)) {
                            j+=1;
                            break;
                        }
                    }
                    new_cur_line = j;

                    break;

                case "added":
                    // just add and move one cursor

                    var matched_lines = 0,
                        match_lines = diff.value.replace(/(^\n)/, "").replace(/(\n$)/, "").split("\n");

                    for (j = new_cur_line; j < new_lines.length; j++) {
                        if (match_lines[matched_lines] === new_lines[j]) {
                            matched_lines++;
                        }

                        if ((matched_lines === 0 || match_lines === preserve_lines.length-1) && /^\s*$/.test(new_lines[j])) {

                        } else {
                            final_new_text.push(new_lines[j]);
                        }

                        if (matched_lines >= (match_lines.length)) {
                            j+=1;
                            break;
                        }
                    }
                    new_cur_line = j;

                    break;

                case "removed":

                    // just move cursor
                    var matched_lines = 0,
                        match_lines = diff.value.replace(/(^\n)/, "").replace(/(\n$)/, "").split("\n");


                    var j;
                    for (j = preserve_cur_line; j < preserve_lines.length; j++) {
                        if (match_lines[matched_lines] === preserve_lines[j]) {
                            matched_lines++;
                        }

                        // do not match between
                        if (matched_lines === 0 || match_lines === preserve_lines.length-1)
                            if ((/^\s*$/.test(preserve_lines[j]))) {
                                final_new_text.push(preserve_lines[j]);
                            }
                        if (matched_lines >= (match_lines.length)) {
                            j+=1;
                            break;
                        }
                    }
                    preserve_cur_line = j;

                    break;
            }
        }

        for (var j = preserve_cur_line; j < preserve_lines.length; j++) {
            if ((/^\s*$/.test(preserve_lines[j]))) {
                final_new_text.push(preserve_lines[j]);
            }
        }

        return final_new_text.join("\n");

    };


};
