/**
 * run as this: mocha index.js
 */

var fs = require('fs'),
    assert = require('assert'),
    expect = require('chai').expect,

    fstools      = require('../lib/helpers/fstools'),
    parser      = require('../lib/parser'),
    parser_dir = "./parser/",
    files = fs.readdirSync(parser_dir);

for (var i in files) {

    var path = parser_dir + files[i];

    if (!fs.statSync(path).isDirectory()){

      var lang = fstools.extractExtension(path).toLowerCase(),
          tree = parser.block.parse(fs.readFileSync(path, 'utf8'), lang).tree,
          expected_path = parser_dir + "expected/" + "test."+lang+".json",
          expected_tree = JSON.parse(fs.readFileSync(expected_path, 'utf8'));

      it("should parse the language "+lang+" as expected", function() {
        delete tree['path'];
        expect(tree).to.deep.equal(expected_tree);
      });
      // fs.writeFileSync(expected_path, JSON.stringify(tree), 'utf8');

    }
}
