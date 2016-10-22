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

module.exports = router;
