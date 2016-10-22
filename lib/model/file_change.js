module.exports = function (orm, db) {
    var FileChange = db.define('file_change', {
            path                : { type: 'text', required: true },
            old_body            : { type: 'text', required: true },
            new_body            : { type: 'text', required: true },
            created_at          : { type: 'date', required: true, time: true }
        },
        {
            hooks: {
                beforeValidation: function () {
                    this.created_at = new Date();
                }
            },
            methods: {

            }
        });

    FileChange.hasOne('project', db.models.project);

    return FileChange;
};
