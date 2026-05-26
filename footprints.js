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
            fullscreenButton: true,
            geocoder: false,
            homeButton: false,
            infoBox: true,
            sceneModePicker: false,
            selectionIndicator: true,
            timeline: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false
        });

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
    const toggleBoundariesBtn = document.getElementById('toggleBoundaries3D');

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

    if (toggleBoundariesBtn) {
        toggleBoundariesBtn.addEventListener('click', function() {
            const isVisible = toggleCountryBoundaries();
            toggleBoundariesBtn.textContent = `Boundaries: ${isVisible ? 'ON' : 'OFF'}`;
            toggleBoundariesBtn.classList.toggle('bg-blue-600', isVisible);
            toggleBoundariesBtn.classList.toggle('bg-gray-600', !isVisible);
            toggleBoundariesBtn.classList.toggle('hover:bg-blue-700', isVisible);
            toggleBoundariesBtn.classList.toggle('hover:bg-gray-700', !isVisible);
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
 * Calculate the geographic center (centroid) of coordinates
 */
function calculateGeometryCenter(coords) {
    if (!Array.isArray(coords) || coords.length === 0) return null;

    let latSum = 0, lonSum = 0;
    coords.forEach(coord => {
        lonSum += coord[0];
        latSum += coord[1];
    });

    return {
        longitude: lonSum / coords.length,
        latitude: latSum / coords.length
    };
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
                width: 1.5,
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
 * Add country name label at specified location
 */
function addCountryLabel(countryName, longitude, latitude) {
    if (!countryName || !cesiumViewer) return;

    try {
        const entity = cesiumViewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
            label: {
                text: countryName,
                font: '16px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                pixelOffset: new Cesium.Cartesian2(0, 0),
                disableDepthTestDistance: 0,
                scaleByDistance: new Cesium.NearFarScalar(1500000, 1.0, 30000000, 0.3)
            }
        });

        if (entity) {
            boundaryEntities.push(entity);
        }
    } catch (e) {
        console.warn('Error adding country label:', e);
    }
}

/**
 * Process GeoJSON and extract boundary lines with country names
 */
function processGeoJSON(geojson) {
    if (!geojson || !geojson.features) return 0;

    let lineCount = 0;

    geojson.features.forEach(feature => {
        if (!feature.geometry) return;

        const geometry = feature.geometry;
        const countryName = feature.properties?.name || 'Unknown';

        try {
            if (geometry.type === 'LineString') {
                drawLineFromCoordinates(geometry.coordinates);
                const center = calculateGeometryCenter(geometry.coordinates);
                if (center) {
                    addCountryLabel(countryName, center.longitude, center.latitude);
                }
                lineCount++;
            } else if (geometry.type === 'MultiLineString') {
                let allCoords = [];
                geometry.coordinates.forEach(lineCoords => {
                    drawLineFromCoordinates(lineCoords);
                    allCoords = allCoords.concat(lineCoords);
                    lineCount++;
                });
                const center = calculateGeometryCenter(allCoords);
                if (center && allCoords.length > 0) {
                    addCountryLabel(countryName, center.longitude, center.latitude);
                }
            } else if (geometry.type === 'Polygon') {
                // Draw outer ring of polygon as boundary
                if (geometry.coordinates[0]) {
                    drawLineFromCoordinates(geometry.coordinates[0]);
                    const center = calculateGeometryCenter(geometry.coordinates[0]);
                    if (center) {
                        addCountryLabel(countryName, center.longitude, center.latitude);
                    }
                    lineCount++;
                }
            } else if (geometry.type === 'MultiPolygon') {
                let allCoords = [];
                geometry.coordinates.forEach(polygon => {
                    if (polygon[0]) {
                        drawLineFromCoordinates(polygon[0]);
                        allCoords = allCoords.concat(polygon[0]);
                        lineCount++;
                    }
                });
                const center = calculateGeometryCenter(allCoords);
                if (center && allCoords.length > 0) {
                    addCountryLabel(countryName, center.longitude, center.latitude);
                }
            }
        } catch (e) {
            console.warn('Error processing feature geometry:', e);
        }
    });

    return lineCount;
}

/**
 * Load country boundaries from local GeoJSON file
 */
function loadCountryBoundaries() {
    if (!showCountryBoundaries || !cesiumViewer) return;

    // Clear existing boundaries
    boundaryEntities.forEach(entity => cesiumViewer.entities.remove(entity));
    boundaryEntities = [];

    console.log('Loading country boundaries from local file...');

    fetch('data/countries.geo.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Successfully loaded country boundaries');
            
            if (data.features) {
                const lineCount = processGeoJSON(data);
                console.log(`✓ Loaded ${lineCount} country boundary lines`);
            } else {
                throw new Error('No features found in GeoJSON');
            }
        })
        .catch(error => {
            console.error('Error loading country boundaries:', error);
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

function addVisitedCityMarkers() {
    if (!cesiumViewer || visitedCities.length === 0) {
        return;
    }

    clearVisitedCityMarkers();

    visitedCities.forEach(city => {
        const entity = cesiumViewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(city.longitude, city.latitude, 0),
            point: {
                pixelSize: 8,
                color: Cesium.Color.fromCssColorString('#1a73e8'),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE
            },
            label: {
                text: city.name,
                font: '12px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, 12),
                disableDepthTestDistance: 0,
                scaleByDistance: new Cesium.NearFarScalar(1500000, 1.0, 12000000, 0.6)
            },
            description: `<p><strong>${city.name}</strong></p><p>Latitude: ${city.latitude.toFixed(4)}°</p><p>Longitude: ${city.longitude.toFixed(4)}°</p>`
        });

        visitedCityEntities.push(entity);
    });
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