var argv = require('minimist')(process.argv.slice(2), {
      boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help", "version"]
    }),
    path = require('path'),
    watch_path = argv._.length===1 ? path.resolve(argv._[0]) : false,
    fs = require("fs"),
    Logger      = require('./lib/logger'),
    logger      = new Logger(['console']),
    Watcher = require("./lib/watcher"),
    tmpl = require("blueimp-tmpl"),

    model = require('./lib/model')(function (err, db) {

        var fileChange = require("./lib/file_change");

        if (argv.version) {
            var pjson = require('./package.json');
            console.log(pjson.name+" "+pjson.version);
        } else if (!watch_path || argv.help) {
            fs.readFile("docs/readme.md", "utf8", function(err, data) {
                if (err) throw err;
                var supported_languages = fs.readdirSync("lib/parser/parsers/block/drivers", "utf8");
                for (var i in supported_languages) {
                  supported_languages[i] = supported_languages[i].replace(/\.[^/.]+$/, "").toUpperCase();

                  // a bit of cleaning
                  switch (supported_languages[i]) {
                    case "CPP": supported_languages[i] = "C++"; break;
                    case "CS": supported_languages[i] = "C#"; break;
                    case "JAVA": supported_languages[i] = "Java"; break;
                    case "FEATURE": supported_languages[i] = "Gherkin"; break;
                    case "JS": supported_languages[i] = "JavaScript"; break;
                    case "PY": supported_languages[i] = "Python"; break;
                    case "RB": supported_languages[i] = "Ruby"; break;
                  }
                }
                console.log(tmpl(data, {supported_languages: supported_languages.join(", ")}));
                return;
            });
        } else {

            if (fs.existsSync(watch_path) && fs.lstatSync(watch_path).isDirectory()) {

                var Project = db.models.project;

                Project.find({watch_path: watch_path}, function (err, projects) {
                    if (err) throw err;

                    var project;

                    // existing
                    if (projects.length > 0) {
                        project = projects[0];

                    } else {
                        //new

                        project = new Project();

                        project.watch_path = watch_path;
                        project.save(function (err) {
                            if (err) throw err;
                        });
                    }

                    if (argv.S || argv.server) {
                      var Web = require("./lib/web"),
                          web = new Web(db, project);
                      web.start(argv.S || argv.server);
                    }

                    var watcher = new Watcher(project);
                    fileChange.instance = new fileChange.FileChange(project, watcher);

                    if (argv.s || argv.synchronize) {
                        var InitializeController = require("./lib/controller/init"),
                            initCtrl = new InitializeController(db);

                        initCtrl.init(project, function () {
                            watcher.watch();
                            fileChange.getInstance().readStdin();
                        });
                    } else {

                        if (argv.g || argv.git) {
                            var GitController = require("./lib/controller/git"),
                                gitCtrl = new GitController(db);
                            return gitCtrl.run(project);
                        }

                        if (argv.p || argv.puml) {
                            var PUMLController = require("./lib/controller/puml"),
                                pumlCtrl = new PUMLController();

                            pumlCtrl.generate(project);
                            return;
                        }

                        if (argv.c || argv.coverage) {

                            var CoverageController = require("./lib/controller/coverage"),
                                cCtrl = new CoverageController(db);

                            cCtrl.generate(project);
                            return;
                        }

                        watcher.watch();
                        fileChange.getInstance().readStdin();

                    }

                });
            } else {
                console.log("Watch path does not exist");
                return;
            }

        }

    });
