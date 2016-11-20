
module.exports = function (orm, db) {

    var Commit = db.define('commit', {
            sha                     : { type: 'text', key: true, required: true },
            project_id              : { type: 'integer', key: true, required: true },
            message                 : { type: 'text' },
            relevance              : { type: 'integer' },
            status                 : { type: 'text' },

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

    Commit.hasOne('project', db.models.project, { autoFetch : true });


    return Commit;
};
