// --- 1. Config & Constants ---
const DISTRICT_KEY = 'ADM2_TH';
const PROVINCE_KEY = 'ADM1_TH';
const SAVED_SELECTIONS_KEY = 'amphoeSelections';
const LABEL_SETTINGS_KEY = 'mapLabelSettings';
const MIN_ZOOM_FOR_LABELS = 8; 

// --- 2. Global State ---
let selections = {};
let geoJsonLayer = null;
let labelUpdateTimeout = null;
const provinceToRegionMap = new Map(); 
const provinceDistrictTotalMap = new Map(); 

// --- 3. Styles & Mappings ---
const provinceStyle = { weight: 3, color: '#334155', opacity: 1, fillOpacity: 0, interactive: false };
const selectedStyle = { weight: 1, opacity: 1, color: '#ffffff', fillOpacity: 0.8, fillColor: '#ef4444' }; 
const hoverStyle = { weight: 2, color: '#94a3b8', fillOpacity: 0.7, fillColor: '#facc15' };

const regionColorMap = { 'North': '#10b981', 'Northeast': '#f59e0b', 'Central': '#3b82f6', 'South': '#f97316', 'Vicinity': '#6366f1' };

// *** เพิ่มตัวที่ขาดไปกลับมาแล้วครับ ***
const regionPcodeMap = { '1': 'Central', '2': 'Central', '7': 'Central', '3': 'Northeast', '4': 'Northeast', '5': 'North', '6': 'North', '8': 'South', '9': 'South' };

const vicinitySet = new Set(['กรุงเทพมหานคร', 'สมุทรปราการ', 'นนทบุรี', 'ปทุมธานี', 'นครปฐม', 'สมุทรสาคร']);

// --- 4. Map Initialization ---
const map = L.map('map', { 
    zoomControl: false,
    preferCanvas: true,
    wheelDebounceTime: 150,
    wheelPxPerZoomLevel: 120
}).setView([13.75, 100.5], 6);

const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { 
    attribution: 'OSM, CARTO',
    updateWhenIdle: true,
    keepBuffer: 2
}).addTo(map);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// --- 5. Control Panel (Top Right) ---
const toggleControl = L.control({ position: 'topright' });
toggleControl.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'leaflet-bar');
    div.className = '!bg-white/95 !backdrop-blur-sm !p-4 !rounded-xl !shadow-lg !border !border-slate-200 !text-slate-700 !min-w-[200px]';
    
    let html = '<h4 class="font-bold text-sm mb-2 text-slate-800">แสดงชื่ออำเภอ</h4>';
    html += '<div class="space-y-1 mb-4 border-b border-slate-100 pb-3">';
    const regions = [['North', 'ภาคเหนือ'], ['Northeast', 'ภาคอีสาน'], ['Central', 'ภาคกลาง'], ['South', 'ภาคใต้']];
    
    regions.forEach(([key, name]) => {
        const color = regionColorMap[key];
        html += `
            <div class="flex items-center cursor-pointer hover:bg-slate-50 p-1 rounded">
                <input type="checkbox" id="toggle-${key}" data-region="${key}" checked class="w-4 h-4 accent-blue-600 cursor-pointer">
                <label for="toggle-${key}" class="ml-2 text-xs cursor-pointer flex-grow text-slate-600 select-none">
                    <span class="inline-block w-2 h-2 rounded-full mr-1" style="background-color: ${color}"></span>
                    ${name}
                </label>
            </div>`;
    });
    html += '</div>';

    html += '<h4 class="font-bold text-sm mb-2 text-slate-800">ปรับแต่งตัวอักษร</h4>';
    html += '<div class="space-y-3">';
    
    html += `
        <div class="flex justify-between items-center">
            <label class="text-xs text-slate-500 font-medium">ขนาด:</label>
            <select id="map-font-size" class="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50 focus:ring-1 focus:ring-blue-500 outline-none w-24">
                <option value="10px">เล็กมาก</option>
                <option value="12px" selected>ปกติ</option>
                <option value="14px">ใหญ่</option>
                <option value="16px">ใหญ่มาก</option>
                <option value="20px">ใหญ่พิเศษ</option>
            </select>
        </div>
    `;

    html += `
        <div class="flex justify-between items-center">
            <label class="text-xs text-slate-500 font-medium">สีข้อความ:</label>
            <div class="flex items-center gap-2">
                <input type="color" id="map-font-color" value="#334155" class="w-8 h-6 p-0 border border-slate-200 rounded cursor-pointer">
            </div>
        </div>
    `;
    html += '</div>';

    div.innerHTML = html;
    L.DomEvent.disableClickPropagation(div);
    return div;
};
toggleControl.addTo(map);

