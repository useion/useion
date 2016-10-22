var models = require('../lib/model');

models(function (err, db) {
    if (err) throw err;

    db.drop(function (err) {
        if (err) throw err;

        db.sync(function (err) {
            if (err) throw err;


            /*
             * 1 = trigger
             * 2 = step
             * 3 = condition
             * 4 = precondition
             * 5 = postcondition
             */
            db.models.step_type.create({ id: 1, name: "trigger" }, function (err, message) { if (err) throw err; });
            db.models.step_type.create({ id: 2, name: "step" }, function (err, message) { if (err) throw err; });
            db.models.step_type.create({ id: 3, name: "condition" }, function (err, message) { if (err) throw err; });
            db.models.step_type.create({ id: 4, name: "precondition" }, function (err, message) { if (err) throw err; });
            db.models.step_type.create({ id: 5, name: "postcondition" }, function (err, message) { if (err) throw err; });
            db.close();
            console.log("Done!");

        });
    });
});