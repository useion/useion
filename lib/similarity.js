var utils       = require('./helpers/utils'),
    fs          = require("fs"),
    path        = require('path'),
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    word_ignore_list_path_l   = (argv.ignore ? path.resolve(argv.ignore) : null),
    word_ignore_list_path   = (word_ignore_list_path_l === null && argv.i) ? path.resolve(argv.i) : word_ignore_list_path_l,
    word_ignore_list        = word_ignore_list_path ? fs.readFileSync(word_ignore_list_path, "utf-8").split("\n") : [];


module.exports = {

    match_if_similarity_is_higher_than: 70,

    cmp: function (text1, text2_objects, key) {
      var compared = [],
          words1 = this.extractWords(text1),
          text1_marked = [],
          text1_missing = [];

      for (var i in words1) {
          var word = words1[i],
              similar_words = [];

          for (var h in text2_objects) {

            var words2 = this.extractWords(text2_objects[h][key]),
                sim = this.findSimilarity(word, words2);
            similar_words = similar_words.concat(sim);
            var c = {word: word, similar_words: sim, o: text2_objects[h]};
            compared.push(c);

          }

          if (similar_words.length === 0 && !utils.contains(word_ignore_list, word.word.toLowerCase())) {
              text1_marked.push("~~"+word.word+"~~");
              text1_missing.push(word.word);
          } else {
              text1_marked.push(word.word);
          }
      }
      // console.log(utils.dumpObject(compared));

        return {
            compared: compared,
            len_text1: words1.length,
            text1_marked: text1_marked.join(" ").replace(/~~ ~~/g, " "),
            text1_missing: text1_missing.join(", ")
        };
    },

    extractWords: function (text) {

        text = text.replace(/[^a-zA-Z\n]/g, " ");

        var words = [],
            lines = text.split("\n");

        for (var i in lines) {
            var line = parseInt(i) + 1,
                words_line = lines[i]
                // camel case insert a space before all caps
                .replace(/([A-Z]+)/g, ' $1')
                .split(/[\s]+/);

            for (var j in words_line) {
                if (/^\s*$/.test(words_line[j])) continue;
                words.push({word: words_line[j], line: line});
            }
        }

        return words;
    },

    findSimilarity: function (word, words) {
        var similar_words = [],
            word_similarity;

        for (var i in words) {
            word_similarity = utils.similarText(word.word.toLowerCase(), words[i].word.toLowerCase(), true);
            if (word_similarity >= this.match_if_similarity_is_higher_than) {
                similar_words.push({similarity: word_similarity, word: words[i]});
            }
        }

        similar_words.sort(function(a, b) {return b.similarity - a.similarity});
        return similar_words;
    }
};
