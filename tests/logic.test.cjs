const assert = require('node:assert/strict');
const {test} = require('node:test');

const logic = require('../girder_threshold_mask/web_client/logic');

test('auto-detects refined cortex and medulla heatmaps independently', () => {
    assert.deepEqual(logic.detectHeatmapSources([
        {id: 'old', name: 'cortical heatmap'},
        {id: 'medulla', name: 'Medullary Refined Heatmap'},
        {id: 'cortex', name: 'Cortical Refined Heatmap'}
    ]), {cortex: 'cortex', medulla: 'medulla'});
    assert.deepEqual(logic.detectHeatmapSources([
        {id: 'cortex', name: 'Cortical Refined Heatmap'}
    ]), {cortex: 'cortex', medulla: ''});
});

test('auto-detects ordinary cortical and medullary heatmaps when refined maps are absent', () => {
    assert.deepEqual(logic.detectHeatmapSources([
        {id: 'cortex', name: 'Cortical Heatmap'},
        {id: 'medulla', name: 'Medullary Heatmap'},
        {id: 'other', name: 'Nuclei Heatmap'}
    ]), {cortex: 'cortex', medulla: 'medulla'});
});

test('keeps only scored geometry and deduplicates a source selected in both roles', () => {
    const scored = {type: 'rectangle', user: {decision_score: 0.25}};
    const unscored = {type: 'rectangle', user: {decision_score: '0.4'}};
    assert.deepEqual(logic.collectSourceElements([
        {id: 'same', elements: [scored, unscored]},
        {id: 'same', elements: [scored]}
    ]), [scored]);
});

test('formats threshold values consistently in saved contour names', () => {
    assert.equal(logic.formatThreshold(0), '0');
    assert.equal(logic.formatThreshold(-1.2), '-1.2');
    assert.equal(logic.formatThreshold(2.3000001), '2.3');
});

test('converts color picker values to RGB channels', () => {
    assert.deepEqual(logic.colorRgb('#0000ff'), [0, 0, 255]);
    assert.deepEqual(logic.colorRgb('#ffa500'), [255, 165, 0]);
    assert.equal(logic.colorRgb('invalid'), null);
});
