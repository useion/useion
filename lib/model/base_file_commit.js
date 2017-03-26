
module.exports = function (orm, db) {

    var BaseFileCommit = db.define('base_file_commit', {
           path : { type: 'text'},// key: true },
        //    commit_id  : { type: 'integer', key: true },
           struct_change_sum            : { type: 'integer' },

           within_sum                   : { type: 'integer' },
           within_percent     : { type: 'integer' },

           struct_change_in_head_sum    : { type: 'integer' },
           commit_relevance_percent     : { type: 'integer' },

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

    BaseFileCommit.hasOne('commit', db.models.commit,{ autoFetch : true  });// { key: true, autoFetch : true  });


    return BaseFileCommit;
};
