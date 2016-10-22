
module.exports = {

    indent: false,
    indent_character: " ",

    statement: [
        {
            type: "selector",
            parent_types: ["unknown", "selector"],
            start: /[a-zA-Z0-9\.#@]{1}([^}]|\n)*?{/ ,
            end:   /}/ ,
            name:  /([a-zA-Z0-9\.#@]{1}([^}]|\n)*?)\s*{/

        },
        {
            type: "comment",
            parent_types: ["unknown", "statement", "selector"],
            start: /\/\*/ ,
            end:   /\*\// ,
        },
        {
            type: "comment",
            parent_types: ["unknown", "statement", "selector"],
            start: /\/\//  ,
            end:   /\n/
        }

    ],


    ignore_statement_inside: [
        {
            start: "<?",
            end: "?>",
            escape: null
        },
        {
            start: "<%",
            end: "%>",
            escape: null
        }
    ]
};