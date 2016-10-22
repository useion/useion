{%="# "+o.usecase.name%}
{% function cov(coverage) {
    var color = o.colors.green;
    if (coverage.percent_covered < 100) color = o.colors.red;
    print("*"+color(coverage.percent_covered.toFixed(0)+" %")+"*");
  }
%}
## Main scenario

{% for (var i in o.main_scenario_steps) {
    var step_id = o.main_scenario_steps[i],
        code_coverage = o.step_coverages[step_id].code,
        test_coverage = o.step_coverages[step_id].tests; %}{%= o.steps[step_id].no%} {%
    cov(code_coverage); if (o.test_fragments.length > 0) {
%}, {%
    cov(test_coverage); }
%} {%# o.step_coverages[step_id].text1_marked+"" %}
{% } %}{% if (o.alternate_flow_steps.length !== 0) { %}
## Alternate flows

{% } %}{% for (var i in o.alternate_flow_steps) {
    var step_id = o.alternate_flow_steps[i],
        code_coverage = o.step_coverages[step_id].code,
        test_coverage = o.step_coverages[step_id].tests; %}{%= o.steps[step_id].no %} {%
    cov(code_coverage); if (o.test_fragments.length > 0) {
%}, {%
    cov(test_coverage); }
%} {%# o.step_coverages[step_id].text1_marked+"\n" %}
{% } %}{% if (Object.keys(o.relationship_coverages).length !== 0) { %}
## Relationships

{% } %}{% for (var i in o.relationship_coverages) {
    var text = o.relationship_coverages[i].text,
        code_coverage = o.relationship_coverages[i].code,
        test_coverage = o.relationship_coverages[i].tests; %}{%
    cov(code_coverage); if (o.test_fragments.length > 0) {
%}, {%
    cov(test_coverage); }
%} {%# text %}
{% } %}
