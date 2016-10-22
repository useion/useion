module.exports = function (orm, db) {
    var ExtensionPoint = db.define('extension_point', {
            name                : { type: 'text', required: true },
            step_no             : { type: 'text' },
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

    ExtensionPoint.hasOne('usecase', db.models.usecase, {}, { key: true, autoFetch : true });
    ExtensionPoint.hasOne('project', db.models.project, {}, { key: true, autoFetch : true });

    return ExtensionPoint;
};