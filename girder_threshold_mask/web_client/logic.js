function formatThreshold(threshold) {
    return String(Number(threshold.toFixed(1)));
}

function isClassHeatmapSource(source, kind) {
    const className = kind === 'cortex' ? /cortical|cortex/i : /medullary|medulla/i;
    const annotationName = (source || {}).name || '';
    const layer = (source || {}).layer || '';
    return /heatmap/i.test(`${annotationName} ${layer}`) && className.test(`${annotationName} ${layer}`);
}

function detectRefinedSources(sources) {
    const find = (kind) => {
        return sources.find((source) => /refined/i.test(source.name) && isClassHeatmapSource(source, kind));
    };
    const cortex = find('cortex');
    const medulla = find('medulla');
    return {cortex: cortex ? cortex.id : '', medulla: medulla ? medulla.id : ''};
}

function classHeatmapSources(sources, kind) {
    return sources.filter((source) => isClassHeatmapSource(source, kind));
}

function collectSourceElements(sources) {
    const seen = new Set();
    const elements = [];
    sources.forEach((source) => {
        if (!source || seen.has(source.id)) {
            return;
        }
        seen.add(source.id);
        (source.elements || []).forEach((element) => {
            if (Number.isFinite((element.user || {}).decision_score)) {
                elements.push(element);
            }
        });
    });
    return elements;
}

module.exports = {formatThreshold, detectRefinedSources, classHeatmapSources, collectSourceElements};
