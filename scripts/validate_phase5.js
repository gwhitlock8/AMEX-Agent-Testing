// ============================================================
// PHASE 5 VALIDATION: Volume / Performance Results Checker
// ============================================================
// Run AFTER triggering the agentic workflow on all 30 Phase 5 incidents.
//
// This script performs:
//   1. Completion check — did all 3 agents run on each incident?
//   2. Field population rate — how many got category, service, CI?
//   3. Execution time analysis (from agent execution logs)
//   4. Spot-check accuracy on every 5th incident (VL-05, 10, 15, 20, 25, 30)
//   5. Aggregate performance metrics
// ============================================================

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function findTestIncidents(correlationDisplay) {
    var incidents = {};
    var gr = new GlideRecord('incident');
    gr.addQuery('correlation_display', correlationDisplay);
    gr.query();
    while (gr.next()) {
        var testId = gr.correlation_id.toString();
        if (testId) {
            incidents[testId] = {
                sys_id: gr.sys_id.toString(),
                number: gr.number.toString(),
                short_description: gr.short_description.toString(),
                category: gr.category.toString(),
                subcategory: gr.subcategory.toString(),
                business_service: gr.business_service.getDisplayValue(),
                service_offering: gr.service_offering.getDisplayValue(),
                cmdb_ci: gr.cmdb_ci.getDisplayValue(),
                problem_id: gr.problem_id.toString(),
                problem_display: gr.problem_id.getDisplayValue()
            };
        }
    }
    return incidents;
}

function getMILink(incidentSysId) {
    var inc = new GlideRecord('incident');
    if (inc.get(incidentSysId)) {
        if (inc.parent_incident && inc.parent_incident.toString()) {
            return { linked: true };
        }
    }
    var rel = new GlideRecord('task_rel_task');
    if (rel.isValid()) {
        rel.addQuery('child', incidentSysId);
        rel.query();
        while (rel.next()) {
            var parentTask = new GlideRecord('incident');
            if (parentTask.get(rel.parent.toString())) {
                if (parentTask.major_incident_state && parentTask.major_incident_state.toString()) {
                    return { linked: true };
                }
            }
        }
    }
    return { linked: false };
}

function countAgentWorkNotes(incidentSysId) {
    var count = 0;
    var gr = new GlideRecord('sys_journal_field');
    gr.addQuery('element_id', incidentSysId);
    gr.addQuery('element', 'work_notes');
    gr.addQuery('name', 'incident');
    gr.query();
    while (gr.next()) {
        if (gr.value.toString().indexOf('[STRESS TEST]') === -1) {
            count++;
        }
    }
    return count;
}

function getAgentExecutionTimes(incidentSysId) {
    var result = { count: 0, earliest_start: null, latest_end: null, all_completed: true };
    var tables = ['sn_agent_execution', 'sn_aia_execution'];
    for (var t = 0; t < tables.length; t++) {
        var gr = new GlideRecord(tables[t]);
        if (!gr.isValid()) continue;
        gr.addQuery('source_record', incidentSysId);
        gr.query();
        while (gr.next()) {
            result.count++;
            var started = gr.getValue('sys_created_on');
            var ended = gr.getValue('completed_on') || gr.getValue('sys_updated_on');
            var state = gr.getDisplayValue('state') || '';

            if (started) {
                var startGDT = new GlideDateTime(started);
                if (!result.earliest_start || startGDT.before(new GlideDateTime(result.earliest_start))) {
                    result.earliest_start = started;
                }
            }
            if (ended) {
                var endGDT = new GlideDateTime(ended);
                if (!result.latest_end || endGDT.after(new GlideDateTime(result.latest_end))) {
                    result.latest_end = ended;
                }
            }
            if (state.toLowerCase().indexOf('complete') === -1 && state.toLowerCase().indexOf('success') === -1 && state !== '') {
                result.all_completed = false;
            }
        }
        if (result.count > 0) break;
    }

    // Calculate duration in seconds
    if (result.earliest_start && result.latest_end) {
        var start = new GlideDateTime(result.earliest_start);
        var end = new GlideDateTime(result.latest_end);
        result.duration_seconds = gs.dateDiff(start.toString(), end.toString(), true);
    } else {
        result.duration_seconds = -1;
    }

    return result;
}


