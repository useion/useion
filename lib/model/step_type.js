module.exports = function (orm, db) {
    var StepType = db.define('step_type', {
            name            : { type: 'text', required: true }
        },
        {
            hooks: {

            },
            methods: {

            }
        });

    return StepType;
};