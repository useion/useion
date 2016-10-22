
var regexps = require('../helpers/regexps'),
    Promise = require('promise');

module.exports = function (orm, db) {
    var Relationship = db.define('relationship', {
            type                : { type: 'text', required: true },
            step_no             : { type: 'text' },
            extension_point_name: { type: 'text' },
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

    Relationship.hasOne('usecase', db.models.usecase, {}, { key: true, autoFetch : true });
    Relationship.hasOne('related_usecase', db.models.usecase, {}, { key: true, autoFetch : true });


    Relationship.removeAll = function (usecase, done) {
        Relationship.find({'or': [{'usecase': usecase}, {'related_usecase': usecase}]}).remove(function (err) {
            if (err) throw err;
            done();
        });
    };

    Relationship.recreate = function (project_id, parser_usecase, db_usecase, done) {
        var create = [],
            Step = db.models.step,
            Usecase = db.models.usecase,
            ExtensionPoint = db.models.extension_point;


        var
                findUsecaseBasedOnName = function (name, type, step_no) {
                    return new Promise(function (resolve2, reject) {

                        Usecase.find({name: name, project_id: project_id}, function (err, usecases) {
                            if (err) throw err;

                            if (usecases.length >= 1) {
                                var first_usecase = db_usecase;
                                var second_usecase = usecases[0];


                                create.push({
                                        type:       type,
                                        step_no:    step_no,
                                        usecase_id:    first_usecase.id,
                                        related_usecase_id:    second_usecase.id
                                });
                            }

                            resolve2();

                        });

                    })
                };

        var include = new Promise(function (resolve, reject) {

            var eachStepPromise = [];

            if (parser_usecase && parser_usecase.steps) {
                for (var i in parser_usecase.steps) {
                    var step = parser_usecase.steps[i];
                    if (regexps.include().test(step.name) && step.args.length === 1) {

                        eachStepPromise.push(findUsecaseBasedOnName(step.args[0], 'include', step.no));
                    }
                }
                Promise.all(eachStepPromise).then(function () {
                    resolve();
                });
            } else resolve();
        });


        var include_auto = new Promise(function (resolve, reject) {

            var eachStepPromise = [];

            if (parser_usecase && parser_usecase.steps) {
                for (var i in parser_usecase.steps) {
                    var step = parser_usecase.steps[i];

                    eachStepPromise.push(findUsecaseBasedOnName(step.name, 'include_auto', step.no));

                }
                Promise.all(eachStepPromise).then(function () {
                    resolve();
                });
            } else resolve();
        });


        var extend = new Promise(function (resolve, reject) {

            var eachTriggerPromise = [],
                findExtPointsReachedByTrigger = function (extension_point_name) {
                    return new Promise(function (resolve2, reject) {

                        ExtensionPoint.find({name: extension_point_name, project_id: project_id}, function (err, ext_points) {
                            if (err) throw err;
                            for (var i in ext_points) {
                                var ext_point = ext_points[i],
                                    relationship = {
                                        type:       'extend',
                                        step_no:    ext_point.step_no,
                                        extension_point_name: extension_point_name,
                                        usecase_id:    db_usecase.id,
                                        related_usecase_id:    ext_point.usecase.id
                                    };

                                create.push(relationship);
                            }
                            resolve2();

                        });
                    });
                };

            for (var i in parser_usecase.triggers) {
                var step = parser_usecase.triggers[i];

                if ((new RegExp(regexps.extension_point)).test(step.name) && step.args.length === 1) {
                    var extension_point_name = step.args[0];

                    eachTriggerPromise.push(findExtPointsReachedByTrigger(extension_point_name));

                }

            }
            Promise.all(eachTriggerPromise).then(function () {
                resolve();
            });
        });

        // var extend2 = new Promise(function (resolve, reject) {

        //     var eachExtPointPromise = [],
        //         findTriggersReachingExtPoint = function (ext_point) {
        //             return new Promise(function (resolve2, reject) {

        //                 console.log("%\\\""+ext_point.name+"\\\"%");
        //                 console.log("%"+regexps.extension_point+"%");

        //                 var toFind = {
        //                     step_type_id: 1,
        //                     name: orm.like("%"+ext_point.name+"%"),
        //                     project_id: project_id,
        //                 };

        //                 // select steps: type = trigger , name LIKE "%ext_point.name%" and name LIKE "%regexp.extension_point%" and project_id
        //                 var q = Step.find(toFind, function (err, steps) {

        //                     console.log('!!', steps);

        //                     for (var i in steps) {

        //                     console.log(steps[i].name);
        //                         var relationship = {
        //                             type: 'extend',
        //                             step_no: steps[i].step_no,
        //                             usecase_id: steps[i].usecase_id,
        //                             related_usecase_id: db_usecase.id
        //                         };

        //                         create.push(relationship);
        //                     }
        //                     resolve2();

        //                 });
        //                 console.log(q);
        //             });
        //         };

        //     // for each ext. point
        //     for (var step_no in parser_usecase.extension_points) {
        //         // this will be added to database later, so far relationship can be created without
        //         // to actually have the extension point row in table extension points
        //         var ext_point = parser_usecase.extension_points[step_no];

        //         eachExtPointPromise.push(findTriggersReachingExtPoint(ext_point));
        //     }

        //     Promise.all(eachExtPointPromise).then(function () {
        //         resolve();
        //     });

        // });

        var generalization = new Promise(function (resolve, reject) {
            if (parser_usecase.specializes !== null) {

                Usecase.find({name: parser_usecase.specializes, project_id: project_id}, function (err, usecases) {
                    if (err) throw err;
                    // must exist
                    var usecase = usecases[0];

                    // no uc with that name :(
                    if (usecases.length >= 1) {

                        var relationship = {
                            type: 'generalization',
                            step_no: null,
                            usecase_id: db_usecase.id,
                            related_usecase_id: usecase.id
                        };

                        create.push(relationship);
                    }
                    resolve();
                });

            } else resolve();
        });

        Promise.all([include, include_auto, extend, generalization]).then(function () {
            done(create);
        });

    };

    // this method is intended to create relationships according to parser_usecases
    // @param parser_usecase
    // @param db_usecase - this is as input parameter, because we want to detect relationships that changed
    Relationship.upsert = function (project_id, parser_usecase, db_usecase, is_new, done) {

        var Step = db.models.step,
            Usecase = db.models.usecase,
            ExtensionPoint = db.models.extension_point,
            createRelationship = function (relationship) {
                    return new Promise(function (resolve, reject) {
                        Relationship.create(relationship, function (err, relationship) {
                            if (err) throw err;
                            resolve();
                        })
                    });
                },
            removeRelationship = function (relationship) {
                    return new Promise(function (resolve, reject) {
                        relationship.remove(function () {
                            resolve();
                        });
                    });
                };

        if (is_new) {

            Relationship.recreate(project_id, parser_usecase, db_usecase, function (relationships) {

                // console.log('UC NEW');
                // console.log('-------------- CREATE:');
                // console.log(relationships);
                var createPromises = [];

                for (var i in relationships) {
                    var relationship = relationships[i];
                    createPromises.push(createRelationship(relationship));
                }
                Promise.all(createPromises).then(function () {
                    done();
                });
            })

        } else {
            // check for changes and add/update/remove

            // 1. find all existing relationships in database that are somehow related to db_usecase
            // 2. recreate all relationships with parser_usecase according to include steps, extension points, triggers and uc specializes
            // 3. compare them to create: relationships = {create: [], remove: []}

            // relationships = {update: []} does not make sense, because there is a relationship, or there is not
            // and relationships do not have ID, they are identified by all the fields in the database table
            var relationships = {create: [], remove: []};

            Relationship.find({or: [
                // one direction
                {type: 'include', usecase_id: db_usecase.id},
                {type: 'include_auto', usecase_id: db_usecase.id},
                // both directions
                {type: 'extend', usecase_id: db_usecase.id},
                // {type: 'extend', related_usecase_id: db_usecase.id},
                // one direction
                {type: 'generalization', usecase_id: db_usecase.id},
            ]}, function (err, existing_relationships) {
                if (err) throw err;

                Relationship.recreate(project_id, parser_usecase, db_usecase, function (current_relationships) {

                    var existing, current;
                    for (var i in current_relationships) {
                        current = current_relationships[i];

                        var found = false;
                        for (var j in existing_relationships) {
                            existing = existing_relationships[j];

                            if (existing.type === current.type &&
                                    existing.step_no === current.step_no &&
                                    existing.usecase_id === current.usecase_id &&
                                    existing.related_usecase_id === current.related_usecase_id) {

                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            relationships.create.push(current);
                        }
                    }


                    for (var i in existing_relationships) {
                        existing = existing_relationships[i];

                        var found = false;
                        for (var j in current_relationships) {
                            current = current_relationships[j];

                            if (existing.type === current.type &&
                                    existing.step_no === current.step_no &&
                                    existing.usecase_id === current.usecase_id &&
                                    existing.related_usecase_id === current.related_usecase_id) {

                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            relationships.remove.push(existing);
                        }
                    }
                    // console.log('UC CHANGE');
                    // console.log('-------------- CREATE:');
                    // function printRel(arr) {
                    //     for (var i in arr) {
                    //         console.log('---');
                    //         console.log(arr[i].type);
                    //         console.log(arr[i].step_no);
                    //         console.log(arr[i].usecase_id);
                    //         console.log(arr[i].related_usecase_id);
                    //     }
                    // }
                    // printRel(relationships.create);
                    // console.log('-------------- REMOVE:');
                    // printRel(relationships.remove);

                    var createPromises = [],
                        removePromises = [];

                    for (var i in relationships.create)
                        createPromises.push(createRelationship(relationships.create[i]));
                    for (var i in relationships.remove)
                        removePromises.push(removeRelationship(relationships.remove[i]));

                    Promise.all(createPromises.concat(removePromises)).then(function () {
                        done();
                    });


                });

            });

        }

    };

    return Relationship;
};