// ============================================================
// MAIN VALIDATION
// ============================================================
gs.info('');
gs.info('╔══════════════════════════════════════════════════════════╗');
gs.info('║  PHASE 5 VALIDATION: Volume / Performance Results       ║');
gs.info('╚══════════════════════════════════════════════════════════╝');
gs.info('');

var incidents = findTestIncidents('STRESS_TEST_P5');
var incidentKeys = [];
for (var key in incidents) {
    if (incidents.hasOwnProperty(key)) {
        incidentKeys.push(key);
    }
}
// Sort by VL number
incidentKeys.sort(function(a, b) {
    var numA = parseInt(a.replace('VL-', ''));
    var numB = parseInt(b.replace('VL-', ''));
    return numA - numB;
});

gs.info('Found ' + incidentKeys.length + '/30 Phase 5 test incidents');
if (incidentKeys.length === 0) {
    gs.info('');
    gs.info('❌ No Phase 5 incidents found. Run phase5_volume.js first.');
    gs.info('   Validator looks for incidents with correlation_display = "STRESS_TEST_P5"');
}
gs.info('');

// Metrics accumulators
var totalIncidents = incidentKeys.length;
var categoryPopulated = 0;
var servicePopulated = 0;
var ciPopulated = 0;
var miLinked = 0;
var prbLinked = 0;
var allAgentsCompleted = 0;
var executionTimes = [];
var errors = [];
var spotCheckIds = ['VL-05', 'VL-10', 'VL-15', 'VL-20', 'VL-25', 'VL-30'];

// ============================================================
// PROCESS EACH INCIDENT
// ============================================================
for (var i = 0; i < incidentKeys.length; i++) {
    var testId = incidentKeys[i];
    var actual = incidents[testId];
    var isSpotCheck = spotCheckIds.indexOf(testId) > -1;

    // Quick metrics collection
    if (actual.category) categoryPopulated++;
    if (actual.business_service) servicePopulated++;
    if (actual.cmdb_ci) ciPopulated++;
    if (actual.problem_id) prbLinked++;

    var miLink = getMILink(actual.sys_id);
    if (miLink.linked) miLinked++;

    var agentNotes = countAgentWorkNotes(actual.sys_id);
    if (agentNotes >= 3) allAgentsCompleted++;

    var execTimes = getAgentExecutionTimes(actual.sys_id);
    if (execTimes.duration_seconds > 0) {
        executionTimes.push(parseFloat(execTimes.duration_seconds));
    }

    // Quick summary line for every incident
    var status = (agentNotes >= 3) ? '✅' : ((agentNotes > 0) ? '⚠️' : '❌');
    var line = status + ' ' + testId + ' | ' + actual.number +
        ' | cat:' + (actual.category || '-') +
        ' | svc:' + (actual.business_service ? actual.business_service.substring(0, 25) : '-') +
        ' | ci:' + (actual.cmdb_ci ? actual.cmdb_ci.substring(0, 25) : '-') +
        ' | notes:' + agentNotes +
        ' | exec:' + execTimes.count +
        (execTimes.duration_seconds > 0 ? ' | ' + execTimes.duration_seconds + 's' : '');
    gs.info(line);

    if (agentNotes < 3) {
        errors.push(testId + ' (' + actual.number + '): only ' + agentNotes + ' agent notes');
    }

    // ===== SPOT CHECK (detailed review on every 5th) =====
    if (isSpotCheck) {
        gs.info('');
        gs.info('  ┌── SPOT CHECK: ' + testId + ' ──────────────────────────');
        gs.info('  │ Short Desc: ' + actual.short_description.substring(0, 80));
        gs.info('  │ Category:   ' + (actual.category || 'NULL') + ' / ' + (actual.subcategory || 'NULL'));
        gs.info('  │ Service:    ' + (actual.business_service || 'NULL'));
        gs.info('  │ Offering:   ' + (actual.service_offering || 'NULL'));
        gs.info('  │ CI:         ' + (actual.cmdb_ci || 'NULL'));
        gs.info('  │ MI Linked:  ' + (miLink.linked ? 'YES' : 'NO'));
        gs.info('  │ PRB Linked: ' + (actual.problem_display || 'NO'));
        gs.info('  │ Agent Notes: ' + agentNotes + ' | Executions: ' + execTimes.count);
        if (execTimes.duration_seconds > 0) {
            gs.info('  │ Duration:   ' + execTimes.duration_seconds + ' seconds');
        }
        gs.info('  │');
        gs.info('  │ 👁️ MANUAL REVIEW: Is the categorization correct for this description?');
        gs.info('  │    Is the service/CI appropriate? Is the MI/PRB link (or lack thereof) correct?');
        gs.info('  └──────────────────────────────────────────────');
        gs.info('');
    }
}

