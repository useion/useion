
var Logger      = require('../logger'),
    logger      = new Logger(['console']),
    parser      = require('../parser'),
    utils       = require('../helpers/utils'),
    fs = require("fs"),
    fstools     = require('../helpers/fstools'),
    Promise     = require('promise'),
    argv        = require('minimist')(process.argv.slice(2)),
    path = require('path');

module.exports = function () {

    this.generate = function (project) {

        project.generatePlantUMLText(function (pumlText) {
            console.log(pumlText);
        });

    };

};
