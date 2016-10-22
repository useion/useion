
var utils = require('../../../../helpers/utils');

module.exports = {

    before_matching: [
        // disable PHP
        function (data) {
            return data.replace(/<\?/g, " ?").replace(/\?>/g, "? ");
        },
        // disable javascript
        function (data) {
            //return data;
            return utils.htmlRemoveBetween(data, "script");
        }
    ],

    indent: false,
    indent_character: " ",

    statement: [
        // void tags: area , base , br , col , command , embed , hr , img , input , keygen , link , meta , param , source , track , wbr.
        {
            type: "tag",
            parent_types: ["unknown", "tag"],
            start: /<((area)|(base)|(br)|(col)|(command)|(embed)|(hr)|(img)|(input)|(keygen)|(link)|(meta)|(param)|(source)|(track)|(wbr))(?!\/)([^<>]|\n)*?>/ ,
            end:   null,
            name:  /<(.|\n)*?(id="(.*?)")(.|\n)*?>/ ,
            name_i: 3
        },


        // open tags - simple
        {
            type: "tag",
            parent_types: ["unknown", "tag"],
            start:  /<[a-zA-Z]+>/ ,
            end:    /<\/[a-zA-Z]+([^<>]|\n)*?>/
        },
        // open tags
        {
            type: "tag",
            parent_types: ["unknown", "tag"],
            start: /<[a-zA-Z]+(?!\/)([^<>]|\n)*?[^\/]>/ ,
            end:   /<\/[a-zA-Z]+([^<>]|\n)*?>/ ,
            name:  /<(.|\n)*?(id="(.*?)")(.|\n)*?>/ ,
            name_i: 3
        },

        // closed tags
        {
            type: "tag",
            parent_types: ["unknown", "tag"],
            start: /<[a-zA-Z]+(?!\/)([^<>]|\n)*?\/>/ ,
            end:   null,
            name:  /<(.|\n)*?(id="(.*?)")([^<>]|\n)*?>/ ,
            name_i: 3
        },
        {
            type: "template",
            parent_types: ["unknown", "tag"],
            start: /{%/ ,
            end:   /%}/
        },
        {
            type: "comment",
            parent_types: ["unknown", "tag"],
            start: /<!--/ ,
            end:   /-->/
        },

        {
            type: "php",
            parent_types: ["unknown", "tag"],
            start: /<\?/ ,
            end:   /\?>/
        },



    ],


    ignore_statement_inside: [
        //{
        //    start: "\"",
        //    end: "\"",
        //    escape: null
        //},
        //{
        //    start: "'",
        //    end: "'",
        //    escape: null
        //},
        //{
        //    start: "<?",
        //    end: "?>",
        //    escape: null
        //},
        {
            start: "<%",
            end: "%>",
            escape: null
        }
    ]

};
