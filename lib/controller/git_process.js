
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

                Commit = db.models.commit,
                StructChange = db.models.struct_change,
                UsecaseCommit = db.models.usecase_commit,
                Fragment = db.models.fragment;


            //skip merge
            if (utils.startsWith(commit_message, "Merge")) {
                // logger.log(formatDate(new Date())+ "  Skipping commit  "+ commit_message);
                process.send("skip");
                process.kill(process.pid);
                return true;
            }



            // debug
            // if (utils.startsWith(commit_message, "https")) {fdo();return;}
            // if (utils.startsWith(commit_message, "Update")) {fdo();return;}

            logger.log(formatDate(new Date()) + "  Processing commit  "+ commit_sha.substring(0,7)+ "  " +  commit_message);

            var usecase_commit_within = {},
            struct_change_sum = 0,
            struct_change_in_head_sum = 0,
            files_sum = 0;

            Commit.create({ sha: commit_sha, message: commit_message, project_id: project.id }, function(err) {

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



                                                // return
                                                // patch.hunks().then(function (hunks) {
                                                //     return Promise.all(hunks.map(function (hunk) {
                                                //         return hunk.lines().then(function (lines) {
                                                //
                                                //             // if(/ @@[^\n]/.test(hunk.header())) {
                                                //             //     var head = hunk.header().replace(/ @@(.|\n)*/, " @@\n");
                                                //             //     patchBody += head;
                                                //             // } else {
                                                //                 patchBody += hunk.header();
                                                //             // }
                                                //             lines.forEach(function(line) {
                                                //                 patchBody += String.fromCharCode(line.origin()) + line.content();
                                                //             });
                                                //
                                                //             return true;
                                                //         });
                                                //     }))
                                                // }).then(function () {

                                                    // if (/\\ No newline at end of file\n$/.test(patchBody)) {
                                                    //     patchBody = patchBody.replace(/[<>=]\n\\ No newline at end of file\n$/g, "");
                                                    // }
                                                    // if (/\\ No newline at end of file\n/.test(patchBody)) {
                                                    //     patchBody = patchBody.replace(/[<>=]\n\\ No newline at end of file\n/g, "\n");
                                                    // }
                                                    //
                                                    // patchBody = patchBody.replace(/\n/g, "\r");

                                                    // if(patchBody.substr(patchBody.length - 1) !== "\n") {
                                                    //     patchBody += "\n";
                                                    // }

                                                    return new Promise(function (f) {


                                                        var lang = fstools.extractExtension(patch.newFile().path()).toLowerCase(),
                                                        // revBlobBody = ctrl.reversePatch(blobBody, patchBody, patch.newFile().path()),
                                                        revBlobBody = ctrl.getRevBody(repo_path, commit.id().toString()+"~1:"+patch.newFile().path()),
                                                        newestBlobPath = path.resolve(path.join(repo_path, patch.newFile().path())),
                                                        newestBlobBody = fs.readFileSync(newestBlobPath, "utf-8"),

                                                        blobBlock = parser.block.parse(blobBody, lang, newestBlobPath),
                                                        revBlobBlock = parser.block.parse(revBlobBody, lang, newestBlobPath),
                                                        newestBlobBlock = parser.block.parse(newestBlobBody, lang, newestBlobPath);

                                                        if (blobBlock.error || revBlobBlock.error || newestBlobBlock.error) {
                                                            logger.log("Cannot parse "+newestBlobPath);
                                                            return f();
                                                        }
                                                        var diffs = ctrl.diffBlocks(revBlobBlock.tree, blobBlock.tree, newestBlobBlock.tree, null, 3, newestBlobBlock.tree);


                                                        struct_change_sum += parseInt(diffs.stats.changesSum);
                                                        struct_change_in_head_sum += parseInt(diffs.stats.inTree3.changesSum);


                                                        ctrl.saveChanges(project, commit_db, newestBlobPath, diffs.tree)
                                                        .then(function () {


                                                            var p = newestBlobPath.replace(new RegExp("^"+watch_path+"\/?"), "");

                                                            return Fragment.find({ project_id: project.id, path: p
                                                            }, function (err, fragments) {
                                                                if (err) throw err;


                                                                if (fragments.length === 0) {

                                                                    f(true);
                                                                } else {

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
                                                                                    outside_tree:          c.tree,

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


                                                                            // if (c.are) {
                                                                            //     console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!', newestBlobPath);
                                                                            // }
                                                                        }
                                                                    }

                                                                    f(true);
                                                                }

                                                            })})


                                                        })
                                                    });
                                                // })f;


                                            }));
                                        })
                                    }));

                                })
                                .then(function () {
                                    console.log('f', commit.sha())

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


                                        function saveWithin(uc, commit_db, within_percent, within_sum) {
                                            return new Promise(function (f) {
                                                UsecaseCommit.create({
                                                    usecase_id: uc,
                                                    commit_sha: commit_db.sha,
                                                    commit_project_id: commit_db.project_id,

                                                    within_percent: within_percent,
                                                    commit_relevance_percent: 100*struct_change_in_head_sum/struct_change_sum,

                                                    within_sum: within_sum,
                                                    struct_change_sum: struct_change_sum,
                                                    struct_change_in_head_sum: struct_change_in_head_sum,

                                                    files_sum: files_sum,

                                                }, function (err) {
                                                    if (err) throw err;
                                                    f();
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
                                                changeSum += parseInt(upi[filepath].changes)-1; //ommit the file, which is matched implicitly
                                                outsideSum += parseInt(upi[filepath].outside);

                                                // console.log(filepath, parseInt(upi[filepath].changes)-1, upi[filepath].outside)

                                            }

                                            // if (changeSum !== outsideSum) {
                                            //     console.log(commit.sha(), changeSum, outsideSum)
                                            // }

                                            withins.push(saveWithin(uc, commit_db, (100-((100*outsideSum)/(changeSum))), changeSum-outsideSum))

                                        }

                                        Promise.all(withins).then(function () {
                                            // console.log('a');
                                            // fdo();
                                            commit.free();
                                            repo.free();
                                            process.send("done");

                                            process.kill(process.pid);
                                        })

                                    })
                                })
                            })
                        })

                    })
                })


            })


    });;