// --- 6. Label Style Logic ---
const dynamicStyleTag = document.getElementById('dynamic-label-style');

function updateMapLabelStyle(size, color) {
    dynamicStyleTag.innerHTML = `
        .district-label {
            font-size: ${size} !important;
            color: ${color} !important;
        }
    `;
    localStorage.setItem(LABEL_SETTINGS_KEY, JSON.stringify({ size, color }));
}

setTimeout(() => {
    const sizeSelect = document.getElementById('map-font-size');
    const colorInput = document.getElementById('map-font-color');

    if(sizeSelect) {
        sizeSelect.addEventListener('change', (e) => updateMapLabelStyle(e.target.value, colorInput.value));
    }
    if(colorInput) {
        colorInput.addEventListener('input', (e) => updateMapLabelStyle(sizeSelect.value, e.target.value));
    }

    const savedSettings = localStorage.getItem(LABEL_SETTINGS_KEY);
    if (savedSettings) {
        const { size, color } = JSON.parse(savedSettings);
        if(size && sizeSelect) sizeSelect.value = size;
        if(color && colorInput) colorInput.value = color;
        updateMapLabelStyle(size || '12px', color || '#334155');
    }

    ['North', 'Northeast', 'Central', 'South'].forEach(r => {
        const el = document.getElementById(`toggle-${r}`);
        if(el) el.addEventListener('change', debouncedLabelUpdate);
    });

}, 100);

// --- 7. Map Interaction Logic ---
function getDefaultAmphoeStyle(feature) {
    const region = feature.properties._region;
    const fillColor = region ? (regionColorMap[region] || '#e2e8f0') : '#e2e8f0';
    return { weight: 1, opacity: 1, color: '#ffffff', fillOpacity: 0.5, fillColor: fillColor };
}

function onFeatureClick(e) {
    const layer = e.target;
    const props = layer.feature.properties;
    const dName = props[DISTRICT_KEY];
    const pName = props[PROVINCE_KEY];

    if (e.originalEvent.shiftKey) {
        const total = provinceDistrictTotalMap.get(pName);
        const selectedCount = selections[pName] ? selections[pName].size : 0;
        setProvinceSelection(pName, selectedCount < total);
        return;
    }

    if (!dName || !pName) return;
    if (!selections[pName]) selections[pName] = new Set();

    if (selections[pName].has(dName)) {
        selections[pName].delete(dName);
        if (selections[pName].size === 0) delete selections[pName];
        layer.setStyle(hoverStyle);
    } else {
        selections[pName].add(dName);
        layer.setStyle(selectedStyle);
    }
    
    updateOutputText();
    saveSelections();
}

function onFeatureMouseOver(e) {
    const layer = e.target;
    const props = layer.feature.properties;
    const pName = props[PROVINCE_KEY];
    const dName = props[DISTRICT_KEY];
    if (!selections[pName] || !selections[pName].has(dName)) {
        layer.setStyle(hoverStyle);
        if (!L.Browser.ie) layer.bringToFront();
    }
}

function onFeatureMouseOut(e) {
    const layer = e.target;
    const props = layer.feature.properties;
    const pName = props[PROVINCE_KEY];
    const dName = props[DISTRICT_KEY];
    if (selections[pName] && selections[pName].has(dName)) {
        layer.setStyle(selectedStyle);
    } else {
        geoJsonLayer.resetStyle(layer); 
    }
}

