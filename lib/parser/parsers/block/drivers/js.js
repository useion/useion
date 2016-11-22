
var utils = require('../../../../helpers/utils'),
    parser      = require('../../../index');

module.exports = {

    before_matching: [
        // disable PHP
        function (data) {
            return utils.disablePHP(data).data;
        }
    ],

    indent: false,
    indent_character: " ",

    statement: [
        {
            type: "class",
            parent_types: ["unknown", "class"],
            start: /(var\s*)?([a-zA-Z0-9_]+)\s*=\s*function\s*\((.|\n)*?\)\s*{/ ,
            end:   /}[;,]?/,
            name:  /(var\s*)?([a-zA-Z0-9_]+)\s*=\s*function\s*\((.|\n)*?\)\s*{/,
            name_i: 2
        },
        {
            type: "class",
            parent_types: ["unknown", "class"],
            start: /var\s+([a-zA-Z0-9_]+)\s*=\s*{/ ,
            end:   /}[;,]?/,
            name:  /var\s+([a-zA-Z0-9_]+)\s*=\s*{/
        },
        {
            type: "class",
            parent_types: ["unknown", "class"],
            start: /\({/ ,
            end:   /}\)[;]?/,
            name:  /(\({)/
        },
        {
            type: "class",
            parent_types: ["unknown", "class"],
            start: /\(function\s*\((.|\n)*?\)\s*{/ ,
            end:   /}\)/,
            name:  /(\(function\s*\((.|\n)*?\))\s*{/
        },
        {
            type: "function",
            parent_types: ["unknown", "class", "function", "function-call", "assignment", "statement"],
            start: /([a-zA-Z]{1}[A-Za-z0-9_\.\[\]"'-]+\s*\+?[=:]{1}\s*function\s*\((.|\n)*?\))\s*{/ ,
            end:   /}[,;]?/ ,
            name:  /([a-zA-Z]{1}[A-Za-z0-9_\.\[\]"'-]+\s*\+?[=:]{1}\s*function\s*\((.|\n)*?\))\s*{/ ,
        },
        {
            type: "function",
            parent_types: ["unknown", "class", "function", "function-call", "statement"],
            start: /function\s+([a-zA-Z0-9_]*\s*\((.|\n)*?\))\s*{/ ,
            end:   /}[;]?/ ,
            name:  /function\s+([a-zA-Z0-9_]*\s*\((.|\n)*?\))\s*{/
        },
        {
            type: "function",
            parent_types: ["unknown", "class", "function", "function-call", "assignment", "statement"],
            start: /([a-zA-Z]{1}[A-Za-z0-9_\.\[\]"'-]+)\s*\+?[=:]{1}\s*{/ ,
            end:   /}[,;]?/ ,
            name:  /([a-zA-Z]{1}[A-Za-z0-9_\.\[\]"'-]+)\s*\+?[=:]{1}\s*{/ ,
        },
        {
            type: "assignment",
            parent_types: ["unknown", "class", "assignment", "function", "function-call", "statement"],
            start: /(var\s*)?([a-zA-Z0-9_\.\[\]"'-]+)\s*\+?[^!]=[^=](.|\n)*?([,;]|([^,]\s*?\n))/ ,
            end:   null,
            name:  /([a-zA-Z0-9_\.\[\]"'-]+)\s*\+?[^!]=[^=](.|\n)*?([,;]|([^,]\s*?\n))/
        },
        // {
        //     type: "assignment",
        //     parent_types: ["unknown", "class", "function", "function-call", "statement"],
        //     start: /var\s/ ,
        //     end:   null
        // },
        {
            type: "function-call",
            parent_types: ["unknown", "class", "function", "function-call", "assignment", "statement"],
            start: /([a-zA-Z]{1}[A-Za-z0-9_\.\[\]"'-]+)\(/ ,
            end:   /\)[;]?/ ,
        },
        {
            type: "comment",
            parent_types: ["unknown", "class", "function", "function-call", "assignment", "statement"],
            start: /\/\*/  ,
            end:   /\*\//
        },
        {
            type: "comment",
            parent_types: ["unknown", "class", "function", "function-call", "assignment", "statement"],
            start: /\/\//  ,
            end:   /\n|(-->)/
        },
        {
            type: "statement",
            parent_types: ["unknown", "class", "function", "function-call", "assignment", "statement"],
            start: /\[/  ,
            end:   /\]/
        },
        {
            type: "statement",
            parent_types: ["unknown", "class", "function", "function-call", "assignment", "statement"],
            start: /{/  ,
            end:   /}/  ,
        }
    ],


    ignore_statement_inside: [
        {
            start: "'",
            end: "'",
            escape: "\\"
        }, {
            start: "\"",
            end: "\"",
            escape: "\\"
        }
    ]
};
