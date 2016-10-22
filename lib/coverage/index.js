var utils       = require('../helpers/utils'),
    fs          = require("fs"),
    path        = require('path'),
    argv = require('minimist')(process.argv.slice(2), {
          boolean: ["s", "synchronize", "w", "watch", "c", "use-case-coverage", "p", "puml", "help"]
        }),
    word_ignore_list_path_l   = (argv.ignore ? path.resolve(argv.ignore) : null),
    word_ignore_list_path   = (word_ignore_list_path_l === null && argv.i) ? path.resolve(argv.i) : word_ignore_list_path_l,
    word_ignore_list        = word_ignore_list_path ? fs.readFileSync(word_ignore_list_path, "utf-8").split("\n") : [];

module.exports = {

    count: function (words_count, compared_texts) {

        var covered_words_kv = {},
            ignored_words_kv = {},
            covered_words    = [],
            uncovered_words  = [],
            covered_words_dups    = [],
            uncovered_words_dups  = [];

        for (var i in compared_texts) {
            if (utils.contains(word_ignore_list, compared_texts[i].word.word.toLowerCase())) {
                if (!(compared_texts[i].word.word.toLowerCase() in ignored_words_kv)) {
                  words_count -= 1;
                  ignored_words_kv[compared_texts[i].word.word.toLowerCase()] = compared_texts[i];
                }
            } else {

                if (compared_texts[i].similar_words.length > 0) {
                    covered_words_dups.push(compared_texts[i]);
                } else {
                    uncovered_words_dups.push(compared_texts[i]);
                }

                if (compared_texts[i].word.word in covered_words_kv) {
                  continue;
                }
                if (compared_texts[i].similar_words.length > 0) {
                    covered_words.push(compared_texts[i]);
                    covered_words_kv[compared_texts[i].word.word] = compared_texts[i];
                } else {
                    uncovered_words.push(compared_texts[i]);
                }
            }
        }

        return {
            covered_words: covered_words,
            uncovered_words: uncovered_words,
            covered_words_dups: covered_words_dups,
            uncovered_words_dups: uncovered_words_dups,
            percent_covered: (100*covered_words.length)/words_count
        }

    },
};
