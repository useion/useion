
module.exports = function (orm, db) {

    var UsecaseCommit = db.define('usecase_commit', {
           usecase_id : { type: 'integer', key: true },
        //    commit_id  : { type: 'integer', key: true },
           within     : { type: 'integer' },
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

    UsecaseCommit.hasOne('usecase', db.models.usecase, { key: true, autoFetch : true  });
    UsecaseCommit.hasOne('commit', db.models.commit, { key: true, autoFetch : true  });


    return UsecaseCommit;
};
