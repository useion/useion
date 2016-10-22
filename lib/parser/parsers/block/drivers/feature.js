
module.exports = {

    indent: true,
    indent_character: " ",

    statement: [
        {
            type: "feature",
            parent_types: ["unknown"],
            start:  /Feature[ \t\r]*:(.+)\n/ ,
            end:    null,
            name:   /Feature[ \t\r]*:(.+)\n/
        },
        {
            type: "scenario",
            parent_types: ["unknown", "feature"],
            start: /Scenario[ \t\r]*:(.+)\n/ ,
            end:   null,
            name:  /Scenario[ \t\r]*:(.+)\n/
        },
        {
            type: "g",
            parent_types: ["unknown", "scenario"],
            start: /((Given)|(And)|(When)|(Then))[ \t\r]*(.+)\n/ ,
            end:   null,
            name:  /((Given)|(And)|(When)|(Then))[ \t\r]*(.+)\n/ ,
            name_i: 6
        },

        {
            type: "comment",
            parent_types: ["unknown", "feature", "scenario", "statement"],
            start: /#/ ,
            end:   /\n/
        },
        {
            type: "comment",
            parent_types: ["unknown", "feature", "scenario", "statement"],
            start: /"""/ ,
            end:   /"""/
        },
    ],

    ignore_statement_inside: [
        //{
        //    start: "'",
        //    end: "'",
        //    escape: "\\"
        //},
        {
            start: "\"",
            end: "\"",
            escape: "\\",
            ignore: ["\"\"\""]
        }
    ]



};