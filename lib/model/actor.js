module.exports = function (orm, db) {
    var Actor = db.define('actor', {
            name                : { type: 'text', required: true },
            description         : { type: 'text' },
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

    return Actor;
};