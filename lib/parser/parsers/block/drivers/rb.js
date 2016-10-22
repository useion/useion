
module.exports = {

    indent: false,
    indent_character: " ",

    statement: [
        {
            type: "module",
            parent_types: ["unknown", "class", "method"],
            start: /module[\r\t\f ]+([A-Za-z0-9_]+)[\r\t\f ]?[A-Za-z0-9_\\\r\t\f ]*/ ,
            end:   /end/ ,
            name:  /module[\r\t\f ]+([A-Za-z0-9_]+)[\r\t\f ]?[A-Za-z0-9_\\\r\t\f ]*/
        },
        {
            type: "class",
            parent_types: ["unknown", "module", "class", "method"],
            start: /class[\r\t\f ]+([A-Za-z0-9_]+)[\r\t\f ]?[A-Za-z0-9_\\\r\t\f ]*/ ,
            end:   /end/ ,
            name:  /class[\r\t\f ]+([A-Za-z0-9_]+)[\r\t\f ]?[A-Za-z0-9_\\\r\t\f ]*/
        },{
            type: "method",
            parent_types: ["unknown", "module", "class"],
            start: /def[\r\t\f ]+([A-Za-z0-9_\.=\+]+)[\r\t\f ]*\(([^()]|\n)*?\)/ ,
            end:   /end/ ,
            name:  /def[\r\t\f ]+([A-Za-z0-9_\.=\+]+)[\r\t\f ]*\(([^()]|\n)*?\)/
        },{
            type: "method",
            parent_types: ["unknown", "module", "class"],
            start: /def[\r\t\f ]+([A-Za-z0-9_\.=\+]+)/ ,
            end:   /end/ ,
            name:  /def[\r\t\f ]+([A-Za-z0-9_\.=\+]+)/
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


        {
            type: "statement",
            parent_types: ["unknown", "module", "class", "method", "statement"],
            start: /\s((if)|(case)|(do)|(begin))\s/ ,
            end:   /end/
        },
        {
            type: "attribute",
            parent_types: ["class"],
            start: /(?!end)([a-zA-Z]{1}[a-zA-Z0-9_\.\?@:\r\t\f ]*)\n/ ,
            end: null,
            name:  /([a-zA-Z]{1}[a-zA-Z0-9_\.\?@:\r\t\f ]*)\n/
        },
        {
            type: "statement",
            parent_types: ["unknown", "module", "class", "method", "statement"],
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
