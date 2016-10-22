
module.exports = {

    indent: true,
    indent_character: " ",

    statement: [
        {
            type: "class",
            parent_types: ["unknown", "class", "method"],
            start: /class\s+([A-Za-z0-9_]+)\s?[A-Za-z0-9_\\\s\(\),]*:/ ,
            end:   null,
            name:  /class\s+([A-Za-z0-9_]+)\s?[A-Za-z0-9_\\\s\(\),]*:/
        },

        {
            type: "method",
            parent_types: ["unknown", "class"],
            start: /def\s+([A-Za-z0-9_]+)\s*\((.|\n)*?\)\s*:/ ,
            end:   null,
            name:  /def\s+([A-Za-z0-9_]+)\s*\((.|\n)*?\)\s*:/
        },

        {
            type: "comment",
            parent_types: ["unknown", "class", "method", "statement"],
            start: /#/  ,
            end:   /\n/
        },
        {
            type: "comment",
            parent_types: ["unknown", "class", "method", "statement"],
            start: /"""/ ,
            end:   /"""/
        },
    ],


    ignore_statement_inside: [
        {
            start: "'",
            end: "'",
            escape: "\\"
        }, {
            start: "\"",
            end: "\"",
            escape: "\\",
            ignore: ["\"\"\""]
        }
    ]

};