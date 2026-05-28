// CesiumJS 3D Footprints Map
let cesiumViewer = null;
let cesiumInitialized = false;
let visitedCityEntities = [];
let visitedCities = [];
let boundaryEntities = [];
let showCountryBoundaries = true;

// Set Cesium Ion Access Token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZTc2Yzg3Ny0xZDEzLTRhMjItYTc1MS03MGU1Mjk5ZDY2YTMiLCJpZCI6NDM0NjI5LCJzdWIiOiJQaWNjYWJvbyIsImlzcyI6Imh0dHBzOi8vaW9uLmNlc2l1bS5jb20iLCJhdWQiOiJNeVRva2VuIiwiaWF0IjoxNzc5MzY1Mjk4fQ.mpN9JH1ltXPounHE-42giykKbFgvFgoMkDncCEhYCok';

function initCesiumMap() {
    if (cesiumInitialized) {
        return;
    }

    try {
        cesiumViewer = new Cesium.Viewer('cesiumContainer', {
            animation: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: true,
            sceneModePicker: false,
            selectionIndicator: true,
            timeline: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false
        });

        // Hide credit information
        cesiumViewer.creditDisplay.container.style.display = 'none';

        cesiumViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(104.1954, 35.8617, 20000000),
            duration: 1.5
        });

        setupControlButtons();
        loadCountryBoundaries();
        loadVisitedCitiesFromJson();

        cesiumInitialized = true;
    } catch (error) {
        console.error('Error initializing Cesium map:', error);
    }
}

function setupControlButtons() {
    const resetViewBtn = document.getElementById('resetView3D');

    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', function() {
            if (!cesiumViewer) {
                return;
            }

            cesiumViewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(104.1954, 35.8617, 20000000),
                duration: 1.5
            });
        });
    }
}

function clearVisitedCityMarkers() {
    if (!cesiumViewer || visitedCityEntities.length === 0) {
        return;
    }

    visitedCityEntities.forEach(entity => {
        cesiumViewer.entities.remove(entity);
    });

    visitedCityEntities = [];
}

/**
 * Draw line segments from array of coordinates
 */
function drawLineFromCoordinates(coords) {
    if (!Array.isArray(coords) || coords.length < 2) return;

    const positions = coords.map(coord => 
        Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
    );

    try {
        const entity = cesiumViewer.entities.add({
            polyline: {
                positions: positions,
                width: 2,
                material: Cesium.Color.WHITE,
                clampToGround: true,
                arcType: Cesium.ArcType.GEODESIC
            }
        });

        if (entity) {
            boundaryEntities.push(entity);
        }
    } catch (e) {
        console.warn('Error drawing line:', e);
    }
}

/**
 * Load country boundaries from local Natural Earth boundaries lines data
 */
function loadCountryBoundaries() {
    if (!showCountryBoundaries || !cesiumViewer) return;

    // Clear existing boundaries
    boundaryEntities.forEach(entity => cesiumViewer.entities.remove(entity));
    boundaryEntities = [];

    console.log('Loading country boundary lines from local file...');

    // Use boundaries lines (international borders only)
    fetch('data/boundary_lines_50m.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Successfully loaded country boundary lines');
            
            if (data.features) {
                let lineCount = 0;
                // Each feature in this dataset is a boundary LINE (not polygon)
                data.features.forEach(feature => {
                    if (feature.geometry && feature.geometry.type === 'LineString') {
                        drawLineFromCoordinates(feature.geometry.coordinates);
                        lineCount++;
                    } else if (feature.geometry && feature.geometry.type === 'MultiLineString') {
                        feature.geometry.coordinates.forEach(coords => {
                            drawLineFromCoordinates(coords);
                            lineCount++;
                        });
                    }
                });
                console.log(`✓ Loaded ${lineCount} international boundary lines`);
            } else {
                throw new Error('No features found in GeoJSON');
            }
        })
        .catch(error => {
            console.error('Error loading boundary lines from local file:', error);
        });
}

/**
 * Toggle country boundaries visibility
 */
