
module.exports = function (orm, db) {

    var StructChange = db.define('struct_change', {

            path                : { type: 'text', required: true },

            tree_path_lvl_id                : { type: 'text' },
            tree_path_lvl1                : { type: 'text' },
            tree_path_lvl2                : { type: 'text' },
            tree_path_lvl3                : { type: 'text' },
            name                : { type: 'text' },

            body                : { type: 'text' },
            loc_without_children                : { type: 'integer' },

            type                : { type: 'text' },
            change_type         : { type: 'text' },
            in_head             : { type: 'boolean' },

            created_at          : { type: 'date', required: true, time: true }
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

    StructChange.hasOne('project', db.models.project, { autoFetch : true });
    StructChange.hasOne('commit', db.models.commit,   { autoFetch : true, type: 'text' });


    return StructChange;
};
