
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
    logger      = new Logger([]),

    jsdiff = require('diff');

module.exports = function (db) {

    var ctrl = this;

    this.run = function (project, fin) {

        var Git = require("nodegit"),
            Commit = db.models.commit,
            StructChange = db.models.struct_change,
            UsecaseCommit = db.models.usecase_commit,
            Fragment = db.models.fragment,
            repo,
            repo_path =  argv.g?argv.g:argv.git,
            visitedCommits = {};

        function process(commit) {
            return new Promise(function (fdo, rdo) {

                // skip merge
                if (utils.startsWith(commit.message(), "Merge")) {fdo();return;}

                if (utils.startsWith(commit.message(), "https")) {fdo();return;}

                if (utils.startsWith(commit.message(), "Update")) {fdo();return;}

                console.log("process ",  commit.message());

                var usecase_commit_within = {},
                    struct_change_sum = 0,
                    struct_change_in_head_sum = 0;
                Commit.create({ sha: commit.sha(), message: commit.message(), project_id: project.id }, function(err) {

                    if (err) throw err;
                    Commit.find({ sha: commit.sha(), project_id: project.id }, function(err, commits) {
                        if (err) throw err;

                        var commit_db = commits[0];


                        commit.getDiff().then(function (diffList) {
                            return Promise.all(diffList.map(function (diff) {
                                return diff.patches().then(function (patches) {
                                    return Promise.all(patches.map(function (patch) {

                                        return ctrl.getBlob(repo, commit, patch.newFile().path()).then(function (blob) {

                                            // deletions, renaming
                                            if (!blob) {
                                                //console.log('deleted', patch.newFile().path());
                                                return true;
                                            }

                                            var blobBody = String(blob.blob),
                                                patchBody = "";



                                            return patch.hunks().then(function (hunks) {
                                                return Promise.all(hunks.map(function (hunk) {
                                                    return hunk.lines().then(function (lines) {

                                                        patchBody += hunk.header();
                                                        lines.forEach(function(line) {
                                                            patchBody += String.fromCharCode(line.origin()) + line.content();
                                                        });

                                                        return true;
                                                    });
                                                }))
                                            }).then(function () {

                                                return new Promise(function (f) {



                                                    var lang = fstools.extractExtension(patch.newFile().path()).toLowerCase(),
                                                        revBlobBody = ctrl.reversePatch(blobBody, patchBody, patch.newFile().path()),
                                                        newestBlobPath = path.resolve(path.join(repo_path, patch.newFile().path())),
                                                        newestBlobBody = fs.readFileSync(newestBlobPath, "utf-8"),

                                                        blobBlock = parser.block.parse(blobBody, lang, newestBlobPath),
                                                        revBlobBlock = parser.block.parse(revBlobBody, lang, newestBlobPath),
                                                        newestBlobBlock = parser.block.parse(newestBlobBody, lang, newestBlobPath);

                                                    var diffs = ctrl.diffBlocks(revBlobBlock.tree, blobBlock.tree, newestBlobBlock.tree, null, 3, newestBlobBlock.tree);

                                                    struct_change_sum += parseInt(diffs.stats.changesSum);
                                                    struct_change_in_head_sum += parseInt(diffs.stats.inTree3.changesSum);

                                                    ctrl.saveChanges(project, commit_db, newestBlobPath, diffs.tree)
                                                        .then(function () {


                                                    Fragment.find({ project: project//, path: newestBlobPath
                                                        }, function (err, fragments) {

                                                        if (fragments.length === 0) {

                                                        }

                                                        for (var i in fragments) {
                                                            var fragment = fragments[i];

                                                            var fragmentBlock = parser.block.parse(fragment.body, fragment.lang, newestBlobPath);



                                                            if (diffs.tree.children && diffs.tree.children.length > 0 && diffs.stats.changesSum !== 0) {

                                                                var tree = fragmentBlock.tree,
                                                                    c = ctrl.changesWithinTree(diffs.tree, tree);
                                                                    //allChangesSum = ctrl.countTreeRecursive([diffs.tree]); // also with unchanged

                                                                // console.log(diffs.stats.changesSum+"/"+(diffs.stats.changesSum+diffs.stats.unchanged), c.stats.outsideOfTree+"/"+allChangesSum);

                                                                var percent_within = 100-((100*c.stats.outsideOfTree)/(diffs.stats.changesSum-1)); // -1 means 1 is the file, which is matched implicitly


                                                                if (!(fragment.usecase_id in usecase_commit_within)) {
                                                                    usecase_commit_within[fragment.usecase_id] = {}
                                                                }
                                                                if (!(newestBlobPath in usecase_commit_within[fragment.usecase_id])){

                                                                    usecase_commit_within[fragment.usecase_id][newestBlobPath] = {
                                                                        changes:        diffs.stats.changesSum,
                                                                        unchanged:      diffs.stats.unchanged,

                                                                        outside:        c.stats.outsideOfTree,
                                                                        percent_within: percent_within,
                                                                        within:         c.are
                                                                    };
                                                                }

                                                                if (usecase_commit_within[fragment.usecase_id][newestBlobPath].percent_within < percent_within) {
                                                                    usecase_commit_within[fragment.usecase_id][newestBlobPath].percent_within = percent_within;
                                                                    usecase_commit_within[fragment.usecase_id][newestBlobPath].outside = c.stats.outsideOfTree;
                                                                    usecase_commit_within[fragment.usecase_id][newestBlobPath].are = c.are;
                                                                }


                                                                // if (c.are) {
                                                                //     console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!', newestBlobPath);
                                                                // }
                                                            }
                                                        }

                                                        f(true);

                                                    })})


                                                })
                                            });
                                        });


                                    }));
                                })
                            }));

                        })
                        .then(function () {

                            /*
                             * done - 1. ziskat bloby zmenenych suborov ku commitu patch.newFile().path()
                             * done - 2. reversnut zmeny
                             * done - 3. parsnut nove subory a reversnute subory
                             * done - 4. spravit diff na urovni tried a metod..., vysledkom coho budu zmeny v strome
                             *    -  nove pridane (tried a metod) oproti najnovsej objektovej verzii - skip (asi stare)
                             * done - 5. spravit funkciu, su tieto zmeny v inom strome?
                             * done - 6. podla path parsnut fragment a hladat ci su tie zmeny v UC
                             */

                            // format:
                            // UC: changes for parrticular file: structural changes count

                            commit_db.struct_change_sum = struct_change_sum;
                            commit_db.struct_change_in_head_sum = struct_change_in_head_sum;

                            commit_db.save(function () {

                                function saveWithin(uc, commit_db, within) {
                                    return new Promise(function (f) {
                                        UsecaseCommit.create({
                                            usecase_id: uc,
                                            commit_sha: commit_db.sha,
                                            commit_project_id: commit_db.project_id,
                                            within: within
                                        }, function (err) {
                                            if (err) throw err;
                                            f();
                                        })

                                    });
                                }

                                var withins = [];

                                for (var uc in usecase_commit_within) {
                                    var upi = usecase_commit_within[uc];

                                    var changeSum = 0,
                                        outsideSum = 0;

                                    for (var filepath in upi) {
                                        changeSum += parseInt(upi[filepath].changes)-1; //ommit the file, which is matched implicitly
                                        outsideSum += parseInt(upi[filepath].outside);
                                    }

                                    withins.push(saveWithin(uc, commit_db, (100-((100*outsideSum)/(changeSum)))))

                                }
                                // console.log(usecase_percent_in);
                                fdo();

                            })
                        })

                    })
                })


            })
        }

        function iterate(commit, parentId, limit) {

            if (commit.sha() in visitedCommits) return true;
            if (limit && Object.keys(visitedCommits).length >= limit) return true;

            visitedCommits[commit.sha()] = null;


            return process(commit).then(function() {

                if(commit.parentcount() === 0) {
                    commit.free();
                    // done
                    return true;
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
                        commit.free();

                        // walking of parent tree finished
                        if (!nextid)
                            return true;
                        else
                            return repo.getCommit(nextid).then(function (commit) {
                                return iterate(commit, parentId, limit);
                            })
                    })
                }
            });
        }

        return ctrl.removeStats(project).then(function () {
            Git.Repository.open(repo_path)
                .then(function (re) {
                    repo = re;
                    return repo.getHeadCommit();
                  })
                  .then(function (commit) {
                    return iterate(commit, 0, 6);
                  })
                  .done(function () {
                      console.log("Done! "+Object.keys(visitedCommits).length+" commits");
                  })
              })



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
                    StructChange.find({ project_id: project.id }).remove(function (err) {
                        if (err) throw err;
                        f();
                    });
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

    this.reversePatch = function (blobBody, patchBody, path) {

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
            // console.log("ERR", path, String(error.stdout));
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

            if ((child1.name && child2f.name && child1.name === child2f.name) ||
                (!child1.name && !child2f.name && utils.similarText(child1.body, child2f.body, true) >= ctrl.consider_the_same_if_similarity_is_higher_than))  {

                // found

            } else {
                if (changes.change && changes.change !== "unchanged") {
                    changesOutside = changes;
                    stats.outsideOfTree += 1;
                }
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
            if (!diffs) f();
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
