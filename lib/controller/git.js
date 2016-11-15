
var argv = require('minimist')(process.argv.slice(2), {
    boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help", "version"]
}),
    fstools       = require('../helpers/fstools'),
    utils       = require('../helpers/utils'),
    parser      = require('../parser'),
    Logger      = require('../logger'),
    tmp = require('tmp'),
    fs = require('fs'),
    path = require('path'),
    watch_path = argv._.length===1 ? path.resolve(argv._[0]) : false,
    logger      = new Logger([]),
    table = require('markdown-table'),
    orm = require("orm"),
    cp = require('child_process'),

    jsdiff = require('diff'),
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
    };;

module.exports = function (db) {

    var ctrl = this;

    this.run = function (project, fin) {


        var Git = require("nodegit"),
            Commit = db.models.commit,
            StructChange = db.models.struct_change,
            UsecaseCommit = db.models.usecase_commit,
            Fragment = db.models.fragment,
            repo,
            repo_path =  path.resolve(argv.g?argv.g:argv.git),
            visitedCommits = {},
            processedCommits = {};

        function iterate(commit, parentId, limit) {


            return new Promise(function (fi) {

                if (commit.sha() in visitedCommits) {
                    fi();
                    return true;
                }
                visitedCommits[commit.sha()] = null;


                if (limit && Object.keys(processedCommits).length >= limit) {
                    fi();
                    return true;
                }


                if (!utils.startsWith(commit.message(), "Merge")) {
                    processedCommits[commit.sha()] = null;
                }

                var child = cp.fork(__dirname + "/git_process");

                // process(commit).then(function() {
                child.on('message', function(m) {

                    if(commit.parentcount() === 0) {
                        commit.free();
                        // done
                        fi(true);
                        // return true;
                    } else {

                        var iterateParents = [],
                            iterateParent = function (commitIn, parentIdIn) {
                                var nextid = commitIn.parentId(parentIdIn);

                                return repo.getCommit(nextid).then(function (commitInIn) {
                                    return iterate(commitInIn, parentIdIn, limit);
                                })
                            };

                        for (var i = 0; i < commit.parentcount(); i++) {
                            iterateParents.push(iterateParent(commit, i))
                        }

                        return Promise.all(iterateParents).then(function () {
                            var nextid = commit.parentId(parentId);
                            // child.kill();
                            commit.free();

                            // walking of parent tree finished
                            if (!nextid)
                                fi(true);
                            else
                                return repo.getCommit(nextid).then(function (commit) {
                                    return iterate(commit, parentId, limit).then(function () {fi()});
                                })
                        })
                    }

                });

                child.on('exit', function(code) {
                    // if (code !== 0) {console.log('Failed: ' + code);}
                    // console.log('EXIT child')
                });

                child.send({
                    commit_id:commit.id().toString(),
                    commit_sha:commit.sha(),
                    commit_message:commit.message(),
                    repo_path: repo_path,
                    watch_path: watch_path,
                    db: db,
                    project: project
                });
            });
        }

        return ctrl.removeStats(project).then(function () {
            Git.Repository.open(repo_path)
                .then(function (re) {
                    repo = re;
                    return repo.getHeadCommit();
                  })
                  .then(function (commit) {
                    return iterate(commit, 0, argv.l?parseInt(argv.l):999999);
                  })
                  .then(function () {
                      var tab_arr = [["Processed", "All"]];

                      logger.log("");
                      logger.logH1("Commit summary");
                      logger.log("");

                      tab_arr.push([Object.keys(processedCommits).length, Object.keys(visitedCommits).length]);

                      logger.log(table(tab_arr));
                      logger.log("");
                      logger.log("S: Strength; R: Relevance");
                  })
                  .then(ctrl.printRelationshipList(project))
                  .then(ctrl.printRelationshipCount(project))
                  .done(function () {
                    //   logger.log("Done! "+Object.keys(processedCommits).length+" commits");
                  })
              })



    }


    this.printRelationshipCount = function (project) {

        return function () {
            var Usecase = db.models.usecase,
                UsecaseCommit = db.models.usecase_commit,
                ucs = {};

            return new Promise(function (f) {

                Usecase.find({project_id: project.id}, function (err, usecases) {
                    if (err) throw err;
                    var getCount = function (usecase_name, usecase_id, i, strength, relevance, eq) {
                        return new Promise(function (fi) {

                            var criteria = {
                                usecase_id: usecase_id,
                                commit_project_id: project.id,
                                within_percent: orm.gte(strength),
                                commit_relevance_percent: orm.gte(relevance)
                            }
                            if (eq) {
                                criteria["within_percent"] = 0;
                            }

                            UsecaseCommit.count(criteria, function (err, count) {
                                if (err) throw err;
                                if (!(usecase_id in ucs)) ucs[usecase_id] = {};
                                ucs[usecase_id][i] = {
                                    usecase_name: usecase_name,
                                    usecase_id: usecase_id,
                                    strength: strength,
                                    relevance: relevance,
                                    count: count
                                }
                                fi();
                            })

                        })
                    }

                    var prom_ucs = [];

                    for (var i in usecases) {
                        var usecase = usecases[i];

                        prom_ucs.push(getCount(usecase.name, usecase.id, 0, 0, 0, true))
                        for (var j=1; j<=5; j++) {
                            prom_ucs.push(getCount(usecase.name, usecase.id, j, j*20, j*20, false))
                        }
                    }

                    Promise.all(prom_ucs).then(function () {

                        var tab_arr = [],
                            head  = [];
                        head.push("Use case");
                        head.push("S=0;R>0");
                        for (var j=1; j<=4; j++) {
                            head.push("S>"+(j*20)+";"+"R>"+(j*20));
                        }
                        head.push("S=100;R=100");
                        tab_arr.push(head);

                        for (var usecase_id in ucs) {
                            var data = ucs[usecase_id],
                                row = [];

                            row.push(data[1].usecase_name);
                            for (var j=0; j<=5; j++) {
                                row.push(data[j].count);
                            }
                            tab_arr.push(row);
                        }

                        logger.log("");
                        logger.logH1("Relationship count");
                        logger.log("");
                        logger.log(table(tab_arr));

                        f();
                    })
                })

            });
        }
    }

    this.printRelationshipList = function (project) {

        return function () {
            var UsecaseCommit = db.models.usecase_commit,
                tab_arr = [["Use case", "Strength", "Relevance", "#Commit", "Size"]];

            return new Promise(function (f) {
                UsecaseCommit.find({
                        commit_project_id: project.id,
                        within_percent: orm.gt(0),
                        commit_relevance_percent: orm.gt(0)
                    }).order("usecase_id").run(function (err, uc) {

                    if (err) throw err;

                    for (var i in uc) {
                        var rel = uc[i];
                        tab_arr.push([rel.usecase.name, rel.within_percent.toFixed(2), rel.commit_relevance_percent.toFixed(2), rel.commit_sha.substring(0,7), rel.struct_change_sum])
                    }

                    if (tab_arr.length > 1) {
                        logger.log("");
                        logger.logH1("Relationships S>0");
                        logger.log("");
                        logger.log(table(tab_arr));
                    } else {
                        logger.log("\nNo relationships found\n")

                    }
                    f();
                });

            })
        }

    }


    this.removeStats = function (project) {
        var Commit = db.models.commit,
            UsecaseCommit = db.models.usecase_commit,
            StructChange = db.models.struct_change;
        return new Promise(function (f,r) {
            Commit.find({ project_id: project.id }).remove(function (err) {
                if (err) throw err;
                UsecaseCommit.find({ commit_project_id: project.id }).remove(function (err) {
                    if (err) throw err;
                    db.driver.execQuery("delete from struct_change;", function (err, data) {
                        if (err) throw err;
                        f();
                    });
                    // StructChange.find({ project_id: project.id }).remove(function (err) {
                    //     if (err) throw err;
                    //     f();
                    // });
                });
            });
        });
    }


    this.getBlob = function (repository, commit, path) {

        var result = {};

        return new Promise(function (f,r) {

            return repository.getCommit(commit.id()).then(function (commit) {
                commit.getTree().then(function(tree) {
                    return tree.entryByPath(path);
                }).then(function(treeEntry) {
                    result['treeEntry'] = treeEntry;
                    return repository.getBlob(treeEntry.sha());
                })
                .then(function(blob) {
                    result['blob'] = blob;
                    f(result);
                })
                .catch(function(err) {
                    f(null);
                    //console.log(err);  [Error: the path '?' does not exist in the given tree]
                })

            });
        })

    }

    this.getRevBody = function (repo_path, st) {
        var command = "cd "+repo_path+"; git show "+st;

        var execSync = require('child_process').execSync;
        try{
            var code = execSync(command, {stdio: [null, null, null]});
        } catch (error) {
            // console.log("ERR", path, String(error.stdout));
            return "";
        }
        // console.log(code.toString());
        return code.toString();

    }

    this.reversePatch = function (blobBody, patchBody, path) {


        if (/^\s*$/.test(patchBody)) {
            return blobBody;
        }

        var patchTmpobj = tmp.fileSync();
        var blobTmpobj = tmp.fileSync();

        patchBody = "--- "+blobTmpobj.name + "\t2016-11-02 16:34:28.561371144 +0100\n"+
            "+++ "+blobTmpobj.name + "\t2016-11-02 16:25:22.905338034 +0100\n"+
            patchBody;

        fs.writeFileSync(patchTmpobj.name, patchBody, "utf-8");
        fs.writeFileSync(blobTmpobj.name, blobBody, "utf-8");

        var command = 'patch -u -R '+blobTmpobj.name+' < '+patchTmpobj.name;

        var execSync = require('child_process').execSync;
        try{
            var code = execSync(command);
        } catch (error) {
            // skip Unreversed patch detected!
            if (!(String(error.stdout).indexOf("Unreversed patch detected!") !== -1)) {
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
                console.log("ERR", path, String(error.stdout));
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
                console.log(blobBody);
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
                console.log(patchBody);
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            }

        }

        var reversed = fs.readFileSync(blobTmpobj.name, "utf-8");

        patchTmpobj.removeCallback();
        blobTmpobj.removeCallback();

        return reversed;
    }


    this.consider_the_same_if_similarity_is_higher_than = 90;
    this.skip_following_tree3_structure = true;

    // return changes, tree1 is previous, tree2 is current
    // it just must follow tree3 structure, otherwise it is ignored
    this.diffBlocks = function (tree1, tree2, tree3, change, max_lvl, inTree3, lvl, stats) {

        if (!lvl) lvl = 1;
        if (!inTree3) inTree3 = false;
        if (!stats) stats = {
            inTree3: {
                updated: 0,
                removed: 0,
                added: 0,
                changesSum: 0,
                unchanged: 0,
            },
            updated: 0,
            removed: 0,
            added: 0,
            changesSum: 0,
            unchanged: 0,
            addToStats: function (change) {
                this[change.change]++;
                if (change.inTree3)  {
                    this.inTree3[change.change]++;
                    if (change.change !== "unchanged") this.inTree3.changesSum++;
                }
                if (change.change !== "unchanged") this.changesSum++;
            }
        };

        if (tree1.body === tree2.body) {
            var c = {name: tree1.name, type: tree1.type, inTree3: tree3, change: "unchanged"};
            stats.addToStats(c);
            return {tree: c, stats: stats};
        } else {
            if (!change) change = "updated";
            var changeTree = {name: tree1.name, type: tree1.type, inTree3: inTree3, change: change};
            stats.addToStats(changeTree);
            // if (change === "updated") {
            //     if (utils.contains(["attribute-assignment"], changeTree.type))
            //         changeTree["diff"] = jsdiff.diffLines(tree1.body, tree2.body);
            // }


            // html:   ["unknown", "comment", "template"],
            // tpl:    ["unknown", "comment", "template"],
            // css:    ["comment"],
            // js:     ["assignment", "comment", "function", "function-call", "assignment"],
            //
            // php:    ["method", "attribute", "attribute-assignment", "comment", "statement"],
            // java:   ["method", "attribute", "attribute-assignment", "comment", "statement"],
            // cpp:    ["method", "include", "attribute", "attribute-assignment", "comment", "statement"],
            // rb:     ["method", "attribute", "attribute-assignment", "comment", "statement"],
            // cs:     ["method", "attribute", "attribute-assignment", "comment", "statement"],
            // py:     ["method", "comment"],
            // python: ["method", "comment"],
            //
            // feature: ["scenario", "comment", "g"],
            // skip traversing (we don't need it at this deep lvl)
            if (utils.contains(
                ["unknown", "comment", "template", "method", "assignment", "comment", "function", "function-call", "assignment", "method", "include", "attribute", "attribute-assignment", "comment", "statement", "scenario", "comment", "g"],
                changeTree.type))
                return {tree: changeTree, stats: stats};
            else {
                if (max_lvl <= lvl) return {tree: changeTree, stats: stats};
                changeTree['children'] = [];
            }

            for (var i = 0; i < tree1.children.length; i++) {
                var child1 = tree1.children[i],
                    child2 = ctrl.findInTree(tree2, child1),
                    child3 = ctrl.findInTree(tree3, child1);

                // removed from tree2
                if (ctrl.skip_following_tree3_structure || child3) {
                    if (!child2) {
                        var c = {name: child1.name, type: child1.type, inTree3: child3?child3:false, change: "removed"};
                        stats.addToStats(c);
                        changeTree.children.push(c)//, children: child1.children})
                    }
                    if (child2) {
                        var ch;
                        if (child1.body !== child2.body) {
                            ch = "updated";
                        } else {
                            ch = "unchanged";
                        }

                        var c = ctrl.diffBlocks(child1, child2, child3, ch, max_lvl, child3?child3:false, lvl+1, stats);

                        stats = c.stats;
                        changeTree.children.push(c.tree);
                    }
                }
            }


            for (var i = 0; i < tree2.children.length; i++) {
                var child1 = tree2.children[i],
                    child2 = ctrl.findInTree(tree1, child1),
                    child3 = ctrl.findInTree(tree3, child1);


                if (ctrl.skip_following_tree3_structure || child3) {
                    // removed from tree1
                    if (!child2) {
                        var c = {name: child1.name, type: child1.type, inTree3: child3?child3:false, change: "added"};
                        stats.addToStats(c);
                        changeTree.children.push(c)//, children: child1.children})
                    }
                }
            }

            return {tree: changeTree, stats: stats};
        }






    }

    this.findInTree = function (tree2, child1) {
        var child2 = null;

        if (tree2.children)
            for (var j = 0; j < tree2.children.length; j++) {
                var child2f = tree2.children[j];

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


    this.changesWithinTree  = function (changes, tree) {


        var result = {},
            changesOutsideOfTree = ctrl.changesOutsideOfTree(changes, tree);

        if (Object.keys(changesOutsideOfTree.tree).length === 0) {
            result['are'] = true;
        } else {
            result['are'] = false;
        }

        result['tree'] = changesOutsideOfTree.tree;
        result['stats'] = changesOutsideOfTree.stats;

        return result;

    }

    this.changesOutsideOfTree  = function (changes, tree, skipInTree3, stats) {

        if (!skipInTree3) skipInTree3 = true;
        var changesOutside = {},
            children = [];

        if (!stats) {
            stats = {
                outsideOfTree: 0,
                notInTree3: 0
            };

            var child1 = changes, child2f = tree;
            if (child1 && child2f)
                if ((child1.name && child2f.name && child1.name === child2f.name) ||
                    (!child1.name && !child2f.name && utils.similarText(child1.body, child2f.body, true) >= ctrl.consider_the_same_if_similarity_is_higher_than))  {

                    // console.log(child1.name, child2f.name);
                    // found

                } else {
                    if (changes.change && changes.change !== "unchanged") {
                        changesOutside = changes;
                        stats.outsideOfTree += 1;
                    }
                }
            else
                if (changes && changes.change && changes.change !== "unchanged") {
                    changesOutside = changes;
                    stats.outsideOfTree += 1;
                }


        }

        if (changes.children)
            for (var i = 0; i < changes.children.length; i++) {
                var child1 = changes.children[i];
                if (!child1.inTree3 && skipInTree3) {
                    // console.log(child1);
                    stats.notInTree3++;
                    continue;
                }
                if (child1.inTree3)
                    var child2 = ctrl.findInTree(tree, child1.inTree3);
                else
                    var child2 = null;

                if (child2) {
                    // console.log(child1.name, child2.name);
                    var traverseForChanges = ctrl.changesOutsideOfTree(child1, child2, skipInTree3, stats);

                    // // empty
                    // if (Object.keys(traverseForChanges.tree).length === 0) {
                    //     //skip
                    // } else {

                    stats = traverseForChanges.stats;

                    // console.log('N out', traverseForChanges.tree.name)

                    if (traverseForChanges.tree.change  && traverseForChanges.tree.change !== "unchanged") {
                        children.push(traverseForChanges.tree);
                    }
                    // }
                } else {
                    // console.log('N out', child1.name)
                    if (child1.change && child1.change !== "unchanged") {
                        children.push(child1);

                        stats.outsideOfTree += ctrl.countTreeRecursive([child1], "unchanged");
                    }
                }
            }

        if (children.length > 0) {
            // stats.outsideOfTree += ctrl.countTreeRecursive(children);
            // stats.outsideOfTree += children.length;
            changesOutside = changes;
            changesOutside.children = children;
        }

        return {tree: changesOutside, stats: stats};

    }


    this.countTreeRecursive = function (children, notEqualChange) {
        var count = 0;
        for (var i in children) {
            var child = children[i];
            if (notEqualChange && child.change && child.change !== notEqualChange) {
                count++;
            }
            if (!notEqualChange) {
                count++;
            }
            if (child.children)
                count += parseInt(ctrl.countTreeRecursive(child.children, notEqualChange));
        }
        return count;
    };


    this.saveChanges = function (project, commit_db, path, diffs, lvl_num, lvl_parents) {



        if (!lvl_num) lvl_num = 1;
        if (!lvl_parents) lvl_parents = [];

        var
            StructChange = db.models.struct_change;

        return new Promise(function (f) {
            if (!diffs) return f();
            var sch = {
                name: diffs.name,
                path: path,
                type: diffs.type,
                change_type: diffs.change,
                in_head: diffs.inTree3?true:false,
                project_id: project.id,
                commit_sha: commit_db.sha,
                commit_project_id: commit_db.project_id
            };
            var lvl = {};
            lvl["tree_path_lvl"+lvl_num] = diffs.name;
            var parent_len = lvl_parents.length-1;
            var lvl_parents_reversed = lvl_parents;
            // lvl_parents_reversed = lvl_parents_reversed.reverse();
            for (var i = lvl_num-1; i > 0; i--) {
                if (parent_len in lvl_parents_reversed) {
                    lvl["tree_path_lvl"+i] = lvl_parents_reversed[parent_len].name;
                }
                parent_len--;
            }
            for (var key in lvl) {
                sch[key] = lvl[key];
            }

            StructChange.create(sch, function (err) {
                if (err) throw err;

                lvl_parents.push(diffs);
                var next_lvl = lvl_num+1;

                var kids = [];
                if (diffs.children)
                    for (var i in diffs.children) {
                        var child = diffs.children[i];
                        kids.push(ctrl.saveChanges(project, commit_db, path, child, next_lvl, lvl_parents));
                    }

                Promise.all(kids).then(function () {
                    f();
                })

            })
        });
    }
}