// ============================================================
// PERFORMANCE METRICS
// ============================================================
var avgTime = 0;
var maxTime = 0;
var minTime = 999999;
var p95Time = 0;

if (executionTimes.length > 0) {
    var sum = 0;
    for (var t = 0; t < executionTimes.length; t++) {
        sum += executionTimes[t];
        if (executionTimes[t] > maxTime) maxTime = executionTimes[t];
        if (executionTimes[t] < minTime) minTime = executionTimes[t];
    }
    avgTime = Math.round(sum / executionTimes.length);

    // P95
    executionTimes.sort(function(a, b) { return a - b; });
    var p95Index = Math.ceil(executionTimes.length * 0.95) - 1;
    p95Time = executionTimes[Math.min(p95Index, executionTimes.length - 1)];
}

// ============================================================
// SUMMARY
// ============================================================
gs.info('');
gs.info('╔══════════════════════════════════════════════════════════════╗');
gs.info('║  PHASE 5 VALIDATION SUMMARY                                 ║');
gs.info('╠══════════════════════════════════════════════════════════════╣');
gs.info('║                                                              ║');
gs.info('║  COMPLETION METRICS                                         ║');
gs.info('║  ─────────────────                                          ║');
gs.info('║  Incidents found:         ' + totalIncidents + '/30                            ║');
gs.info('║  All 3 agents completed:  ' + allAgentsCompleted + '/' + totalIncidents + ' (' + (totalIncidents > 0 ? Math.round((allAgentsCompleted/totalIncidents)*100) : 0) + '%)                      ║');
gs.info('║  Errors/incomplete:       ' + errors.length + '                                 ║');
gs.info('║                                                              ║');
gs.info('║  FIELD POPULATION RATES                                     ║');
gs.info('║  ─────────────────────                                      ║');
gs.info('║  Category populated:      ' + categoryPopulated + '/' + totalIncidents + ' (' + (totalIncidents > 0 ? Math.round((categoryPopulated/totalIncidents)*100) : 0) + '%)                      ║');
gs.info('║  Service populated:       ' + servicePopulated + '/' + totalIncidents + ' (' + (totalIncidents > 0 ? Math.round((servicePopulated/totalIncidents)*100) : 0) + '%)                      ║');
gs.info('║  CI populated:            ' + ciPopulated + '/' + totalIncidents + ' (' + (totalIncidents > 0 ? Math.round((ciPopulated/totalIncidents)*100) : 0) + '%)                      ║');
gs.info('║  MI linked:               ' + miLinked + '/' + totalIncidents + '                                 ║');
gs.info('║  Problem linked:          ' + prbLinked + '/' + totalIncidents + '                                 ║');
gs.info('║                                                              ║');
if (executionTimes.length > 0) {
gs.info('║  PERFORMANCE (from ' + executionTimes.length + ' measured executions)                ║');
gs.info('║  ──────────────────────────────────                         ║');
gs.info('║  Average execution time:  ' + avgTime + 's                              ║');
gs.info('║  Min execution time:      ' + Math.round(minTime) + 's                              ║');
gs.info('║  Max execution time:      ' + Math.round(maxTime) + 's                              ║');
gs.info('║  P95 execution time:      ' + Math.round(p95Time) + 's                              ║');
} else {
gs.info('║  PERFORMANCE: No execution time data available              ║');
gs.info('║  (sn_agent_execution table may use different field names)   ║');
}
gs.info('║                                                              ║');
gs.info('╠══════════════════════════════════════════════════════════════╣');
gs.info('║  SPOT CHECKS (every 5th — manual accuracy review needed):   ║');
for (var s = 0; s < spotCheckIds.length; s++) {
    var sid = spotCheckIds[s];
    if (incidents[sid]) {
gs.info('║    ' + sid + ': ' + incidents[sid].number + '                                    ║');
    }
}
gs.info('╠══════════════════════════════════════════════════════════════╣');
if (errors.length > 0) {
gs.info('║  ERRORS / INCOMPLETE:                                       ║');
for (var er = 0; er < errors.length; er++) {
gs.info('║    ' + errors[er].substring(0, 56) + '  ║');
}
}
gs.info('╚══════════════════════════════════════════════════════════════╝');
