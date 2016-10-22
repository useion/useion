
var
    Promise     = require('promise'),
    utils       = require('../helpers/utils');

module.exports = function (orm, db) {
    var Project = db.define('project', {
            watch_path                : { type: 'text', required: true }
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


                removeUsecases: function () {

                    var project = this,
                        Usecase             = db.models.usecase,

                        removeUsecase = function (usecase) {
                            return new Promise(function (resolve, reject) {
                                usecase.cascadeRemove(function () {
                                    resolve();
                                });
                            });
                        };

                    return new Promise(function (fullfill, reject) {

                        Usecase.find({project_id: project.id}, function (err, usecases) {

                            var usecases_promises = [];

                            for (var i in usecases) {
                                usecases_promises.push(removeUsecase(usecases[i]));
                            }

                            Promise.all(usecases_promises).then(function () {

                                fullfill();
                            });
                        });
                    })
                },

                generatePlantUMLText: function (done) {

                    var project = this,
                        Usecase = db.models.usecase,
                        Relationship = db.models.relationship,
                        puml = "@startuml\n\n";

                    //puml += "'General styling\n";
                    //puml += "skinparam shadowing false\n";
                    //puml += "skinparam monochrome true\n";
                    //puml += "hide circle\n\n";
                    //
                    //puml += "skinparam noteBackgroundColor White\n";
                    //puml += "skinparam noteBorderColor Black\n\n";
                    //
                    //puml += "'Use case diagram styling\n";
                    //puml += "skinparam usecase {\n";
                    //puml += "    BackgroundColor White\n";
                    //puml += "    ArrowColor Black\n";
                    //puml += "    BorderColor Black\n";
                    //puml += "}\n\n";

                    //puml += "title Co toto je cotooto je?\n\n";

                    Usecase.find({project: project}, function (err, usecases) {

                        var rel_arr = [],
                            getRelationships = function (usecase) {
                                return new Promise(function (resolve, reject) {

                                    Relationship.find({'or': [{'usecase_id': usecase.id}, {'related_usecase_id': usecase.id}]}, function (err, rels) {
                                        if (err) throw err;

                                        resolve(rels);
                                    });

                                });
                            };

                        for (var i in usecases) {
                            var usecase_name = usecases[i].name;
                            for (var j in usecases[i].actor) {
                                var actor = usecases[i].actor[j];

                                puml += utils.camelCase(actor.name) + " -> (" + usecase_name + ")\n";
                            }

                            rel_arr.push(getRelationships(usecases[i]));
                        }

                        if (rel_arr.length !== 0)
                            puml += "\n";

                        Promise.all(rel_arr).then(function (rels) {

                            var rels_all = {};
                            for (var i in rels) {
                                for (var j in rels[i]) {
                                    var rel = rels[i][j];
                                    rels_all[rel.id] = rel;
                                }
                            }

                            for (var i in rels_all) {
                                var rel = rels_all[i];

                                switch (rel.type) {
                                    case "generalization":
                                        puml += "(" + rel.related_usecase.name + ") <|-- (" + rel.usecase.name + ")\n";
                                        break;
                                    case "extend":
                                        puml += "(" + rel.usecase.name + ") .> (" + rel.related_usecase.name + ") : extend\n";
                                        break;
                                    case "include":
                                        puml += "(" + rel.usecase.name + ") .> (" + rel.related_usecase.name + ") : include\n";
                                        break;

                                }
                            }

                            if (Object.keys(rels_all).length !== 0)
                                puml += "\n";

                            puml += "@enduml\n";

                            done(puml);
                        });


                    });
                }
            }

        });

    return Project;
};
