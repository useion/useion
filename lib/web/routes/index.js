var express = require('express');
var bodyParser     =        require("body-parser");
var router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
var fs = require('fs');
var path = require('path'),
  Promise = require('promise'),
  utils = require('../../helpers/utils');

router.get('/', function(req, res, next) {

  var project_id = req.project.id,
      Usecase = req.db.models.usecase;

  Usecase.find({project_id: project_id}, function (err, usecases) {
    res.render('index', { usecases: usecases });
  });
});

router.get('/td.html', function (req, res, next) {

	res.render('3d', {project_id: req.project.id})


});

router.get('/:useCaseId.html', function(req, res, next) {

  var use_case_id = req.params.useCaseId,
      Usecase = req.db.models.usecase;

  Usecase.get(use_case_id, function (err, usecase) {
    usecase.getCoverage().then(function (o) {
      var usecase_parser = JSON.parse(usecase.parser);
      o["code_section"] = utils.extractLinesRange(usecase.body, parseInt(usecase_parser.sections_start_line["code"])+1, usecase_parser.sections_end_line["code"]);
      o["tests_section"] = utils.extractLinesRange(usecase.body, parseInt(usecase_parser.sections_start_line["tests"])+1, usecase_parser.sections_end_line["tests"]);
      res.render('detail', o);
    });
  });
});


function compare(a,b) {
  if (a.no < b.no)
    return -1;
  if (a.no > b.no)
    return 1;
  return 0;
}

var UsecasePresenter = function (usecase) {

  // step types - trigger, step, condition, precondition, postcondition
  var triggers = [], steps = [], precondition = [], postcondition = [];
  for (var i in usecase.scenario.steps) {
    var step = usecase.scenario.steps[i];
    switch (step.step_type.name) {
      case 'trigger':
        triggers.push({no:step.no,orig_name:step.orig_name});
        break;
      case 'step':
        steps.push({no:step.no,orig_name:step.orig_name});
        break;
      case 'condition':
        steps.push({no:step.no,orig_name:step.orig_name});
        break;
      case 'precondition':
        precondition.push({no:step.no,orig_name:step.orig_name});
        break;
      case 'postcondition':
        postcondition.push({no:step.no,orig_name:step.orig_name});
        break;
    }
  }
  triggers.sort(compare);
  steps.sort(compare);
  precondition.sort(compare);
  postcondition.sort(compare);

  usecase.scenario.triggers = triggers;
  usecase.scenario.steps = steps;
  usecase.scenario.precondition = precondition;
  usecase.scenario.postcondition = postcondition;

  return {
  		id: usecase.id,
		name: usecase.name,
		scenario: {
			triggers: triggers,
			steps: steps,
			precondition: precondition,
			postcondition: postcondition
		}
  };

};

var RelationshipPresenter = function (r) {
	return {
		usecase_id: r.usecase_id,
		related_usecase_id: r.related_usecase_id,
		step_no: r.step_no,
		type: r.type,
		id: r.id

	};
}

router.post('/api/usecase/get_3d', function(req, res) {
  var usecases_selected = req.body.usecases_selected,
      project_id = req.body.project_id,
      Usecase = req.db.models.usecase,
      Relationship = req.db.models.relationship;

	if (!(usecases_selected)) usecases_selected = ['all']; 

  var find_query_rel;
  if (usecases_selected[0] == 'all') {
      find_query_rel = {};
  } else {
      find_query_rel = {or: [{usecase_id: usecases_selected}, {related_usecase_id: usecases_selected}]};
  }


  Relationship.find(find_query_rel, function (err, relationships) {
    if (err) throw err;

    for (var i in relationships) {
      usecases_selected.push(relationships[i].usecase_id);
      usecases_selected.push(relationships[i].related_usecase_id)
    }

    var find_query;
    if (usecases_selected[0] == 'all') {
      find_query = {project_id: parseInt(project_id)};
    } else {
      find_query = {id: usecases_selected};
    }

    Usecase.find(find_query, function (err, usecases) {
      if (err) throw err;


      var scenarios = [];

      for (var i in usecases) {
        function get_scenario(i) {
          return new Promise(function (fulfill, reject) {
            usecases[i].getStep(function(err, steps) {
                if (err) throw err;
				usecases[i].scenario = {};
                usecases[i].scenario.steps = steps;

                fulfill();
              });

            });
          
        }
        scenarios.push(get_scenario(i));
      }

      Promise.all(scenarios).then(function () {
        for (var i in usecases) {
          usecases[i] = UsecasePresenter(usecases[i]);
        }
 		for (var i in relationships) {
          relationships[i] = RelationshipPresenter(relationships[i]);
        }

        res.send({usecases: usecases, relationships: relationships});
      });
    });

  })

});



module.exports = router;
