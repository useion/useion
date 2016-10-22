
// FOR:
//wrap( /for\s*\((.|\n)+?\)\s*{/ )

module.exports = {


    indent: false,
    indent_character: " ",

    statement: [
        {
            type: "class",
            parent_types: ["unknown", "class", "method"],
            start: /class\s+([A-Za-z0-9_]+)[A-Za-z0-9_\\\s]*{/ ,
            end:   /}/ ,
            name:  /class\s+([A-Za-z0-9_]+)[A-Za-z0-9_\\\s]*{/
        },{
            type: "method",
            parent_types: ["unknown", "class"],
            start: /([a-zA-Z0-9_]+)\s*\([()a-zA-Z,_'"\$=0-9\[\]\s><]*?\)[a-zA-Z0-9_\s]*{/ ,
            end:   /}/ ,
            name:  /([a-zA-Z0-9_]+\s*\([()a-zA-Z,_'"\$=0-9\[\]\s><]*?\))[a-zA-Z0-9_\s]*{/
        },{
            type: "method",
            parent_types: ["unknown", "class"],
            start: /[a-zA-Z]{1}[a-zA-Z0-9_\s]+\s+([a-zA-Z0-9_]+)\s*\([()a-zA-Z,_'"\$=0-9\[\]\s><]*?\)[a-zA-Z0-9_\s]*{/ ,
            end:   /}/ ,
            name:  /[a-zA-Z]{1}[a-zA-Z0-9_<>\s]+\s+([a-zA-Z0-9_]+\s*\([()a-zA-Z,_'"\$=0-9\[\]\s><]*?\))[a-zA-Z0-9_\s]*{/
        }, {
            type: "attribute",
            parent_types: ["class"],
            start: /\$([a-zA-Z0-9_]+)\s*;/ ,
            end: null,
            name:  /\$([a-zA-Z0-9_]+)\s*;/
        }, {
            type: "attribute-assignment",
            parent_types: ["class"],
            start: /\$([a-zA-Z0-9_]+)\s*=/ ,
            end:   /;/ ,
            name:  /\$([a-zA-Z0-9_]+)\s*=/
        },
        {
            type: "comment",
            parent_types: ["unknown", "class", "method", "statement"],
            start: /\/\*/ ,
            end:   /\*\//
        },
        {
            type: "comment",
            parent_types: ["unknown", "class", "method", "statement"],
            start: /\/\// ,
            end:   /\n/
        },
        {
            type: "statement",
            parent_types: ["unknown", "class", "method", "statement"],
            start: /{/ ,
            end:   /}/
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