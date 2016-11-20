
module.exports = function (orm, db) {

    var CommitGroupCommit = db.define('commit_group_commit', {

            // commit_group_id: {type: 'id', key: true},
            // commit_sha: {type: 'text', key: true},
            // commit_project_id: {type: 'text', key: true}

        },
        {
            //autoFetch : true,
            //cache : false,

            hooks: {

                beforeValidation: function () {

                },

            },
            methods: {


            }
        });

    CommitGroupCommit.hasOne('commit_group', db.models.commit_group, { key: true, autoFetch : true  });
    CommitGroupCommit.hasOne('commit', db.models.commit, { key: true, autoFetch : true  });


    return CommitGroupCommit;
};
