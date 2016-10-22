
module.exports = {

    indent: false,
    indent_character: " ",

    statement: [
        {
            type: "namespace",
            parent_types: ["unknown", "class", "method"],
            start: /namespace\s+([A-Za-z0-9_\.]+)\s?[A-Za-z0-9_\.\\\s]*{/ ,
            end:   /}/ ,
            name:  /namespace\s+([A-Za-z0-9_\.]+)\s?[A-Za-z0-9_\.\\\s]*{/
        },{
            type: "class",
            parent_types: ["unknown", "namespace", "class", "method"],
            start: /[a-zA-Z]{1}[a-zA-Z0-9_<>\s]+\s+class\s+([A-Za-z0-9_]+)\s?[A-Za-z0-9_\\\s]*{/ ,
            end:   /}/ ,
            name:  /[a-zA-Z]{1}[a-zA-Z0-9_<>\s]+\s+class\s+([A-Za-z0-9_]+)\s?[A-Za-z0-9_\\\s]*{/
        },{
            type: "method",
            parent_types: ["unknown", "class"],
            start: /([a-zA-Z0-9_]+)\s*\(([^()]|\n)*?\)[a-zA-Z0-9_\s]*{/ ,
            end:   /}/ ,
            name:  /([a-zA-Z0-9_]+\s*\(([^()]|\n)*?\))[a-zA-Z0-9_\s]*{/
        },{
            type: "method",
            parent_types: ["unknown", "class"],
            start: /[a-zA-Z]{1}[a-zA-Z0-9_<>\s]+\s+([a-zA-Z0-9_]+)\s*\(([^()]|\n)*?\)[a-zA-Z0-9_\s]*{/ ,
            end:   /}/ ,
            name:  /[a-zA-Z]{1}[a-zA-Z0-9_<>\s]+\s+([a-zA-Z0-9_]+\s*\(([^()]|\n)*?\))[a-zA-Z0-9_\s]*{/
        }, {
            type: "attribute",
            parent_types: ["class"],
            start: /([a-zA-Z0-9_\.]+)\s*;/ ,
            end: null,
            name:  /([a-zA-Z0-9_\.]+)\s*;/
        }, {
            type: "attribute-assignment",
            parent_types: ["class"],
            start: /([a-zA-Z0-9_\.]+)\s*=/ ,
            end:   /;/ ,
            name:  /([a-zA-Z0-9_\.]+)\s*=/
        },
        {
            type: "comment",
            parent_types: ["unknown", "namespace", "class", "method", "statement"],
            start: /\/\*/ ,
            end:   /\*\//
        },
        {
            type: "comment",
            parent_types: ["unknown", "namespace", "class", "method", "statement"],
            start: /\/\// ,
            end:   /\n/
        },
        {
            type: "statement",
            parent_types: ["unknown", "namespace", "class", "method", "statement"],
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
