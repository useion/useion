module.exports = {
    comments:           wrap( /\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*/g ),
    comments_trash:     wrap( /^[\s=-]+|[\s]+$/ ),

    sections: {
        usecase:        wrap( /^(# Use case\s)|(# Test\s).*$/   ),
        actors:         wrap( /^## Actors$/    ),
        triggers:       wrap( /^## Triggers$/  ),
        main_scenario:          wrap( /^## Main scenario$/ ),
        main_scenario_fragment:     wrap( /^```.*$/ ),
        alternate_flows:     wrap( /^## Alternate flows$/ ),
        preconditions:  wrap( /^## Pre-conditions$/        ),
        postconditions: wrap( /^## Post-conditions$/       ),
        extension_points: wrap(/^## Extension points$/     ),
        code:           wrap(/^# Code$/     ),
        tests:          wrap(/^# Tests$/     )
    },

    use_case_begin:           wrap( /^(# Use case[\s]+)|(# Test[\s]+)/       ),
    use_case_specializes:     wrap( /specializes\s+([a-zA-Z0-9\ ,]+)\s*$/       ),
    step_begin:         wrap( /^[0-9a-zA-Z]+\./     ),
    condition_begin:    wrap( /^[0-9a-zA-Z]+[a-zA-Z]\./    ),
    step_inherited:     wrap( /^\s*\(inherited\)\s*/ ),
    include:            wrap( /^Include/ ),
    extension_point:    "extension point",

    fragment_begin:     wrap(/^[\s]*(##)[\s]+/     ),
    //fragment_begin:     function (next_line) {
    //    if (/^[-]+/.test(next_line)) {
    //        return true;
    //    } else {
    //        return false;
    //    }
    //},
    fragment_notations:  {
        '```':  {
            start:      wrap(/^[\s]*```([a-zA-Z]*)[\s]*$/     ),
            end:        wrap(/^[\s]*```[\s]*$/     )
        },
        '    ':         {
            start:      wrap(/^[ ]{4}/     ),
            end:        wrap(/^(?! {4})/     ), // do not start with '    '
        }
    },

    actor_name:         wrap( /^[0-9a-zA-Z\s]+(:|$)/    ),

    between_quotes:     wrap( /(["'])(\\?.)*?\1/g   ),


};

function wrap(r) {
    return function() {
        return eval(r.toString())
    };
}
