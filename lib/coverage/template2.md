{% if (!(o.main_scenario_steps.length === 0 && o.alternate_flow_steps.length === 0 && Object.keys(o.relationship_coverages).length === 0)) { %}{%="# Coverage of "+o.usecase.name%}
{% if (o.main_scenario_steps.length !== 0) { %}
## Main scenario

{%# o.main_tab%}
{% } %}{% if (o.alternate_flow_steps.length !== 0) { %}
## Alternate flows

{%# o.alt_tab%}

{% } %}{% if (Object.keys(o.relationship_coverages).length !== 0) { %}
## Relationships

{%# o.rel_tab%}
{% } %}{% } %}
