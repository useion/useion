
var orm      = require('orm'),
    transaction = require('orm-transaction'),

    connection = null,
    setup  = function (db, cb) {


        require('./argument.js')(orm, db);
        require('./step_type.js')(orm, db);
        var Step = require('./step.js')(orm, db);
        require('./actor.js')(orm, db);

        var Project = require('./project.js')(orm, db);
        require('./file_change.js')(orm, db);
        var UseCase = require('./usecase.js')(orm, db);
        var Fragment = require('./fragment.js')(orm, db);


        UseCase.hasMany('step', db.models.step, {}, { cascadeRemove: true, key: true, autoFetch: true });

        Step.hasOne('usecase', UseCase, {}, { key: true, autoFetch : true });
        Step.hasOne('project', Project, {}, { key: true, autoFetch : true });

        // relationships
        require('./relationship.js')(orm, db);
        var ExtensionPoint = require('./extension_point.js')(orm, db);
        UseCase.hasMany('extension_point', db.models.extension_point, {}, { cascadeRemove: true, key: true });

        //var UsecaseFragment = db.define('usecase_fragment', {
        //        usecase_id : { type: 'integer', key: true },
        //        fragment_id  : { type: 'integer', key: true }
        //    },
        //    {
        //        hooks: {
        //        },
        //        methods: {
        //        }
        //    });
        //UsecaseFragment.hasOne('usecase', UseCase, {}, { key: true, autoFetch : true });
        //UsecaseFragment.hasOne('fragment', Fragment, {}, { key: true, autoFetch : true });

        UseCase.hasMany('fragment', Fragment, {
            //id:      {type: 'serial', key: true}
        }, { cascadeRemove: true, key: true, autoFetch : true });

        var Commit = require('./commit.js')(orm, db);
        var CommitGroup = require('./commit_group.js')(orm, db);
        var CommitGroupCommit = require('./commit_group_commit.js')(orm, db);
        var StructChange = require('./struct_change.js')(orm, db);
        var UsecaseCommit = require('./usecase_commit.js')(orm, db);

        return cb(null, db);
    };

module.exports = function (cb) {

    if (connection)
        return cb(null, connection);

    orm.connect({
        protocol : "sqlite",
        pathname : 'db.sqlite3',
        query:    {pool: true
            // , debug: true
        }
    }, function (err, db) {
        if (err) return cb(err);

        db.use(transaction);

        connection = db;

        db.settings.set('instance.cache', false);
        db.settings.set('instance.returnAllErrors', true);

        setup(db, cb);

        //sqlite Busy timeout set to 30000 milliseconds
        db.driver.execQuery("pragma busy_timeout=30000;", function (err, data) {
            if (err) throw err;
        });

    });

};
