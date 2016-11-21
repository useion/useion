
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
    logger      = new Logger(["console"]),
    table = require('markdown-table'),
    orm = require("orm"),
    cp = require('child_process'),
    colors = require('colors'),

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
    },

    model = require('../model')(function (err, db) {


        process.on('message', function(obj) {


            if (global.gc)
                global.gc();

            var Git = require("nodegit"),
                GitController = require('./git'),
                ctrl = new GitController(db),
                commit_sha = obj.commit_sha,
                commit_message = obj.commit_message,
                commit_id = obj.commit_id,
                repo_path = obj.repo_path,
                watch_path = obj.watch_path,
                repo = null,
                project = obj.project,

                Usecase = db.models.usecase,
                Commit = db.models.commit,
                StructChange = db.models.struct_change,
                UsecaseCommit = db.models.usecase_commit,
                Fragment = db.models.fragment;


            //skip merge
            if (utils.startsWith(commit_message, "Merge")) {
                logger.log(formatDate(new Date())+ "  Skipping commit  "+ commit_sha.substring(0,7)+"  "+ commit_message);
                process.send("skip");
                process.kill(process.pid);
                return true;
            }

            // debug specific commit
            // if (commit_sha !== "cd652315288420b8ccc337250234d03e56b6a667") {
            //     process.send("skip");
            //     process.kill(process.pid);
            //     return true;
            // }
            // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");



            // debug
            // if (utils.startsWith(commit_message, "https")) {fdo();return;}
            // if (utils.startsWith(commit_message, "Update")) {fdo();return;}

            logger.log(formatDate(new Date()) + "  Processing commit  "+ commit_sha.substring(0,7)+ "  " +  commit_message);

            var usecase_commit_within = {},
                struct_change_sum = 0,
                struct_change_in_head_sum = 0,
                files_sum = 0,
                loc_sum = 0,
                skipped = false;

            Commit.create({ sha: commit_sha, message: commit_message, project_id: project.id, relevance: 0, status: "processing" }, function(err) {

                if (err) throw err;
                Commit.find({ sha: commit_sha, project_id: project.id }, function(err, commits) {
                    if (err) throw err;

                    var commit_db = commits[0];

                    Git.Repository.open(repo_path).then(function (r) {
                        repo = r;


                        repo.getCommit(commit_id).then(function(commit) {

                            commit.getDiff().then(function (diffList) {
                                return Promise.all(diffList.map(function (diff) {
                                    return diff.patches().then(function (patches) {
                                        // if more than 50 files are to be patched, skip
                                        if (patches.length >= 100) {
                                            skipped = patches.length;
                                            return new Promise(function (f) {f()});
                                        } else
                                        return Promise.all(patches.map(function (patch) {

                                            return ctrl.getBlob(repo, commit, patch.newFile().path()).then(function (blob) {

                                                files_sum++;

                                                // deletions, renaming
                                                if (!blob) {
                                                    //console.log('deleted', patch.newFile().path());
                                                    return new Promise(function (f) {f()});
                                                }

                                                var blobBody = String(blob.blob),
                                                patchBody = "";

                                                loc_sum += blobBody.split("\n").length;


                                                return new Promise(function (f) {



                                                    var lang = fstools.extractExtension(patch.newFile().path()).toLowerCase();
                                                    var newestBlobPath = path.resolve(path.join(repo_path, patch.newFile().path()));

                                                    var newestBlobBody = "",
                                                        inHead = false;
                                                    if (fs.existsSync(newestBlobPath)) {
                                                        newestBlobBody = fs.readFileSync(newestBlobPath, "utf-8");
                                                        inHead = true;
                                                    }


                                                    var revBlobBody =
                                                        ctrl.getRevBody(repo_path, commit.id().toString()+"~1:"+patch.newFile().path());


                                                    var blobBlock = parser.block.parse(blobBody, lang, newestBlobPath),
                                                        revBlobBlock = parser.block.parse(revBlobBody, lang, newestBlobPath),
                                                        newestBlobBlock = parser.block.parse(newestBlobBody, lang, newestBlobPath);


                                                    if (blobBlock.error || revBlobBlock.error || newestBlobBlock.error) {
                                                        logger.log(colors.red("Cannot parse "+newestBlobPath));
                                                        return f();
                                                    }

                                                    var diffs = ctrl.diffBlocks(revBlobBlock.tree, blobBlock.tree, inHead?newestBlobBlock.tree:null, null, 3,  inHead?newestBlobBlock.tree:null);


                                                    ctrl.printBlockChanges(diffs.tree);
                                                    logger.log("");

                                                    struct_change_sum += parseInt(diffs.stats.changesSum);
                                                    struct_change_in_head_sum += parseInt(diffs.stats.inTree3.changesSum);


                                                    ctrl.saveChanges(project, commit_db, newestBlobPath, diffs.tree)
                                                    .then(function () {


                                                        var p = newestBlobPath.replace(new RegExp("^"+watch_path+"\/?"), "");

                                                        return Fragment.find({ project_id: project.id//, path: p
                                                        }, function (err, fragments) {
                                                            if (err) throw err;

                                                            if (fragments.length === 0) {

                                                            } else {

                                                                for (var i in fragments) {
                                                                    var fragment = fragments[i];



                                                                    if (diffs.tree.children && diffs.tree.children.length > 0 && diffs.stats.changesSum !== 0) {

                                                                        if (p !== fragment.path) {


                                                                            if (!(fragment.usecase_id in usecase_commit_within)) {
                                                                                usecase_commit_within[fragment.usecase_id] = {}
                                                                            }
                                                                            if (!(newestBlobPath in usecase_commit_within[fragment.usecase_id])){

                                                                                usecase_commit_within[fragment.usecase_id][newestBlobPath] = {
                                                                                    changes:        diffs.stats.changesSum,
                                                                                    unchanged:      diffs.stats.unchanged,

                                                                                    outside:        diffs.stats.changesSum-1,
                                                                                    percent_within: 0,
                                                                                    within:         false
                                                                                };
                                                                            }

                                                                            continue;
                                                                        }
                                                                        var fragmentBlock = parser.block.parse(fragment.body, fragment.lang, newestBlobPath);

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
                                                                            usecase_commit_within[fragment.usecase_id][newestBlobPath].outside_tree = c.tree;
                                                                        }

                                                                        fragmentBlock = null;
                                                                        tree = null;


                                                                        // if (c.are) {
                                                                        //     console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!', newestBlobPath);
                                                                        // }
                                                                    }
                                                                }

                                                            }

                                                            revBlobBody = null;
                                                            blobBlock = null;
                                                            revBlobBlock = null;
                                                            newestBlobBlock = null;


                                                            if (global.gc)
                                                                global.gc();


                                                            f(true);

                                                        })})


                                                    })
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


                                    commit_db.save(function (err) {

                                        function getUcLoC(usecase_id, cb) {
                                            Usecase.get(usecase_id, function (err, usecase) {
                                                cb(fs.readFileSync(usecase.path, "utf-8").split("\n").length);
                                            });
                                        }


                                        function saveWithin(uc, commit_db, within_percent, within_sum) {
                                            return new Promise(function (f) {
                                                getUcLoC(uc, function (uc_loc_sum) {

                                                    var rel = 100*struct_change_in_head_sum/struct_change_sum;
                                                    if (!rel) rel = 0;

                                                    commit_db.relevance = rel;
                                                    commit_db.save(function (err) {
                                                        if (err) throw err;

                                                        UsecaseCommit.create({
                                                            usecase_id: uc,
                                                            commit_sha: commit_db.sha,
                                                            commit_project_id: commit_db.project_id,

                                                            within_percent: within_percent,
                                                            commit_relevance_percent: rel,

                                                            within_sum: within_sum,
                                                            struct_change_sum: struct_change_sum,
                                                            struct_change_in_head_sum: struct_change_in_head_sum,

                                                            files_sum: files_sum,
                                                            loc_sum: loc_sum,
                                                            uc_loc_sum: uc_loc_sum,

                                                        }, function (err) {
                                                            if (err) throw err;
                                                            f();
                                                        })

                                                    })

                                                })

                                            });
                                        }

                                        var withins = [new Promise(function (f) {f()})];

                                        if (Object.keys(usecase_commit_within).length > 0)
                                            for (var uc in usecase_commit_within) {
                                                var upi = usecase_commit_within[uc];

                                                var changeSum = 0,
                                                outsideSum = 0;

                                                for (var filepath in upi) {
                                                    // console.log(filepath, upi[filepath])
                                                    changeSum += parseInt(upi[filepath].changes)-1; //ommit the file, which is matched implicitly
                                                    outsideSum += parseInt(upi[filepath].outside);

                                                    // console.log(filepath, parseInt(upi[filepath].changes)-1, upi[filepath].outside)

                                                }

                                                // if (changeSum !== outsideSum) {
                                                //     console.log(commit.sha(), changeSum, outsideSum)
                                                // }

                                                var withinSum = changeSum-outsideSum;
                                                var withinPercent = (((100*withinSum)/(changeSum)));
                                                if (changeSum  === 0) {withinPercent = 0};
                                                withins.push(saveWithin(uc, commit_db, withinPercent, withinSum))

                                            }

                                        Promise.all(withins).then(function () {
                                            // console.log('a');
                                            // fdo();

                                            if (skipped) {
                                                commit_db.status = "skipped - "+skipped+" patches";
                                            } else {
                                                commit_db.status = "processed";
                                            }
                                            commit_db.save(function (err) {

                                                // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

                                                logger.log(formatDate(new Date())+'  Finished processing of commit '+ commit.sha().substring(0, 7)+'')

                                                commit.free();
                                                repo.free();
                                                process.send("done");

                                                process.kill(process.pid);
                                            });
                                        })

                                    })
                                })
                            })
                        })

                    })
                })


            })


    });;
