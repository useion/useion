module.exports = function (orm, db) {
    var Step = db.define('step', {

            no              : { type: 'text' },
            name            : { type: 'text' },
            section         : { type: 'text' },
            orig_name       : { type: 'text' },
            played_by       : { type: 'text' },
            inherited       : { type: 'boolean', defaultValue: false },
            created_at      : { type: 'date', required: true, time: true }
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

    Step.hasOne('step_type', db.models.step_type, { autoFetch : true });
    Step.hasMany('argument', db.models.argument, {}, { cascadeRemove: true, key: true, autoFetch : true });

    return Step;
};