function toggleCountryBoundaries() {
    showCountryBoundaries = !showCountryBoundaries;

    if (showCountryBoundaries) {
        loadCountryBoundaries();
    } else {
        boundaryEntities.forEach(entity => cesiumViewer.entities.remove(entity));
        boundaryEntities = [];
    }

    console.log(`Country boundaries: ${showCountryBoundaries ? 'ON' : 'OFF'}`);
    return showCountryBoundaries;
}

function updateCityLabelFontSize() {
    if (!cesiumViewer || visitedCityEntities.length === 0) return;

    const camera = cesiumViewer.camera;
    const height = Cesium.Cartesian3.distance(camera.position, cesiumViewer.scene.globe.ellipsoid.cartographicToCartesian(Cesium.Cartographic.ZERO));
    
    // 根据相机距离计算字体大小
    // 放大时（靠近）字体缩小，缩小时（远离）字体放大
    let fontSize = 12;
    let pixelOffset = 12;
    
    if (height < 2000000) {
        fontSize = 9;       // 放大时字体缩小（靠得近，不需要太大）
        pixelOffset = 9;
    } else if (height < 5000000) {
        fontSize = 10;
        pixelOffset = 10;
    } else if (height < 12000000) {
        fontSize = 12;
        pixelOffset = 11;
    } else if (height < 20000000) {
        fontSize = 14;
        pixelOffset = 12;
    } else {
        fontSize = 16;      // 缩小时字体放大（距离远，需要更大才能看清）
        pixelOffset = 13;
    }
    
    visitedCityEntities.forEach(entity => {
        if (entity.label) {
            entity.label.font = fontSize + 'px sans-serif';
            entity.label.pixelOffset = new Cesium.Cartesian2(0, pixelOffset);
        }
    });
}

function addVisitedCityMarkers() {
    if (!cesiumViewer || visitedCities.length === 0) {
        return;
    }

    clearVisitedCityMarkers();

    visitedCities.forEach(city => {
        const entity = cesiumViewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(city.longitude, city.latitude, 0),
            billboard: {
                image: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                heightReference: Cesium.HeightReference.NONE,
                scale: 0.25
            },
            label: {
                text: city.name,
                font: '12px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.TOP,
                pixelOffset: new Cesium.Cartesian2(0, 25),
                disableDepthTestDistance: 0,
                scaleByDistance: new Cesium.NearFarScalar(1000000, 1.0, 25000000, 0.4)
            },
            description: `<p><strong>${city.name}</strong></p><p>Latitude: ${city.latitude.toFixed(4)}°</p><p>Longitude: ${city.longitude.toFixed(4)}°</p>`
        });

        visitedCityEntities.push(entity);
    });
    
    // 初始化一次字体大小
    updateCityLabelFontSize();
}

function loadVisitedCitiesFromJson() {
    fetch('data/visited-cities.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load visited cities JSON: ${response.status}`);
            }

            return response.json();
        })
        .then(data => {
            visitedCities = data.cities || [];
            addVisitedCityMarkers();
        })
        .catch(error => console.error('Error loading visited cities JSON:', error));
}



document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function() {
        const footprintsSection = document.getElementById('footprints');
        if (footprintsSection && footprintsSection.style.display !== 'none') {
            if (!cesiumInitialized) {
                initCesiumMap();
            } else if (cesiumViewer) {
                setTimeout(() => {
                    cesiumViewer.resize();
                }, 100);
            }
        }
    });

    const config = { attributes: true, attributeFilter: ['style'], subtree: true };
    const footprintsSection = document.getElementById('footprints');
    if (footprintsSection) {
        observer.observe(footprintsSection, config);
    }

    document.querySelectorAll('.page').forEach(page => {
        observer.observe(page, config);
    });
});

window.addEventListener('resize', function() {
    if (cesiumInitialized && cesiumViewer) {
        cesiumViewer.resize();
    }
});

// 监听相机移动，动态调整城市标签字体大小
if (typeof Cesium !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        let updateTimer = null;
        if (cesiumViewer && cesiumViewer.camera) {
            cesiumViewer.camera.moveEnd.addEventListener(function() {
                // 防抖处理，避免频繁更新
                clearTimeout(updateTimer);
                updateTimer = setTimeout(function() {
                    updateCityLabelFontSize();
                }, 100);
            });
        }
    });
}