// --- 8. Optimized Label System ---
function updateLabelsVisibility() {
    if (!geoJsonLayer) return;
    
    const currentZoom = map.getZoom();
    const isZoomedIn = (currentZoom >= MIN_ZOOM_FOR_LABELS);
    const bounds = map.getBounds();

    const enabledRegions = new Set();
    ['North', 'Northeast', 'Central', 'South'].forEach(r => {
        if (document.getElementById(`toggle-${r}`)?.checked) enabledRegions.add(r);
    });

    geoJsonLayer.eachLayer(function(layer) {
        const props = layer.feature.properties;
        const layerRegion = props._region;
        
        let shouldShow = isZoomedIn && enabledRegions.has(layerRegion);
        if (layerRegion === 'Vicinity' && enabledRegions.has('Central') && isZoomedIn) shouldShow = true;
        
        if (shouldShow) {
            const center = layer.getBounds().getCenter();
            if (!bounds.contains(center)) shouldShow = false;
        }

        if (shouldShow) {
            if (!layer.getTooltip()) {
                    let districtName = props[DISTRICT_KEY];
                    if (districtName === 'ป้อมปราบศัตรูพ่า') districtName = 'ป้อมปราบศัตรูพ่าย';
                    layer.bindTooltip(districtName, { 
                    permanent: true, 
                    direction: 'center', 
                    className: 'district-label',
                    interactive: false 
                });
            }
        } else {
            if (layer.getTooltip()) layer.unbindTooltip();
        }
    });
}

function debouncedLabelUpdate() {
    if (labelUpdateTimeout) clearTimeout(labelUpdateTimeout);
    labelUpdateTimeout = setTimeout(updateLabelsVisibility, 200);
}

// --- 9. Load Data ---
function setProvinceSelection(provinceName, select) {
    if (!geoJsonLayer) return;
    if (select) {
        if (!selections[provinceName]) selections[provinceName] = new Set();
        geoJsonLayer.eachLayer(layer => {
            if (layer.feature.properties[PROVINCE_KEY] === provinceName) {
                selections[provinceName].add(layer.feature.properties[DISTRICT_KEY]);
                layer.setStyle(selectedStyle);
            }
        });
    } else {
        delete selections[provinceName];
        geoJsonLayer.eachLayer(layer => {
            if (layer.feature.properties[PROVINCE_KEY] === provinceName) geoJsonLayer.resetStyle(layer);
        });
    }
    updateOutputText();
    saveSelections();
}

function saveSelections() {
    const dataToSave = {};
    for (const [province, districtSet] of Object.entries(selections)) {
        dataToSave[province] = Array.from(districtSet);
    }
    localStorage.setItem(SAVED_SELECTIONS_KEY, JSON.stringify(dataToSave));
}

function loadSelections() {
    const savedString = localStorage.getItem(SAVED_SELECTIONS_KEY);
    if (savedString) {
        const savedData = JSON.parse(savedString);
        selections = {};
        for (const [province, districtArray] of Object.entries(savedData)) {
            selections[province] = new Set(districtArray);
        }
    }
}

const loadingOverlay = document.getElementById('loading-overlay');
loadSelections();

Promise.all([
    fetch('thailand_province_amphoe.json').then(res => res.json()),
    fetch('province_simplify.json').then(res => res.json())
]).then(([districtData, provinceData]) => {
    loadingOverlay.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => loadingOverlay.style.display = 'none', 500);

    const districtObjectName = Object.keys(districtData.objects)[0];
    let districtGeoData = topojson.feature(districtData, districtData.objects[districtObjectName]);
    districtData = null; 

    districtGeoData.features.forEach(feature => {
        const props = feature.properties;
        const provinceName = props[PROVINCE_KEY];
        const pcode = props.ADM1_PCODE;
        
        let region = 'Central';
        if (provinceName && pcode) {
            if (vicinitySet.has(provinceName)) region = 'Vicinity';
            else region = regionPcodeMap[pcode.substring(2, 3)] || 'Central';
        }
        feature.properties._region = region;
        if (!provinceToRegionMap.has(provinceName)) provinceToRegionMap.set(provinceName, region);
        if (provinceName && props[DISTRICT_KEY]) {
            const currentTotal = provinceDistrictTotalMap.get(provinceName) || 0;
            provinceDistrictTotalMap.set(provinceName, currentTotal + 1);
        }
    });

    geoJsonLayer = L.geoJSON(districtGeoData, {
        style: getDefaultAmphoeStyle,
        onEachFeature: (feature, layer) => {
            layer.on({ mouseover: onFeatureMouseOver, mouseout: onFeatureMouseOut, click: onFeatureClick });
        },
        smoothFactor: 1.5
    }).addTo(map);

    districtGeoData = null;

    const provinceObjectName = Object.keys(provinceData.objects)[0];
    let provinceGeoData = topojson.feature(provinceData, provinceData.objects[provinceObjectName]);
    provinceData = null;

    const provinceLayer = L.geoJSON(provinceGeoData, { style: provinceStyle });
    provinceGeoData = null;
    
    L.control.layers(
        { "มินิมอล": cartoLight }, 
        { "<span class='text-slate-700 font-medium'>ขอบเขตจังหวัด</span>": provinceLayer }, 
        { position: 'topleft' }
    ).addTo(map);
    provinceLayer.addTo(map);
    
    geoJsonLayer.eachLayer(layer => {
        const { [PROVINCE_KEY]: pName, [DISTRICT_KEY]: dName } = layer.feature.properties;
        if (selections[pName] && selections[pName].has(dName)) layer.setStyle(selectedStyle);
    });
    
    updateOutputText();
    map.on('zoomend', debouncedLabelUpdate);
    map.on('moveend', debouncedLabelUpdate);
    debouncedLabelUpdate();

}).catch(error => {
    console.error(error);
    loadingOverlay.innerHTML = '<div class="text-red-500 font-bold text-center p-4 bg-white rounded-lg shadow-xl">โหลดข้อมูลไม่สำเร็จ<br>กรุณารีเฟรชหน้าเว็บ หรือตรวจสอบการรันผ่าน Live Server</div>';
});

