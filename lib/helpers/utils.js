
var path  = require('path'),
    colors = require('colors'),
    regexps = require('./regexps'),
    //similar = require('similar'),
    jsdiff = require('diff');

module.exports = {

    waterfall: function (fns, done, ress) {

        var _this = this;
        if (!ress) ress = [];
        if (fns.length >= 1) {
            var promise = fns[0]();
            promise.then(function (res) {
                ress.push(res);
                _this.waterfall(fns.slice(1), done, ress);
            });
        } else {
            done(ress);
        }
    },

    waterfallWithProgress: function (fns, length, done, progressPos, progressArr) {

        var _this = this;

        if (!progressPos) progressPos = 0;
        if (!progressArr) progressArr = ['-', '\\', '|', '/'];

        if (fns.length >= 1) {

            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            if (progressPos >= progressArr.length) progressPos = 0;
            var percent = (100*(length-fns.length+1))/length;
            process.stdout.write(progressArr[progressPos] + " " + percent.toFixed(2) + "%");
            if (fns.length === 1) {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
            }
            //process.stdout.write((length-fns.length+1)+"/"+length+" ");

            var promise = fns[0]();
            promise.then(function () {
                _this.waterfallWithProgress(fns.slice(1), length, done, progressPos+1, progressArr);
            });
        } else {
            done();
        }
    },

    waterfallWrap: function (that, fn, params) {
        return function () {
            var promise = fn.apply(that, params);
            return promise;
        };
    },

    /*
     * @Author wes
     *  http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/ */
    hashCode: function (string) {
    	var hash = 0;
    	if (string.length == 0) return hash;
    	for (i = 0; i < string.length; i++) {
    		char = string.charCodeAt(i);
    		hash = ((hash<<5)-hash)+char;
    		hash = hash & hash; // Convert to 32bit integer
    	}
    	return hash;
    },

    short: function (text, char_length) {
      if (!char_length) char_length = 40;
      if (text.length > char_length) {
        text = text.substring(0, char_length)+"...";
      }
      return text;
    },

    extend: function (dstObject, srcObject) {
        for (var property in srcObject) {
            if (property in dstObject) {
                dstObject["super_"+property] = dstObject[property];
            }
            dstObject[property] = srcObject[property];
        }
        return dstObject;
    },

    extractLinesRange: function (text, from, to) {
        var textArr = text.split("\n"),
            textSel = [];
        for (var i = from-1; i < to; i++) {
            textSel.push(textArr[i]);
        }
        return textSel.join("\n");
    },

    extractLineRanges: function (text, ranges, except) {
        if (!except) except = [];
        var textArr = text.split("\n"),
            textSel = [],
            c = false,
            exc = false;
        for (var i = 0; i < textArr.length; i++) {
            c = false;
            exc = false;
            for (var j in except) {
                if ((except[j][0]-1) <= i && i <= (except[j][1]-1)) {
                    exc = true;
                    break;
                }
            }
            for (var j in ranges) {
                if ((ranges[j][0]-1) <= i && i <= (ranges[j][1]-1)) {
                    c = true;
                    break;
                }
            }
            // if last line is deleted, add newline
            //if ((textArr.length-1) === i && c) {
            //    textSel.push("");
            //}
            if (!exc && c) continue;
            textSel.push(textArr[i]);
        }
        return textSel.join("\n");
    },

    extractEmptyLines: function (text) {
        var textArr = text.split("\n"),
            textSel = [];
        for (var i = 0; i < textArr.length; i++) {
            if (!/^\s*$/.test(textArr[i])) {
                textSel.push(textArr[i])
            }
        }
        return textSel.join("\n");
    },

    args: {
        extract: function (string) {
            var name = string.replace(regexps.between_quotes(), '')
                    .replace(/^\s*|\s*$/g, '')
                    .replace(/[\s]+/g, ' '),

                args = string.match(regexps.between_quotes());

            for (var i in args) {
                args[i] =
                    args[i].replace(/\"/g, '');
            }

            return {
                name: name,
                args: args?args:[]
            }
        }
    },

    htmlRemoveBetween: function (data, tagName) {
        var start = "<"+tagName,
            pos = 0,
            status = "null",
            end = "</"+tagName+">",
            preend_buf = "",
            data_fin = "";
        for (var i = 0; i < data.length; i++){
            var c = data.charAt(i);

            if (status === "started") {
                if (/\s/.test(c))
                    preend_buf += c;
                else
                    preend_buf += " ";//c.replace(/./g, " ");
            } else {

                data_fin += c;
            }

            if (status === "started") {
                if (c === end.charAt(pos)) {
                    pos++;
                } else {
                    pos = 0;
                }

                if (pos === end.length) {
                    preend_buf = preend_buf.replace(new RegExp(".{"+end.length+"}$"), "");
                    data_fin += preend_buf+end;
                    pos = 0;
                    status = "null";
                }
            }
            if (status === "prestart" && c === ">") {
                status = "started";
                preend_buf = "";
                pos = 0;
            }
            if (status === "null") {
                if (c === start.charAt(pos)) {
                    pos++;
                } else {
                    pos = 0;
                }

                if (pos === start.length) {
                    status = "prestart";
                    pos = 0;
                }
            }
        }
        return data_fin;
    },

    insertAtLine: function (line, insert, text) {

        var textArr = text.split("\n"),
            textSel = [];

        for (var i = 0; i < textArr.length; i++) {
            if (i === (line-1)) {
                textSel = textSel.concat(insert.split("\n"));
            }
            textSel.push(textArr[i]);
        }
        if (line > textArr.length) {
            textSel = textSel.concat(insert.split("\n"));
        }
        return textSel.join("\n");

    },

    camelCase: function (s) {
        return (s||'').toLowerCase().replace(/(\b|\s)\w/g, function(m) {
            return m.toUpperCase().replace(/\s/,'');
        });
    },

    underscoreCase: function (s) {
        return (s||'').toLowerCase().replace(/(\b|\s)\w/g, function(m) {
            return m.replace(/\s/,'_');
        });
    },

    startsWith: function (text, str){
        return text.indexOf(str) === 0;
    },

    endsWith: function(text, suffix) {
        return text.indexOf(suffix, text.length - suffix.length) !== -1;
    },

    parseURL: function (url) {

        var parser = document.createElement('a'),
            params = {},
            queries, split, i;

        // Let the browser do the work
        parser.href = url;

        queries = parser.search.replace(/^\?/, '').split('&');
        if (!(queries.length === 1 && queries[0] == "")) {
            for( i = 0; i < queries.length; i++ ) {
                split = queries[i].split('=');
                params[split[0]] = decodeURIComponent(split[1]);
            }
        }

        return {
            protocol: parser.protocol,
            host: parser.host,
            hostname: parser.hostname,
            port: parser.port,
            pathname: parser.pathname,
            params: params,
            hash: parser.hash
        };
    },

    makeHumanReadablePath: function (p, base) {
        return path.resolve(p).replace(new RegExp("^"+path.resolve(base)+'/'), '');
    },


    /**
     * @author Georg Barikin
     *
     * http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array
     */
    uniq: function (a) {
        var seen = {};
        var out = [];
        var len = a.length;
        var j = 0;
        for(var i = 0; i < len; i++) {
            var item = a[i];
            if(seen[item] !== 1) {
                seen[item] = 1;
                out[j++] = item;
            }
        }
        return out;
    },

    /**
     * @author eyelidlessness
     *
     * http://stackoverflow.com/questions/1181575/determine-whether-an-array-contains-a-value
     */
    contains: function(array, needle) {
        // Per spec, the way to identify NaN is that it is not equal to itself
        var findNaN = needle !== needle;
        var indexOf;

        if(!findNaN && typeof Array.prototype.indexOf === 'function') {
            indexOf = Array.prototype.indexOf;
        } else {
            indexOf = function(needle) {
                var i = -1, index = -1;

                for(i = 0; i < array.length; i++) {
                    var item = array[i];

                    if((findNaN && item !== item) || item === needle) {
                        index = i;
                        break;
                    }
                }

                return index;
            };
        }

        return indexOf.call(array, needle) > -1;
    },



    similarText: function (first, second, percent) {
        //console.log(first.length, second.length);
        //console.time("alg");
        //var sim = similar(first, second);
        //var sim = this.similarTextPHP(first, second, percent);
        var sim = this.mySimilarJSDIFF(first, second);
        //console.log(sim);
        //console.timeEnd("alg");
        return sim;
    },

    /**
     *
     *
     * JS DIFF - http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
     * mySimilarJSDIFF
     36828 3525
     0
     alg: 106.436ms

     PHP SIMILAR TEXT
     http://locutus.io/php/similar_text/

     3525 36828
     7.166753401234109
     alg: 6650.177ms

     36828 3525
     6.948677917379129
     alg: 6264.526ms

     https://code.google.com/p/google-diff-match-patch/

     3525 36828
     0.22779043280182232
     alg: 1000.624ms

     36828 3525
     0.023643456673365645
     alg: 1001.354ms

     */
    mySimilarJSDIFF: function (first, second, percent) {

        if (first.split("\n").length >= 2 || second.split("\n").length >= 2) {
            var diffs = jsdiff.diffLines(first, second),
                difftype = 'lines';
        } else {
            var diffs = jsdiff.diffChars(first, second),
                difftype = 'chars';
        }

        var added = 0,
            removed = 0,
            none = 0,
            prev_val = 0,
            val = 0,
            prev_action,
            action = "none";


        for (var i in diffs) {
            var diff = diffs[i];

            prev_val = val;
            val = diff.count;

            if (!val) {

                if (difftype === "lines") {
                    val = diff.value.split("\n").length;
                } else {
                    val = diff.value.length;
                }

            }

            prev_action = action;
            action = "none";
            if (diff.added) action = "added";
            if (diff.removed) action = "removed";

            switch (action) {
                case "none":
                    none += val;
                    break;

                case "added":
                    if (prev_action === "removed") {
                        added += val>prev_val?val-prev_val:prev_val-val;
                    } else {
                        added += val;
                    }
                    break;

                case "removed":
                    if (prev_action === "added") {
                        removed += val>prev_val?val-prev_val:prev_val-val;
                    } else {
                        removed += val;
                    }
                    break;
            }
        }

        var changes = added+removed,
            sum = changes+none,
            percent_changed = 100-((100 * (changes)) / sum);

        return percent_changed;

    },

    similarTextPHP: function  (first, second, percent) { // eslint-disable-line camelcase
        //  discuss at: http://locutus.io/php/similar_text/
        // original by: Rafa? Kukawski (http://blog.kukawski.pl)
        // bugfixed by: Chris McMacken
        // bugfixed by: Jarkko Rantavuori original by findings in stackoverflow (http://stackoverflow.com/questions/14136349/how-does-similar-text-work)
        // improved by: Markus Padourek (taken from http://www.kevinhq.com/2012/06/php-similartext-function-in-javascript_16.html)
        //   example 1: similar_text('Hello World!', 'Hello locutus!')
        //   returns 1: 8
        //   example 2: similar_text('Hello World!', null)
        //   returns 2: 0

        if (first === null ||
            second === null ||
            typeof first === 'undefined' ||
            typeof second === 'undefined') {
            return 0;
        }

        first += '';
        second += '';

        var pos1 = 0;
        var pos2 = 0;
        var max = 0;
        var firstLength = first.length;
        var secondLength = second.length;
        var p;
        var q;
        var l;
        var sum;

        for (p = 0; p < firstLength; p++) {
            for (q = 0; q < secondLength; q++) {
                for (l = 0; (p + l < firstLength) && (q + l < secondLength) && (first.charAt(p + l) === second.charAt(q + l)); l++) { // eslint-disable-line max-len
                    // @todo: ^-- break up this crazy for loop and put the logic in its body
                }
                if (l > max) {
                    max = l;
                    pos1 = p;
                    pos2 = q;
                }
            }
        }

        sum = max;

        if (sum) {
            if (pos1 && pos2) {
                sum += this.similarTextPHP(first.substr(0, pos1), second.substr(0, pos2));
            }

            if ((pos1 + max < firstLength) && (pos2 + max < secondLength)) {
                sum += this.similarTextPHP(
                    first.substr(pos1 + max, firstLength - pos1 - max),
                    second.substr(pos2 + max,
                        secondLength - pos2 - max));
            }
        }

        if (!percent) {
            return sum;
        }

        return (sum * 200) / (firstLength + secondLength);
    },


    /**
     * http://stackoverflow.com/questions/8837454/sort-array-of-objects-by-single-key-with-date-value
     */
    sortByKey: function (array, key) {
        return array.sort(function(a, b) {
            var x = a[key]; var y = b[key];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    },


    /**
     * http://stackoverflow.com/questions/19734477/verify-if-java-is-installed-from-node-js
     */
    javaversion: function(callback) {
        var spawn = require('child_process').spawn('java', ['-version']),
            e = true;
        spawn.on('error', function(err){
            e = false;
        });
        spawn.stderr.on('data', function(data) {
            data = data.toString().split('\n')[0];
            var javaVersion = new RegExp('java version').test(data) ? data.split(' ')[2].replace(/"/g, '') : false;
            if (javaVersion != false) {
                e = false;
            }
        });
        spawn.on('exit', function(err){
            return callback(e);
        });
    },

    /**
     * @author Philippe Lhoste
     *
     * http://stackoverflow.com/questions/130404/javascript-data-formatting-pretty-printer
     */
    dumpObject: function (obj, indent) {  var result = "";
        if (indent == null) indent = "";

        for (var property in obj)
        {
            var value = obj[property];
            if (typeof value == 'string')
                value = "\"" + value + "\"";
            else if (typeof value == 'object')
            {
                var od = this.dumpObject(value, indent + "  ");
                // If you like { on the same line as the key
                //value = "{\n" + od + "\n" + indent + "}";
                // If you prefer { and } to be aligned
                value =  "{\n" + od + "\n" + indent + "}";
            }
            result += indent + "" + colors.magenta(property) + ": " + value + ",\n";
        }
        return result.replace(/,\n$/, "");
    },



};
