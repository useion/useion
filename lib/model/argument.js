module.exports = function (orm, db) {
    var Argument = db.define('argument', {
            value            : { type: 'text', required: true }
        },
        {
            hooks: {

            },
            methods: {

            }
        });

    return Argument;

};