function updateOutputText() {
    const outputElement = document.getElementById('output');
    const emptyState = document.getElementById('empty-state');
    let outputText = "";
    
    const sortedProvinces = Object.keys(selections).sort((a, b) => {
        const regionSort = { 'Vicinity': 1, 'North': 2, 'Northeast': 3, 'Central': 4, 'South': 5 };
        const regionA = provinceToRegionMap.get(a) || 'Central';
        const regionB = provinceToRegionMap.get(b) || 'Central';
        const rA = regionSort[regionA] || 99;
        const rB = regionSort[regionB] || 99;
        return rA !== rB ? rA - rB : a.localeCompare(b, 'th');
    });

    if (sortedProvinces.length === 0) {
        outputElement.textContent = "";
        outputElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    } else {
        outputElement.classList.remove('hidden');
        emptyState.classList.add('hidden');
    }

    for (const province of sortedProvinces) {
        const selectedDistricts = selections[province];
        const totalCount = provinceDistrictTotalMap.get(province);
        let districtsText = ""; 
        if (selectedDistricts.size === totalCount && totalCount > 0) {
            districtsText = "ทุกอำเภอ";
        } else {
            let prefix = province === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.';
            districtsText = Array.from(selectedDistricts).map(dName => {
                let cleanName = dName.trim();
                if (cleanName === 'ป้อมปราบศัตรูพ่า') cleanName = 'ป้อมปราบศัตรูพ่าย';
                const nonCapitalMueang = new Set(['เมืองจันทร์', 'เมืองปาน', 'เมืองยาง', 'เมืองสรวง']);
                let isCapital = false;
                if (province !== 'กรุงเทพมหานคร') {
                    if (cleanName === province.trim()) isCapital = true;
                    else if (cleanName.startsWith('เมือง') && !nonCapitalMueang.has(cleanName)) isCapital = true;
                }
                return isCapital ? `${prefix}เมืองฯ` : `${prefix}${cleanName}`;
            }).sort((a, b) => a.localeCompare(b, 'th')).join(' ');
        }
        let provinceLabel = province === 'กรุงเทพมหานคร' ? province : `จ.${province}`;
        outputText += `- ${provinceLabel} (${districtsText})\n`;
    }
    outputElement.textContent = outputText;
}

document.getElementById('reset-btn').addEventListener('click', function() {
    selections = {};
    updateOutputText();
    localStorage.removeItem(SAVED_SELECTIONS_KEY);
    if (geoJsonLayer) geoJsonLayer.eachLayer(l => geoJsonLayer.resetStyle(l));
    debouncedLabelUpdate();
});

document.getElementById('copy-btn').addEventListener('click', function() {
    const textToCopy = document.getElementById('output').textContent;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.getElementById('copy-btn');
        const txt = document.getElementById('copy-text');
        const originalText = txt.textContent;
        txt.textContent = 'คัดลอกแล้ว!';
        btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
        btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        setTimeout(() => {
            txt.textContent = originalText;
            btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        }, 2000);
    });
});