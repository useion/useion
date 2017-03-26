
module.exports = function (orm, db) {

    var UsecaseCommit = db.define('usecase_commit', {
           usecase_id : { type: 'integer'},//, key: true },
        //    commit_id  : { type: 'integer', key: true },
           struct_change_sum            : { type: 'integer' },

           within_sum                   : { type: 'integer' },
           within_percent     : { type: 'integer' },
           same_files_fragments_count: {type: 'integer'},

           struct_change_in_head_sum    : { type: 'integer' },
           commit_relevance_percent     : { type: 'integer' },

           files_sum                    : { type: 'integer' },
           loc_sum                    : { type: 'integer' },
           uc_loc_sum                    : { type: 'integer' },

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

    UsecaseCommit.hasOne('usecase', db.models.usecase,{ autoFetch : true  });// { key: true, autoFetch : true  });
    UsecaseCommit.hasOne('commit', db.models.commit,{ autoFetch : true  }); //{ key: true, autoFetch : true  });


    return UsecaseCommit;
};
