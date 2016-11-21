
module.exports = function (orm, db) {

    var CommitGroup = db.define('commit_group', {
            id                         : {type: 'text', key: true},
            commit_count                : { type: 'integer' },
            loc                         : { type: 'integer' },
            commit_shas_sorted          : { type: 'text' },

            created_at      : { type: 'date', required: true, time: true }
        },
        {
            //autoFetch : true,
            //cache : false,

            hooks: {

                beforeValidation: function () {
                    this.created_at = new Date();
                },

            },
            methods: {


            }
        });

    // CommitGroup.hasMany('commit', db.models.commit, {
    //     // commit_group_id: {type: 'id', key: true},
    //     // commit_sha: {type: 'text', key: true},
    //     // commit_project_id: {type: 'text'}
    // }, { cascadeRemove: false, key: true });


    return CommitGroup;
};
