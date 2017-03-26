
var log = console.log.bind(console),
    Promise = require('promise'),
    fstools = require('../helpers/fstools');


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
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    path = require('path'),
    table = require('markdown-table');

module.exports = function (orm, db) {
    var Usecase = db.define('usecase', {
            name            : { type: 'text', required: true },
            level           : { type: 'text' },
            path            : { type: 'text', required: true },
            steps_ordered            : { type: 'text' },
            description     : { type: 'text' },
            specializes     : { type: 'text' },
            body            : { type: 'text' },
            parser          : { type: 'text' },
            created_at      : { type: 'date', required: true, time: true }
        },
        {
            //autoFetch : true,
            //cache : false,

            hooks: {
                beforeValidation: function () {
                    this.created_at = new Date();
                }
            },
            methods: {
                cascadeRemove: function (done) {

                    var usecase = this, //
                        Argument = db.models.argument,
                        Fragment = db.models.fragment,//fragment_step, usecase_fragment
                        Step = db.models.step,// step_argument, usecase_step
                        Actor = db.models.actor, // usecase_actor
                        ExtensionPoint = db.models.extension_point, // usecase_extension_point
                        Relationship = db.models.relationship,
                        remove = {
                            usecase: null,
                            actors: [],
                            steps: [],
                            relationships: [],
                            extension_points: [],
                            arguments: [],
                            fragments: []
                        };

                    /**
                     * Fill the remove dict
                     */
                    remove.usecase = usecase;

                    var getActors = new Promise(function (fulfill, reject) {
                        usecase.getActor(function (err, actors) {
                            if (err) throw err;
                            remove.actors = actors;
                            fulfill();
                        });
                    });


                    var getSteps = new Promise(function (fulfill, reject) {
                        usecase.getStep().each(function (step) {
                            remove.steps.push(step);
                            remove.arguments = remove.arguments.concat(step.argument);
                        }).save(function (err) {
                            if (err) throw err;
                            fulfill();
                        });
                    });


                    //var getRelationships = new Promise(function (fulfill, reject) {
                    //    Relationship.find( {or: [
                    //        {usecase_id: usecase.id}, {related_usecase_id: usecase.id}
                    //    ]}, function (err, relationships) {
                    //        if (err) throw err;
                    //
                    //        remove.relationships = relationships;
                    //        fulfill();
                    //    });
                    //});


                    var getExtensionPoints = new Promise(function (fulfill, reject) {
                        usecase.getExtensionPoint(function (err, extension_points) {
                            if (err) throw err;

                            remove.extension_points = extension_points;
                            fulfill();
                        });
                    });


                    var getFragments = new Promise(function (fulfill, reject) {
                        Fragment.find({ usecase: usecase }, function (err, fragments) {
                            if (err) throw err;
                            remove.fragments = fragments;
                            fulfill();
                        });
                    });


                    Promise.all([getActors, getSteps, getExtensionPoints, getFragments]).then(function () {

                        var removeActors = new Promise(function (fulfill, reject) {
                            remove.usecase.removeActor(remove.actors, function (err) {
                                if (err) throw err;

                                var actor_ids = [-1];
                                for (var i in remove.actors) actor_ids.push(remove.actors[i].id);

                                Actor.find({id: actor_ids}).remove(function (err) {
                                    if (err) throw err;

                                    fulfill();

                                });

                            });
                        });


                        var removeRelationships = new Promise(function (fulfill, reject) {
                            Relationship.find({or:[
                                {usecase_id: remove.usecase.id}, {related_usecase_id: remove.usecase.id}
                                ]}).remove(function (err) {

                                if (err) throw err;

                                fulfill();

                            });
                        });

                        var removeExtPoints = new Promise(function (fulfill, reject) {
                            remove.usecase.removeExtensionPoint(remove.extension_points, function (err) {
                                if (err) throw err;

                                var extension_point_ids = [-1];
                                for (var i in remove.extension_points) extension_point_ids.push(remove.extension_points[i].id);

                                ExtensionPoint.find({id: extension_point_ids}).remove(function (err) {

                                    if (err) throw err;

                                    fulfill();

                                });

                            });
                        });


                        var removeScenario = new Promise(function (fulfill, reject) {

                            var step_ids = [-1];
                            for (var i in remove.steps) step_ids.push(remove.steps[i].id);


                            Step.find({id: step_ids}).each(function (step) {
                                step.argument = [];
                            }).save(function (err) {
                                if (err) throw err;

                                Step.find({id: step_ids}).remove(function (err) {
                                    if (err) throw err;

                                    var argument_ids = [-1];
                                    for (var i in remove.arguments) argument_ids.push(remove.arguments[i].id);

                                    Argument.find({id: argument_ids}).remove(function (err) {
                                        if (err) throw err;


                                        remove.usecase.setStep([], function (err) {

                                            fulfill();
                                        });


                                    });

                                });
                            });
                        });



                        var removeFragments = new Promise(function (fulfill, reject) {


                            remove.usecase.setFragment([], function (err) {
                                if (err) throw err;

                                var fragment_ids = [-1];
                                for (var i in remove.fragments) fragment_ids.push(remove.fragments[i].id);


                                Fragment.find({id: fragment_ids}).each(function (fragment) {
                                    fragment.step = [];
                                }).save(function (err) {
                                    if (err) throw err;

                                    Fragment.find({id: fragment_ids}).remove(function (err) {
                                        if (err) throw err;


                                        fulfill();


                                    });
                                });
                            });

                        });

                        Promise.all(removeActors, removeRelationships, removeExtPoints, removeScenario, removeFragments).then(function () {

                            remove.usecase.remove(function (err) {
                                if (err) throw err;

                                done();
                            });
                        });



                    });

                },

                getCoverage: function (only_not_covered) {

                  var usecase = this,
                      short = !only_not_covered ? function (r) { return r; } : utils.short,
                      Usecase = db.models.usecase,
                      Relationship = db.models.relationship,
                      ExtensionPoint = db.models.extension_point,
                      extractNamesFromCode = function (frag_o, fragment, names, allowed_types) {
                          if (!names)
                              var names = [];

                          if (fragment && fragment.name && (!allowed_types || (allowed_types && utils.contains(allowed_types, fragment.type))))
                              names.push({
                                name: fragment.name,
                                line: fragment.line_start,
                                fragment: frag_o,
                              });

                          if (fragment) for (var i in fragment.children) {
                              var child = fragment.children[i];
                              names = extractNamesFromCode(frag_o, child, names, allowed_types);
                          }

                          return names;
                      },
                      extractWordsPrepending = function (char_start, char_end, text) {
                          var r = char_start+"([a-zA-Z\., \t-_]+)"+char_end,
                            re = new RegExp(r, "g"), // /\@(\w+)/g,
                            r_a = [],
                            m;
                          while (m = re.exec(text)) {
                              r_a.push(m[1]);
                          }
                          return r_a.join(" ");
                      },
                      extractComments = function (frag_o, fragment, comments, allowed_types) {
                          if (!comments)
                              var comments = [];

                          if (fragment && fragment.type === "comment") {
                              var coms = fragment.body.split("\n");
                              for (var i in coms) {
                                  var words = extractWordsPrepending("\\*\\*", "\\*\\*", coms[i]);
                                  if (words)
                                      comments.push({
                                        name: words,
                                        line: parseInt(fragment.line_start)+parseInt(i),
                                        fragment: frag_o,
                                      });
                              }
                          }

                          if (fragment) for (var i in fragment.children) {
                              var child = fragment.children[i];
                              comments = extractComments(frag_o, child, comments, allowed_types);
                          }

                          return comments;
                      },
                      get_names = function (usecase) {

                        var code_fragments_names = [],
                            code_fragments_method_names = [],
                            code_fragments_class_names = [],
                            code_fragments_comments = [],
                            test_fragments_names = [],
                            test_fragments_comments = [];

                        for (var k in usecase.fragment) {
                            var fragment = usecase.fragment[k],
                                fragmentBlock = parser.block.parse(fragment.body, fragment.lang),
                                names = extractNamesFromCode(fragment, fragmentBlock.tree),
                                comments = extractComments(fragment, fragmentBlock.tree);

                            switch(fragment.section) {
                                case "code":

                                    code_fragments_names =      code_fragments_names.concat(names);

                                    code_fragments_method_names = code_fragments_method_names.concat(
                                          extractNamesFromCode(fragment, fragmentBlock.tree, [], ["method"])
                                        );

                                    code_fragments_class_names = code_fragments_class_names.concat(
                                      extractNamesFromCode(fragment, fragmentBlock.tree, [], ["class"])
                                    );

                                    code_fragments_comments = code_fragments_comments.concat(comments);

                                    break;
                                case "tests":
                                    test_fragments_names = test_fragments_names.concat(names);

                                    test_fragments_comments = test_fragments_comments.concat(comments);
                                    break;
                            }
                        }

                        return {
                          code_fragments_names: code_fragments_names,
                          code_fragments_method_names: code_fragments_method_names,
                          code_fragments_class_names: code_fragments_class_names,
                          code_fragments_comments: code_fragments_comments,
                          test_fragments_names: test_fragments_names,
                          test_fragments_comments: test_fragments_comments
                        }

                      },
                      get_fragments = function (usecase) {

                        var code_fragments = [],
                            test_fragments = [];

                        for (var k in usecase.fragment) {
                            var fragment = usecase.fragment[k];

                            switch(fragment.section) {
                                case "code":
                                    code_fragments.push({
                                      fragment: fragment,
                                      line: fragment.line_start,
                                      body: fragment.body
                                    });
                                    break;
                                case "tests":
                                    test_fragments.push({
                                      fragment: fragment,
                                      line: fragment.line_start,
                                      body: fragment.body
                                    });
                                    break;
                            }
                        }
                        return {
                          code_fragments: code_fragments,
                          test_fragments: test_fragments
                        }
                      };

                  return new Promise(function (fullfill, reject) {

                      Relationship.find({usecase_id: usecase.id}, function (err, relationships) {
                          if (err) throw err;

                          var query_rel_usecases = [];

                          for (var i in relationships) {
                            query_rel_usecases.push({id: relationships[i].related_usecase_id});
                          }

                          Usecase.find({or: query_rel_usecases}, function (err, usecases) {
                              if (err) throw err;
                              var rel_usecases = {};
                              for (var i in usecases) {
                                rel_usecases[usecases[i].id] = usecases[i];
                              }



                            var steps   = {},
                                main_scenario_steps = [],
                                alternate_flow_steps = [],
                                steps_ordered = JSON.parse(usecase.steps_ordered);

                            for (var k in steps_ordered) {

                                // maintian order of steps
                                var step = null;

                                for (var j in usecase.step) {
                                    if (steps_ordered[k] === usecase.step[j].no) {
                                        step = usecase.step[j];
                                        break;
                                    }
                                }

                                if (step) {
                                    steps[step.no] = step;

                                    switch (step.section) {
                                        case 'main_scenario':
                                            main_scenario_steps.push(step.no);
                                            break;
                                        case 'alternate_flows':
                                            alternate_flow_steps.push(step.no);
                                            break;
                                    }
                                }
                            }

                            var names = get_names(usecase);
                                code_fragments_names = names.code_fragments_names.concat(names.code_fragments_comments),
                                //code_fragments_method_names = names.code_fragments_method_names,
                                //code_fragments_class_names = names.code_fragments_class_names,
                                test_fragments_names = names.test_fragments_names.concat(names.test_fragments_comments),
                                frag = get_fragments(usecase),
                                code_fragments = frag.code_fragments,
                                test_fragments = frag.test_fragments,

                                step_coverages = {},
                                scenario = main_scenario_steps.concat(alternate_flow_steps);



                            var relationship_steps = [];
                            for (var i in relationships) {
                              var relationship = relationships[i];

                              switch (relationship.type) {

                                case "include_auto":
                                case "include":
                                  relationship_steps.push(relationship.step_no);
                                  break;

                                case "extend":
                                  break;
                              }
                            }

                            for (var j in scenario) {
                                var step_id = scenario[j],
                                    step = steps[step_id];

                                if (step.inherited || utils.contains(relationship_steps, step.no)) {
                                  var code_sim = {text1_marked: step.orig_name.replace(regexps.step_begin(), '').replace(new RegExp("^[\\s]*("+step.played_by+")[\\s]*"), "")},
                                      code_cov = {covered_words: [],
                                      uncovered_words: [],
                                      covered_words_dups: [],
                                      uncovered_words_dups: [],
                                      percent_covered: 100},
                                      test_cov = code_cov;

                                } else {
                                    var code_sim = similarity.cmp(
                                        step.orig_name.replace(regexps.step_begin(), "").replace(new RegExp("^[\\s]*("+step.played_by+")[\\s]*"), ""),
                                        code_fragments_names, "name"
                                      ),
                                      code_cov = coverage.count(code_sim.len_text1, code_sim.compared),
                                      test_sim = similarity.cmp(
                                        step.orig_name.replace(regexps.step_begin(), "").replace(new RegExp("^[\\s]*("+step.played_by+")[\\s]*"), ""),
                                        test_fragments_names, "name"
                                      ),
                                      test_cov = coverage.count(test_sim.len_text1, test_sim.compared);

                                }

                                step_coverages[step_id] = {
                                    text1_marked: code_sim.text1_marked,
                                    text1_missing: code_sim.text1_missing,
                                    code: code_cov,
                                    tests: test_cov
                                };
                            }


                              var usecase_triggers = {}, // triggers[extension_point] = ...
                                  ext_point_names = [];
                              for (var j in usecase.step) {
                                  var step = usecase.step[j];

                                  if (step.step_type_id === 1) {
                                    var t_name = utils.args.extract(step.orig_name)

                                    if (t_name['args'].length >= 1) {
                                      var extension_point = t_name['args'][0];
                                      ext_point_names.push({name: extension_point});
                                      usecase_triggers[extension_point] = step;
                                    }
                                  }
                              }


                              var relationship_coverages = {};

                              for (var i in relationships) {

                                var relationship = relationships[i],
                                    frag = get_fragments(rel_usecases[relationship.related_usecase_id]),
                                    related_usecase_code_fragments = frag.code_fragments,
                                    related_usecase_test_fragments = frag.test_fragments,

                                    text, code_find1, code_find2, test_find1, test_find2;


                                switch (relationship.type) {

                                  case "include_auto":
                                  case "include":

                                    text = steps[relationship.step_no].orig_name;

                                    code_find1 = relationship.related_usecase.name;
                                    code_find2 = code_fragments;
                                    test_find1 = relationship.related_usecase.name;
                                    test_find2 = test_fragments;

                                    break;

                                  case "extend":

                                    text = usecase_triggers[relationship.extension_point_name].orig_name;

                                    code_find1 = usecase.name;
                                    code_find2 = related_usecase_code_fragments;
                                    test_find1 = usecase.name;
                                    test_find2 = related_usecase_test_fragments;

                                    break;
                                  case "generalization":

                                    text = "Use case "+usecase.name+" specializes "+relationship.related_usecase.name;

                                    code_find1 = relationship.related_usecase.name;
                                    code_find2 = code_fragments;
                                    test_find1 = relationship.related_usecase.name;
                                    test_find2 = test_fragments;

                                    break;

                                }

                                var code_sim = similarity.cmp(
                                      code_find1,
                                      code_find2, "body"
                                    ),
                                    code_cov = coverage.count(code_sim.len_text1, code_sim.compared),
                                    test_sim = similarity.cmp(
                                      test_find1,
                                      test_find2, "body"
                                    ),
                                    test_cov = coverage.count(test_sim.len_text1, test_sim.compared);


                                relationship_coverages[i] = {
                                  text: text,
                                  code: code_cov,
                                  tests: test_cov
                                }
                              }

                              if (only_not_covered) {
                                var main_not_covered = [],
                                    alt_not_covered = [],
                                    rel_not_covered = [];
                                for (var i in main_scenario_steps) {
                                  var step_id = main_scenario_steps[i],
                                      code_coverage = step_coverages[step_id].code,
                                      test_coverage = step_coverages[step_id].tests;
                                  if (!( (code_coverage.percent_covered >= 100 && test_fragments.length === 0) ||
                                    (code_coverage.percent_covered >= 100 && test_fragments.length > 0 && test_coverage.percent_covered >= 100) )) {
                                    main_not_covered.push(step_id);
                                  }
                                }
                                for (var i in alternate_flow_steps) {
                                  var step_id = alternate_flow_steps[i],
                                      code_coverage = step_coverages[step_id].code,
                                      test_coverage = step_coverages[step_id].tests;
                                  if (!( (code_coverage.percent_covered >= 100 && test_fragments.length === 0) ||
                                    (code_coverage.percent_covered >= 100 && test_fragments.length > 0 && test_coverage.percent_covered >= 100) )) {
                                    alt_not_covered.push(step_id);
                                  }

                                }
                                for (var i in relationship_coverages) {
                                  var code_coverage = relationship_coverages[i].code,
                                      test_coverage = relationship_coverages[i].tests;
                                  if (!( (code_coverage.percent_covered >= 100 && test_fragments.length === 0) ||
                                    (code_coverage.percent_covered >= 100 && test_fragments.length > 0 && test_coverage.percent_covered >= 100) )) {
                                    rel_not_covered.push(relationship_coverages[i]);
                                  }
                                }
                                main_scenario_steps = main_not_covered;
                                alternate_flow_steps = alt_not_covered;
                                relationship_coverages = rel_not_covered;
                              }

                              var tab_arr = [];
                              if (test_fragments.length > 0) {
                                tab_arr.push(["#", "Code", "Test", "Missing"]);
                              } else {
                                tab_arr.push(["#", "Code", "Missing"]);
                              }
                              for (var i in main_scenario_steps) {
                              var step_id = main_scenario_steps[i],
                                code_coverage = step_coverages[step_id].code,
                                test_coverage = step_coverages[step_id].tests;
                                if (test_fragments.length > 0) {
                                  tab_arr.push([steps[step_id].no, code_coverage.percent_covered.toFixed(0) + "%", test_coverage.percent_covered.toFixed(0) + "%", !step_coverages[step_id].text1_missing ? "-" : short(step_coverages[step_id].text1_missing)]);
                                } else {
                                  tab_arr.push([steps[step_id].no, code_coverage.percent_covered.toFixed(0) + "%", !step_coverages[step_id].text1_missing? "-" : short(step_coverages[step_id].text1_missing)]);
                                }

                              }
                              var main_tab = table(tab_arr);

                              var tab_arr = [];
                              tab_arr.push(["", ""]);
                              for (var i in main_scenario_steps) {
                                var step_id = main_scenario_steps[i];
                                tab_arr.push([steps[step_id].no, (steps[step_id].played_by && !steps[step_id].inherited?steps[step_id].played_by+" ":"")+step_coverages[step_id].text1_marked]);

                              }
                              var main_tab2 = table(tab_arr);

                              var tab_arr = [];
                              if (test_fragments.length > 0) {
                                tab_arr.push(["#", "Code", "Test", "Missing"]);
                              } else {
                                tab_arr.push(["#", "Code", "Missing"]);
                              }
                              for (var i in alternate_flow_steps) {
                              var step_id = alternate_flow_steps[i],
                                code_coverage = step_coverages[step_id].code,
                                test_coverage = step_coverages[step_id].tests;
                                if (test_fragments.length > 0) {
                                  tab_arr.push([steps[step_id].no, code_coverage.percent_covered.toFixed(0) + "%", test_coverage.percent_covered.toFixed(0) + "%", !step_coverages[step_id].text1_missing ? "-" : short(step_coverages[step_id].text1_missing)]);
                                } else {
                                  tab_arr.push([steps[step_id].no, code_coverage.percent_covered.toFixed(0) + "%", !step_coverages[step_id].text1_missing? "-" : short(step_coverages[step_id].text1_missing)]);
                                }

                              }
                              var alt_tab = table(tab_arr);



                              var tab_arr = [];
                              tab_arr.push(["", ""]);
                              for (var i in alternate_flow_steps) {
                                var step_id = alternate_flow_steps[i];
                                tab_arr.push([steps[step_id].no, (steps[step_id].played_by && !steps[step_id].inherited?steps[step_id].played_by+" ":"")+step_coverages[step_id].text1_marked]);

                              }
                              var alt_tab2 = table(tab_arr);


                              var tab_arr = [];
                              if (test_fragments.length > 0) {
                                tab_arr.push(["Code", "Tests", "Relationship"]);
                              } else {
                                tab_arr.push(["Code", "Relationship"]);
                              }
                              for (var i in relationship_coverages) {
                                var text = relationship_coverages[i].text,
                                    code_coverage = relationship_coverages[i].code,
                                    test_coverage = relationship_coverages[i].tests;
                                if (test_fragments.length > 0) {
                                  tab_arr.push([code_coverage.percent_covered.toFixed(0) + "%", test_coverage.percent_covered.toFixed(0) + "%", short(text)]);
                                } else {
                                  tab_arr.push([code_coverage.percent_covered.toFixed(0) + "%", short(text)]);
                                }

                              }
                              var rel_tab = table(tab_arr);


                              var tab_arr = [];
                              tab_arr.push([""]);
                              for (var i in relationship_coverages) {
                                tab_arr.push([relationship_coverages[i].text]);
                              }
                              var rel_tab2 = table(tab_arr);


                              // create connections array
                              var conn_arr = {};
                              for (var step_id in step_coverages) {
                                if (!(step_id in conn_arr))
                                    conn_arr[step_id] = [];
                                var frag_coverages = step_coverages[step_id].code.covered_words_dups.concat(
                                  step_coverages[step_id].tests.covered_words_dups);
                                for (var i in frag_coverages) {
                                  var w = frag_coverages[i];
                                  conn_arr[step_id].push({
                                    fragment_path: w.o.fragment.path,
                                    fragment_section: w.o.fragment.section,
                                    line: w.o.line
                                  });
                                }
                              }

                              // console.log(tmpl(fs.readFileSync("./lib/coverage/template2.md", "utf-8"), {
                              //     usecase: usecase,
                              //     test_fragments: test_fragments,
                              //     steps: steps,
                              //     main_scenario_steps: main_scenario_steps,
                              //     main_tab: main_tab,
                              //     alternate_flow_steps: alternate_flow_steps,
                              //     alt_tab: alt_tab,
                              //     step_coverages: step_coverages,
                              //     relationships: relationships,
                              //     rel_tab: rel_tab,
                              //     relationship_coverages: relationship_coverages,
                              //     colors: require('colors')
                              // }));

                              fullfill({
                                  usecase: usecase,
                                  test_fragments: test_fragments,
                                  steps: steps,
                                  main_scenario_steps: main_scenario_steps,
                                  main_tab: main_tab,
                                  main_tab2: main_tab2,
                                  alternate_flow_steps: alternate_flow_steps,
                                  alt_tab: alt_tab,
                                  alt_tab2: alt_tab2,
                                  step_coverages: step_coverages,
                                  relationships: relationships,
                                  rel_tab: rel_tab,
                                  rel_tab2: rel_tab2,
                                  relationship_coverages: relationship_coverages,
                                  connections_array: conn_arr,
                                  colors: require('colors')
                              });

                          });

                      });
                  })
                }
            }
        });

    Usecase.hasOne('project', db.models.project);
    Usecase.hasMany('actor', db.models.actor, {}, { key: true, cascadeRemove: true, autoFetch : true });

    Usecase.upsert = function (parser_usecase, project, done) {
        var Usecase = db.models.usecase,
            Actor = db.models.actor,
            Step = db.models.step,
            Argument = db.models.argument,
            ExtensionPoint = db.models.extension_point,
            Relationship = db.models.relationship;

        if (parser_usecase === null || !(parser_usecase.steps) ||
                Object.keys(parser_usecase.steps).length === 0) {
            done(null, null);
            return;
        }


        Usecase.find({ path: parser_usecase.path }, function (err, usecases) {
            if (err) throw err;



            /*
             * INSERT
             */
            if (usecases.length === 0) {



                /*
                 * Create usecase
                 */
                Usecase.create({
                        name:           parser_usecase.name,
                        path:           parser_usecase.path,
                        level:          parser_usecase.level,
                        description:    parser_usecase.description,
                        body:           parser_usecase.body,
                        steps_ordered: JSON.stringify(parser_usecase.steps_ordered),
                        specializes:    parser_usecase.specializes,
                        project_id:     project.id,
                        parser:    JSON.stringify(parser_usecase)

                }, function (err, usecase) {
                    if (err) throw err;

                    Relationship.upsert(project.id, parser_usecase, usecase, true, function () {

                            /*
                             * Remap and prepare actors to insert
                             */
                            var actors = [];
                            for (var actor in parser_usecase.actors) {
                                actors.push({
                                    name:           parser_usecase.actors[actor].name,
                                    description:    parser_usecase.actors[actor].description
                                });
                            }

                            /*
                             * Remap and prepare extension_points to insert
                             */
                            var extension_points = [];
                            for (var i in parser_usecase.extension_points) {
                                extension_points.push({
                                    name:           parser_usecase.extension_points[i].name,
                                    step_no:        parser_usecase.extension_points[i].step_no,
                                    usecase_id:     usecase.id,
                                    project_id:     project.id
                                });
                            }



                            /*
                             * Remap and prepare steps to insert
                             *
                             * step_types:
                             *
                             * 1 = trigger
                             * 2 = step
                             * 3 = condition
                             * 4 = precondition
                             * 5 = postcondition
                             */
                            var steps = [];

                            for (var i in parser_usecase.triggers) {

                                var step = parser_usecase.triggers[i];

                                var arguments = [];
                                for (var i in step.args) {
                                    arguments.push({
                                        value: step.args[i]
                                    });
                                };

                                steps.push({
                                    no:             step.no,
                                    name:           step.name,
                                    orig_name:      step.orig_name,
                                    played_by:      step.played_by,
                                    inherited:      step.inherited,
                                    step_type_id:   1,
                                    argument:       arguments,
                                    project_id:     project.id,
                                    usecase:        usecase
                                });
                            }

                            for (var step_no in parser_usecase.steps) {

                                var step = parser_usecase.steps[step_no];

                                if (step.type === "step") {
                                    var step_type = 2;
                                } else if (step.type === "condition") {
                                    var step_type = 3;
                                }

                                var arguments = [];
                                for (var i in step.args) {
                                    arguments.push({
                                        value: step.args[i]
                                    });
                                };

                                steps.push({
                                    no:             step.no,
                                    section:        step.section,
                                    name:           step.name,
                                    orig_name:      step.orig_name,
                                    played_by:      step.played_by,
                                    inherited:      step.inherited,
                                    step_type_id:   step_type,
                                    argument:       arguments,
                                    project_id:     project.id,
                                    usecase:        usecase
                                });
                            }


                            for (var i in parser_usecase.preconditions) {

                                var step = parser_usecase.preconditions[i];

                                var arguments = [];
                                for (var i in step.args) {
                                    arguments.push({
                                        value: step.args[i]
                                    });
                                };

                                steps.push({
                                    no:             step.no,
                                    name:           step.name,
                                    orig_name:      step.orig_name,
                                    played_by:      step.played_by,
                                    inherited:      step.inherited,
                                    step_type_id:   4,
                                    argument:       arguments,
                                    project_id:     project.id,
                                    usecase:        usecase
                                });
                            }

                            for (var i in parser_usecase.postconditions) {

                                var step_type = 5,
                                    step = parser_usecase.postconditions[i];

                                var arguments = [];
                                for (var i in step.args) {
                                    arguments.push({
                                        value: step.args[i]
                                    });
                                };

                                steps.push({
                                    no:             step.no,
                                    name:           step.name,
                                    orig_name:      step.orig_name,
                                    played_by:      step.played_by,
                                    inherited:      step.inherited,
                                    step_type_id:   5,
                                    argument:       arguments,
                                    project_id:     project.id,
                                    usecase:        usecase
                                });
                            }

                            /*
                             * Do insert!
                             *
                             * 1. Create actors
                             */
                            Actor.create(actors, function (err, actors) {
                                if (err) throw err;

                                var addExtensionPoints = function (usecase, extension_points) { return new Promise(function (resolve, reject) {
                                    if (extension_points.length === 0) resolve();

                                    /*
                                     * Add extension_points
                                     */
                                    ExtensionPoint.create(extension_points, function (err, extension_points) {
                                        if (err) throw err;


                                        usecase.addExtensionPoint(extension_points, function (err) {
                                            if (err) throw err;

                                            resolve();
                                        });

                                    });
                                })};

                                addExtensionPoints(usecase, extension_points).done(function () {

                                    /*
                                     * Actors are not required
                                     */
                                    if (actors.length > 0) {


                                        /*
                                         * 2. Add actors to usecase
                                         */
                                        usecase.addActor(actors, function (err) {
                                            if (err) throw err;



                                                /*
                                                 * 4. Create steps along with arguments
                                                 */
                                                Step.create(steps, function (err, steps) {
                                                    if (err) throw err;

                                                    /*
                                                     * 5. Finally, add steps to usecase
                                                     */
                                                    usecase.addStep(steps, function (err) {
                                                        if (err) throw err;

                                                            done(usecase, parser_usecase);


                                                    });
                                                });
                                        });

                                    } else {


                                            /*
                                             * 4. Create steps along with arguments
                                             */
                                            Step.create(steps, function (err, steps) {
                                                if (err) throw err;

                                                /*
                                                 * 5. Finally, add steps to usecase
                                                 */
                                                usecase.addStep(steps, function (err) {
                                                    if (err) throw err;

                                                        done(usecase, parser_usecase);

                                                });
                                            });
                                    }

                                });

                            });
                    });

                });


                /*
                 * UPDATE
                 */
            } else if (usecases.length === 1) {
                var usecase = usecases[0];


                Relationship.upsert(project.id, parser_usecase, usecase, false, function () {

                    usecase['parser'] = JSON.stringify(parser_usecase);

                    var attrs = ["name", "level", "path", "description", "specializes", "body"];
                    for (var i in attrs) {
                        if (usecase[attrs[i]] === parser_usecase[attrs[i]])
                            delete parser_usecase[attrs[i]];
                        else
                            usecase[attrs[i]] = parser_usecase[attrs[i]];
                    }

                    usecase.steps_ordered = JSON.stringify(parser_usecase.steps_ordered);
                    delete parser_usecase['steps_ordered'];

                    usecase.save(function (err) {
                        if (err) throw err;


                        /*
                         * ACTORS
                         */
                        usecase.getActor(function (err, db_actors) {

                            var actors = {
                                remove:   [],
                                create:   [],
                                update:   []
                            };

                            for (var i in db_actors) {
                                var db_actor = db_actors[i],
                                    parser_actor = (db_actor.name in parser_usecase.actors) ? parser_usecase.actors[db_actor.name] : null;

                                if (parser_actor === null) {
                                    actors.remove.push(db_actor);
                                } else {
                                    // update
                                    var attrs = ["name", "description"];
                                    for (var i in attrs) {
                                        if (db_actor[attrs[i]] === parser_actor[attrs[i]])
                                            delete parser_actor[attrs[i]];
                                        else
                                            db_actor[attrs[i]] = parser_actor[attrs[i]];
                                    }

                                    if (Object.keys(parser_actor).length === 0)
                                        delete parser_usecase.actors[db_actor.name];

                                    actors.update.push(db_actor);
                                }
                            }

                            // add new from parser_usecase
                            for (var actor in parser_usecase.actors) {
                                // check if actor in db_actors
                                var skip = false;
                                for (var i in db_actors)
                                    if (db_actors[i].name === actor) {
                                        skip = true;
                                        break;
                                    }
                                if (skip) continue;

                                // add new
                                actors.create.push({
                                    name:           parser_usecase.actors[actor].name,
                                    description:    parser_usecase.actors[actor].description
                                });
                            }

                            if (Object.keys(parser_usecase.actors).length === 0)
                                delete parser_usecase.actors;

                            /*
                             * Extension points
                             */

                            usecase.getExtensionPoint(function (err, db_extension_points) {

                                var extension_points = {
                                    remove:   [],
                                    create:   [],
                                    update:   []
                                };
                                for (var i in db_extension_points) {
                                    var db_extension_point = db_extension_points[i],
                                        parser_extension_point = (db_extension_point.step_no in parser_usecase.extension_points) ? parser_usecase.extension_points[db_extension_point.step_no] : null;

                                    if (parser_extension_point === null) {
                                        extension_points.remove.push(db_extension_point);
                                    } else {
                                        // update
                                        var attrs = ["name", "step_no"];
                                        for (var i in attrs) {
                                            if (db_extension_point[attrs[i]] === parser_extension_point[attrs[i]])
                                                delete parser_extension_point[attrs[i]];
                                            else
                                                db_extension_point[attrs[i]] = parser_extension_point[attrs[i]];
                                        }

                                        if (Object.keys(parser_extension_point).length === 0)
                                            delete parser_usecase.extension_points[db_extension_point.step_no];

                                        extension_points.update.push(db_extension_point);
                                    }
                                }

                                // add new from parser_usecase
                                for (var step_no in parser_usecase.extension_points) {
                                    // check if step_no in db_extension_points
                                    var skip = false;
                                    for (var i in db_extension_points)
                                        if (db_extension_points[i].step_no === step_no) {
                                            skip = true;
                                            break;
                                        }
                                    if (skip) continue;

                                    // add new
                                    extension_points.create.push({
                                        name:           parser_usecase.extension_points[step_no].name,
                                        step_no:        parser_usecase.extension_points[step_no].step_no,
                                        usecase_id:     usecase.id,
                                        project_id:     project.id

                                    });
                                }

                                if (Object.keys(parser_usecase.extension_points).length === 0)
                                    delete parser_usecase.extension_points;


                                /*
                                 * STEPS
                                 */
                                var steps = {
                                    remove:   [],
                                    create:      [],
                                    update:   []
                                },
                                    argument_remove_ids = [-1],
                                    triggers_orig = JSON.parse(JSON.stringify(parser_usecase.triggers)),
                                    steps_orig = JSON.parse(JSON.stringify(parser_usecase.steps)),
                                    preconditions_orig = JSON.parse(JSON.stringify(parser_usecase.preconditions)),
                                    postconditions_orig = JSON.parse(JSON.stringify(parser_usecase.postconditions));


                                    usecase.getStep(function (err, db_steps) {
                                        if (err) throw err;

                                        for (var i in db_steps) {
                                            var db_step = db_steps[i],
                                                parser_step = null, parser_step_i;

                                            /*
                                             * Find corresponding parser_step in parser_usecase.steps
                                             *
                                             * step_types:
                                             *
                                             * 1 = trigger
                                             * 2 = step
                                             * 3 = condition
                                             * 4 = precondition
                                             * 5 = postcondition
                                             */
                                            switch (db_step.step_type_id) {
                                                case 1:
                                                    for (var i in parser_usecase.triggers) {
                                                        if (parser_usecase.triggers[i].name === db_step.name) {
                                                            parser_step = parser_usecase.triggers[i];
                                                            parser_step_i = i;
                                                            break;
                                                        }
                                                    }
                                                    break;

                                                case 2:
                                                case 3:
                                                    for (var step_no in parser_usecase.steps) {
                                                        if (parser_usecase.steps[step_no].name === db_step.name
                                                                && step_no === db_step.no) {
                                                            parser_step = parser_usecase.steps[step_no];
                                                            parser_step_i = step_no;
                                                            break;
                                                        }
                                                    }
                                                    break;

                                                case 4:
                                                    for (var i in parser_usecase.preconditions) {
                                                        if (parser_usecase.preconditions[i].name === db_step.name) {
                                                            parser_step = parser_usecase.preconditions[i];
                                                            parser_step_i = i;
                                                            break;
                                                        }
                                                    }
                                                    break;

                                                case 5:
                                                    for (var i in parser_usecase.postconditions) {
                                                        if (parser_usecase.postconditions[i].name === db_step.name) {
                                                            parser_step = parser_usecase.postconditions[i];
                                                            parser_step_i = i;
                                                            break;
                                                        }
                                                    }
                                                    break;

                                            }

                                            if (parser_step === null) {
                                                steps.remove.push(db_step);
                                                for (var i in db_step.argument) {
                                                    argument_remove_ids.push(db_step.argument[i].id);
                                                }
                                            } else {
                                                // update
                                                var attrs = ["no", "name", "orig_name", "played_by", "inherited", "section"];
                                                for (var i in attrs) {
                                                    if (db_step[attrs[i]] === parser_step[attrs[i]])
                                                        delete parser_step[attrs[i]];
                                                    else
                                                        db_step[attrs[i]] = parser_step[attrs[i]];
                                                }

                                                // if arg is not found in db args, add argument
                                                for (var i in parser_step.args) {
                                                    var found = false;
                                                    for (var j in db_step.argument) {
                                                        if (parser_step.args[i] === db_step.argument[j].value) {
                                                            found = true;
                                                            break;
                                                        }
                                                    }
                                                    if (!found) {
                                                        db_step.argument.push({value:parser_step.args[i]});

                                                    }
                                                }

                                                // if arg is found in parser args, nothing to do
                                                for (var i in db_step.argument) {
                                                    var found = false;

                                                    for (var j in parser_step.args) {
                                                        if (parser_step.args[j] === db_step.argument[i].value) {
                                                            delete parser_step.args[j];
                                                            found = true;
                                                            break;
                                                        }
                                                    }

                                                    // if not found in parser_step, then delete it
                                                    if (!found) {
                                                        argument_remove_ids.push(db_step.argument[i].id);
                                                        delete db_step.argument[i];
                                                    }
                                                }


                                                steps.update.push(db_step);




                                                switch (db_step.step_type_id) {
                                                    case 1:
                                                        if (Object.keys(parser_usecase.triggers[parser_step_i]).length === 0)
                                                            delete parser_usecase.triggers[parser_step_i];
                                                        break;

                                                    case 2:
                                                    case 3:
                                                        if (Object.keys(parser_usecase.steps[parser_step_i]).length === 0)
                                                            delete parser_usecase.steps[parser_step_i];
                                                        break;

                                                    case 4:
                                                        if (Object.keys(parser_usecase.preconditions[parser_step_i]).length === 0)
                                                            delete parser_usecase.preconditions[parser_step_i];
                                                        break;

                                                    case 5:
                                                        if (Object.keys(parser_usecase.postconditions[parser_step_i]).length === 0)
                                                            delete parser_usecase.postconditions[parser_step_i];
                                                        break;

                                                }

                                                parser_step.args =
                                                    parser_step.args.filter(String);

                                                if (parser_step.args.length === 0)
                                                    delete parser_step.args;

                                                if (Object.keys(parser_step).length === 1 && 'type' in parser_step)
                                                    delete parser_step.type;

                                            }
                                        }

                                        /*
                                         * Remove empty fields to reflect changes
                                         */
                                        for (var i in parser_usecase.triggers) {
                                            if (Object.keys(parser_usecase.triggers[i]).length === 0)
                                                delete parser_usecase.triggers[i];
                                        }
                                        parser_usecase.triggers =
                                            parser_usecase.triggers.filter(Object);
                                        if (parser_usecase.triggers.length === 0)
                                            delete parser_usecase.triggers;

                                        for (var i in parser_usecase.steps) {
                                            if (Object.keys(parser_usecase.steps[i]).length === 0)
                                                delete parser_usecase.steps[i];
                                        }

                                        if (Object.keys(parser_usecase.steps).length === 0)
                                            delete parser_usecase.steps;

                                        for (var i in parser_usecase.preconditions) {
                                            if (Object.keys(parser_usecase.preconditions[i]).length === 0)
                                                delete parser_usecase.preconditions[i];
                                        }
                                        parser_usecase.preconditions =
                                            parser_usecase.preconditions.filter(Object);
                                        if (parser_usecase.preconditions.length === 0)
                                            delete parser_usecase.preconditions;

                                        for (var i in parser_usecase.postconditions) {
                                            if (Object.keys(parser_usecase.postconditions[i]).length === 0)
                                                delete parser_usecase.postconditions[i];
                                        }
                                        parser_usecase.postconditions =
                                            parser_usecase.postconditions.filter(Object);
                                        if (parser_usecase.postconditions.length === 0)
                                            delete parser_usecase.postconditions;



                                        // add triggers steps that are not included in the db_steps
                                        for (var i in triggers_orig) {
                                            // check if step in db_steps
                                            var skip = false;
                                            for (var j in db_steps)
                                                if (db_steps[j].name === triggers_orig[i].name
                                                        && db_steps[j].step_type_id === 1) {
                                                    skip = true;
                                                    break;
                                                }
                                            if (skip) continue;


                                            var step = triggers_orig[i],
                                                arguments = [];

                                            for (var i in step.args) {
                                                arguments.push({
                                                    value: step.args[i]
                                                });
                                            };

                                            // add new
                                            steps.create.push({
                                                no:             step.no,
                                                name:           step.name,
                                                section:           step.section,
                                                orig_name:           step.orig_name,
                                                played_by:      step.played_by,
                                                step_type_id:   1,
                                                argument:       arguments,
                                                project_id:     project.id,
                                                usecase:        usecase
                                            });

                                        }


                                        // add scenario steps that are not included in the db_steps
                                        for (var step_no in steps_orig) {
                                            // check if step in db_steps
                                            var skip = false;
                                            for (var j in db_steps)
                                                if (db_steps[j].no === step_no
                                                        && db_steps[j].name === steps_orig[step_no].name
                                                        && (db_steps[j].step_type_id === 2 || db_steps[j].step_type_id === 3)) {
                                                    skip = true;
                                                    break;
                                                }
                                            if (skip) continue;


                                            var step = steps_orig[step_no],
                                                arguments = [];

                                            for (var i in step.args) {
                                                arguments.push({
                                                    value: step.args[i]
                                                });
                                            };

                                            // add new
                                            steps.create.push({
                                                no:             step.no,
                                                name:           step.name,
                                                orig_name:           step.orig_name,
                                                played_by:      step.played_by,
                                                step_type_id:   (step.type === "step") ? 2 : 3,
                                                argument:       arguments,
                                                project_id:     project.id,
                                                usecase:        usecase
                                            });

                                        }


                                        // add preconditions steps that are not included in the db_steps
                                        for (var i in preconditions_orig) {
                                            // check if step in db_steps
                                            var skip = false;
                                            for (var j in db_steps)
                                                if (db_steps[j].name === preconditions_orig[i].name
                                                    && db_steps[j].step_type_id === 4) {
                                                    skip = true;
                                                    break;
                                                }
                                            if (skip) continue;


                                            var step = preconditions_orig[i],
                                                arguments = [];

                                            for (var i in step.args) {
                                                arguments.push({
                                                    value: step.args[i]
                                                });
                                            };

                                            // add new
                                            steps.create.push({
                                                no:             step.no,
                                                name:           step.name,
                                                orig_name:           step.orig_name,
                                                played_by:      step.played_by,
                                                step_type_id:   4,
                                                argument:       arguments,
                                                project_id:     project.id,
                                                usecase:        usecase
                                            });

                                        }


                                        // add postconditions steps that are not included in the db_steps
                                        for (var i in postconditions_orig) {
                                            // check if step in db_steps
                                            var skip = false;
                                            for (var j in db_steps)
                                                if (db_steps[j].name === postconditions_orig[i].name
                                                    && db_steps[j].step_type_id === 5) {
                                                    skip = true;
                                                    break;
                                                }
                                            if (skip) continue;


                                            var step = postconditions_orig[i],
                                                arguments = [];

                                            for (var i in step.args) {
                                                arguments.push({
                                                    value: step.args[i]
                                                });
                                            };

                                            // add new
                                            steps.create.push({
                                                no:             step.no,
                                                name:           step.name,
                                                orig_name:           step.orig_name,
                                                played_by:      step.played_by,
                                                step_type_id:   5,
                                                argument:       arguments,
                                                project_id:     project.id,
                                                usecase:        usecase
                                            });

                                        }


                                        /*
                                         * Do update!
                                         *
                                         * 1. delete actors from db
                                         */
                                        usecase.removeActor(actors.remove, function (err) {
                                            if (err) throw err;


                                            var actor_ids = [-1];
                                            for (var i in actors.remove) actor_ids.push(actors.remove[i].id);

                                            Actor.find({id: actor_ids}).remove(function (err) {
                                                if (err) throw err;

                                                /*
                                                 * 2. create new actors
                                                 */
                                                Actor.create(actors.create, function (err, new_actors) {
                                                    if (err) throw err;

                                                    /*
                                                     * 3. update existing actors
                                                     */
                                                    usecase.setActor(actors.update.concat(new_actors), function (err) {
                                                        if (err) throw err;

                                                        /*
                                                         * delete extension_points
                                                         */
                                                        usecase.removeExtensionPoint(extension_points.remove, function (err) {
                                                            if (err) throw err;


                                                            var extension_point_ids = [-1];
                                                            for (var i in extension_points.remove) extension_point_ids.push(extension_points.remove[i].id);

                                                            ExtensionPoint.find({id: extension_point_ids}).remove(function (err) {
                                                                if (err) throw err;

                                                                /*
                                                                 * create  extension_points
                                                                 */
                                                                ExtensionPoint.create(extension_points.create, function (err, new_extension_points) {
                                                                    if (err) throw err;

                                                                    /*
                                                                     * update existing  extension_points
                                                                     */
                                                                    usecase.setExtensionPoint(extension_points.update.concat(new_extension_points), function (err) {
                                                                        if (err) throw err;


                                                                        /*
                                                                         * 4. delete steps from db
                                                                         */
                                                                        usecase.removeStep(steps.remove, function (err) {
                                                                            if (err) throw err;


                                                                            var step_ids = [-1];
                                                                            for (var i in steps.remove) step_ids.push(steps.remove[i].id);


                                                                            Step.find({id: step_ids}).each(function (step) {
                                                                                step.argument = [];

                                                                            }).save(function (err) {
                                                                                if (err) throw err;

                                                                                Step.find({id: step_ids}).remove(function (err) {
                                                                                    if (err) throw err;


                                                                                    Argument.find({id: argument_remove_ids}).remove(function (err) {
                                                                                        if (err) throw err;



                                                                                        /*
                                                                                         * 5. create new steps
                                                                                         */
                                                                                        Step.create(steps.create, function (err, new_steps) {
                                                                                            if (err) throw err;

                                                                                            /*
                                                                                             * 6. update existing steps
                                                                                             */
                                                                                            usecase.setStep(steps.update.concat(new_steps), function (err) {
                                                                                                if (err) throw err;

                                                                                                    done(usecase, parser_usecase);


                                                                                            });

                                                                                        });

                                                                                    });
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });


                                                    });
                                                });
                                            });
                                        });

                                    });


                            });


                        });
                    });
                });
            }

        });

    };


    Usecase.upsertFragments = function (usecase, parser_tables, parser_fragments, done) {

        //console.log(parser_tables[0].table);

        var Fragment = db.models.fragment;
        parser_fragments = Fragment.assignStepsToFragments(parser_tables, parser_fragments);

        usecase.getFragment(function (err, db_fragments) {
            if (err) throw err;


            var changes = {
                remove:   [],
                create:   [],
                update:   []
            };

            /*
             * real updates: in case of DB, we need to store in update all items (to set realated table)
             * that's why there are also real_updates, they are passed to done()
             */
            var updates = [];

            // if files in database are not found in parser_files, delete them from db
            for (var i in db_fragments) {
                var db_fragment = db_fragments[i],
                    found = false;

                for (var j in parser_fragments) {
                    if (parser_fragments[j].path === db_fragment.path &&
                        parser_fragments[j].position === db_fragment.position) {

                        found = true;

                        //console.log("\""+db_fragment.body+"\"");
                        //console.log("\""+parser_fragments[j].body+"\"");
                        // if they are found, check for changes
                        if (db_fragment.body    != parser_fragments[j].body ||
                            db_fragment.steps   != parser_fragments[j].steps) {

                            db_fragment.last_body = db_fragment.body;

                            db_fragment.body    = parser_fragments[j].body;
                            db_fragment.strategy = parser_fragments[j].strategy;
                            db_fragment.steps   = parser_fragments[j].steps;

                            changes.update.push(db_fragment);
                            updates.push(db_fragment);
                        } else {
                            changes.update.push(db_fragment);
                        }
                        break;
                    }
                }

                if (!found) {
                    changes.remove.push(db_fragment);
                }
            }


            // if files in parser are not found in db, create them
            for (var i in parser_fragments) {
                var parser_fragment = parser_fragments[i],
                    found = false;

                for (var j in db_fragments) {
                    if (db_fragments[j].path === parser_fragment.path &&
                        db_fragments[j].position === parser_fragment.position) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    var f = {
                        path:       parser_fragment.path,
                        position:       parser_fragment.position,
                        body:       parser_fragment.body,
                        last_body:  "",
                        section:    parser_fragment.section,
                        lang:       parser_fragment.lang ? parser_fragment.lang : fstools.extractExtension(parser_fragment.path).toLowerCase(),
                        notation:   parser_fragment.notation,
                        usecase:    usecase,
                        strategy:   parser_fragment.strategy,

                        project_id: usecase.project_id,
                        steps:      parser_fragment.steps
                    };

                    changes.create.push(f);
                }
            }


            /*
             * Do update!
             *
             * 1. delete fragments from db
             */
            usecase.removeFragment(changes.remove, function (err) {
                if (err) throw err;

                var remove_ids = [-1];
                for (var i in changes.remove) remove_ids.push(changes.remove[i].id);

                Fragment.find({id: remove_ids}).remove(function (err) {
                    if (err) throw err;

                    /*
                     * 2. create new fragments
                     */
                    Fragment.create(changes.create, function (err, created) {
                        if (err) throw err;

                        /*
                         * 3. update existing fragments
                         */
                        usecase.setFragment(changes.update.concat(created), function (err) {
                            if (err) throw err;

                            done({
                                remove:   changes.remove,
                                create:   created,
                                update:   updates
                            });

                        });

                    });

                });


            });



        });


    };


    /**
     * this must be sequential
     */
    Usecase.syncUC = function (project, parser_usecase) {

        var Usecase             = db.models.usecase;

        return new Promise(function(resolve, reject) {

            if (parser_usecase) {

                var tables = parser_usecase.tables,
                    fragments = parser_usecase.fragments;


                db.transaction(function (err, transaction) {
                    if (err) throw err;


                    Usecase.upsert(parser_usecase, project, function (usecase, usecase_changes) {

                        if (usecase === null) {
                            transaction.rollback(function (err) {
                                if (err) throw err;
                                resolve();
                            });
                            return;
                        }

                        Usecase.upsertFragments(usecase, tables, fragments, function (fragments_changes) {
                            if (err) throw err;

                            transaction.commit(function (err) {
                                if (err) throw err;

                                resolve({usecase_changes: usecase_changes, fragments_changes: fragments_changes});
                            });
                        });


                    })
                });
            } else {
                // proceed
                resolve();
            }
        });
    };




    return Usecase;
};
