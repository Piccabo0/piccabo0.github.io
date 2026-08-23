// CesiumJS 3D Footprints Map
let cesiumViewer = null;
let cesiumInitialized = false;
let cesiumInitializing = false;
let visitedCityEntities = [];
let visitedCities = [];
let boundaryEntities = [];
let showCountryBoundaries = true;
let provinceBoundaryEntities = [];
let countryBoundaryDataSource = null;
let provinceBoundaryDataSource = null;
let labelLayer = null;
let showBackgroundLabels = true;

// Add variables for visited provinces overlay
let visitedProvinceDataSource = null;
let showVisitedProvinces = false;

// Add variables for visited countries overlay
let visitedCountryDataSource = null;
let showVisitedCountries = false;

// Add variables for personal flight routes overlay
let flightRouteEntities = [];
let showFlightRoutes = false;
let flightRoutesLoaded = false;
let flightRoutesLoading = false;
let flightRouteArrowImage = null;

// Add variable for sidebar collapsed state
let flagsSidebarCollapsed = true;

const FOOTPRINT_BUTTON_DEFAULT_BG = '#334155';
const FOOTPRINT_BUTTON_ACTIVE_BG = '#2563eb';

// Country code mapping for flag-icons library
const COUNTRY_CODE_MAP = {
    'China': 'cn',
    'Singapore': 'sg',
    'Malaysia': 'my',
    'Vietnam': 'vn',
    'Japan': 'jp',
    'Azerbaijan': 'az',
    'Kazakhstan': 'kz',
    'Australia': 'au'
};

const CESIUM_SCRIPT_SOURCES = [
    'https://cdn.jsdelivr.net/npm/cesium/Build/Cesium/Cesium.js'
];

let cesiumLoadPromise = null;

function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve(src);
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

function ensureCesiumLibrary() {
    if (typeof Cesium !== 'undefined') {
        return Promise.resolve(true);
    }

    window.CESIUM_BASE_URL = 'https://cdn.jsdelivr.net/npm/cesium/Build/Cesium/';

    if (!cesiumLoadPromise) {
        cesiumLoadPromise = (async () => {
            for (const src of CESIUM_SCRIPT_SOURCES) {
                try {
                    await loadExternalScript(src);
                    if (typeof Cesium !== 'undefined') {
                        return true;
                    }
                } catch (error) {
                    console.warn(error.message);
                }
            }
            return typeof Cesium !== 'undefined';
        })();
    }

    return cesiumLoadPromise;
}

async function initCesiumMap() {
    if (cesiumInitialized || cesiumInitializing) {
        return;
    }

    cesiumInitializing = true;

    try {
        const cesiumReady = await ensureCesiumLibrary();
        if (!cesiumReady) {
            console.error('Cesium library is unavailable. Check the CDN connection or add a local Cesium build.');
            return;
        }

        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZTc2Yzg3Ny0xZDEzLTRhMjItYTc1MS03MGU1Mjk5ZDY2YTMiLCJpZCI6NDM0NjI5LCJzdWIiOiJQaWNjYWJvbyIsImlzcyI6Imh0dHBzOi8vaW9uLmNlc2l1bS5jb20iLCJhdWQiOiJNeVRva2VuIiwiaWF0IjoxNzc5MzY1Mjk4fQ.mpN9JH1ltXPounHE-42giykKbFgvFgoMkDncCEhYCok';

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
            navigationInstructionsInitiallyVisible: false,
        });

        // Hide credit information
        cesiumViewer.creditDisplay.container.style.display = 'none';

        // Fix blur issue on high-DPI screens by matching device pixel ratio
        cesiumViewer.resolutionScale = window.devicePixelRatio;

        // 寮€鍚姉閿娇
        cesiumViewer.scene.postProcessStages.fxaa.enabled = true;

        // 鍏抽棴鐜杩烽浘锛屾彁鍗囬€氶€忓害
        cesiumViewer.scene.globe.showGroundAtmosphere = true;

        cesiumViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(104.1954, 35.8617, 20000000),
            duration: 1.5
        });

        setupControlButtons();
        loadCountryBoundaries();
        loadProvinceBoundaries();
        loadVisitedCitiesFromJson();
        loadBackgroundLabelLayer();
        loadVisitedCountriesFlags();
        adjustMouseWheelZoomSpeed();

        cesiumInitialized = true;
    } catch (error) {
        console.error('Error initializing Cesium map:', error);
    } finally {
        cesiumInitializing = false;
    }
}

/**
 * Load background label layer (transparent text labels layer)
 * Uses Google Maps label layer (lyrs=h) which contains only labels and roads
 */
function loadBackgroundLabelLayer() {
    if (!cesiumViewer) return;

    console.log('Loading background label layer...');

    try {
        const labelLayerProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://mt1.google.com/vt/lyrs=h&hl=en&x={x}&y={y}&z={z}',
            maximumLevel: 21
        });

        labelLayer = cesiumViewer.imageryLayers.addImageryProvider(labelLayerProvider);
        labelLayer.show = showBackgroundLabels;
        
        console.log('鉁?Background label layer loaded');
    } catch (error) {
        console.error('Error loading background label layer:', error);
    }
}

/**
 * Toggle background labels visibility
 */
function toggleBackgroundLabels() {
    showBackgroundLabels = !showBackgroundLabels;

    if (labelLayer) {
        labelLayer.show = showBackgroundLabels;
    }

    console.log(`Background labels: ${showBackgroundLabels ? 'ON' : 'OFF'}`);
    return showBackgroundLabels;
}

/**
 * Adjust mouse wheel zoom speed to be less aggressive
 */
function adjustMouseWheelZoomSpeed() {
    if (!cesiumViewer) return;

    try {
        // Set zoom sensitivity - smaller value means slower zoom
        // Default is around 1.0
        cesiumViewer.scene.screenSpaceCameraController.zoomFactor = 2.0;
        
        console.log('鉁?Mouse wheel zoom speed adjusted');
    } catch (error) {
        console.error('Error adjusting zoom speed:', error);
    }
}

function setupControlButtons() {
    // Setup toggle sidebar button
    const toggleSidebarBtn = document.getElementById('toggleFlagsSidebar');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function() {
            toggleFlagsSidebar();
        });
    }

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

    // Create or get button container
    let btnContainer = document.getElementById('footprintsBtnContainer');
    if (btnContainer) {
        // Create toggle button for visited provinces with symbol
        let toggleProvincesBtn = document.getElementById('toggleVisitedProvincesBtn');
        if (!toggleProvincesBtn) {
            toggleProvincesBtn = document.createElement('button');
            toggleProvincesBtn.id = 'toggleVisitedProvincesBtn';
            toggleProvincesBtn.type = 'button';
            toggleProvincesBtn.title = 'Show/Hide Visited Provinces';
            toggleProvincesBtn.innerText = '🗺️';
            Object.assign(toggleProvincesBtn.style, {
                padding: '8px 10px',
                background: FOOTPRINT_BUTTON_DEFAULT_BG,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                fontSize: '18px',
                transition: 'background-color 0.2s'
            });
            btnContainer.appendChild(toggleProvincesBtn);
        }

        toggleProvincesBtn.addEventListener('click', function() {
            toggleVisitedProvinces();
        });

        // Create toggle button for visited countries with symbol
        let toggleCountriesBtn = document.getElementById('toggleVisitedCountriesBtn');
        if (!toggleCountriesBtn) {
            toggleCountriesBtn = document.createElement('button');
            toggleCountriesBtn.id = 'toggleVisitedCountriesBtn';
            toggleCountriesBtn.type = 'button';
            toggleCountriesBtn.title = 'Show/Hide Visited Countries';
            toggleCountriesBtn.innerText = '🌍';
            Object.assign(toggleCountriesBtn.style, {
                padding: '8px 10px',
                background: FOOTPRINT_BUTTON_DEFAULT_BG,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                fontSize: '18px',
                transition: 'background-color 0.2s'
            });
            btnContainer.appendChild(toggleCountriesBtn);
        }

        toggleCountriesBtn.addEventListener('click', function() {
            toggleVisitedCountries();
        });

        // Create toggle button for personal flight routes
        let toggleFlightsBtn = document.getElementById('toggleFlightRoutesBtn');
        if (!toggleFlightsBtn) {
            toggleFlightsBtn = document.createElement('button');
            toggleFlightsBtn.id = 'toggleFlightRoutesBtn';
            toggleFlightsBtn.type = 'button';
            toggleFlightsBtn.title = 'Show/Hide Flight Routes';
            toggleFlightsBtn.innerText = '✈';
            Object.assign(toggleFlightsBtn.style, {
                padding: '8px 10px',
                background: FOOTPRINT_BUTTON_DEFAULT_BG,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                fontSize: '18px',
                transition: 'background-color 0.2s'
            });
            btnContainer.appendChild(toggleFlightsBtn);
        }

        toggleFlightsBtn.addEventListener('click', function() {
            toggleFlightRoutes();
        });
    }
}

function setFootprintsButtonActive(buttonId, isActive, activeColor) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.background = isActive ? activeColor : FOOTPRINT_BUTTON_DEFAULT_BG;
    }
}

function parsePossiblyDirtyJson(text) {
    return JSON.parse(text.replace(/\bNaN\b/g, 'null'));
}

function fetchPossiblyDirtyJson(url) {
    return fetch(url).then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }

        return response.text();
    }).then(parsePossiblyDirtyJson);
}

function buildAirportIataIndex(airportsInfo) {
    const index = new Map();
    Object.values(airportsInfo || {}).forEach(airport => {
        const iata = typeof airport.iata === 'string' ? airport.iata.trim().toUpperCase() : '';
        const lat = Number(airport.lat);
        const lon = Number(airport.lon);

        if (iata && Number.isFinite(lat) && Number.isFinite(lon) && !index.has(iata)) {
            index.set(iata, {
                iata,
                lat,
                lon,
                name: airport.name || iata,
                city: airport.city || '',
                country: airport.country || ''
            });
        }
    });

    return index;
}

function getAirportByIata(index, code) {
    if (typeof code !== 'string') {
        return null;
    }

    return index.get(code.trim().toUpperCase()) || null;
}

function haversineDistanceMeters(start, end) {
    const radius = 6371000;
    const toRadians = degrees => degrees * Math.PI / 180;
    const lat1 = toRadians(start.lat);
    const lat2 = toRadians(end.lat);
    const deltaLat = toRadians(end.lat - start.lat);
    const deltaLon = toRadians(end.lon - start.lon);
    const a = Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

    return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildGreatCircleArcPositions(start, end, offsetIndex = 0, offsetCount = 1, offsetDirection = 1) {
    const startCartographic = Cesium.Cartographic.fromDegrees(start.lon, start.lat);
    const endCartographic = Cesium.Cartographic.fromDegrees(end.lon, end.lat);
    const geodesic = new Cesium.EllipsoidGeodesic(startCartographic, endCartographic);
    const distance = haversineDistanceMeters(start, end);
    const sampleCount = Math.max(16, Math.min(96, Math.ceil(distance / 180000)));
    const maxHeight = Math.max(140000, Math.min(1300000, distance * 0.05));
    const offsetSpacing = Math.max(18000, Math.min(90000, distance * 0.05));
    const centeredOffset = offsetIndex - (offsetCount - 1) / 2;
    const positions = [];

    const startSurface = Cesium.Cartesian3.fromRadians(startCartographic.longitude, startCartographic.latitude, 0);
    const endSurface = Cesium.Cartesian3.fromRadians(endCartographic.longitude, endCartographic.latitude, 0);
    const routeVector = Cesium.Cartesian3.subtract(endSurface, startSurface, new Cesium.Cartesian3());

    for (let i = 0; i <= sampleCount; i += 1) {
        const fraction = i / sampleCount;
        const cartographic = geodesic.interpolateUsingFraction(fraction);
        const surfacePoint = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
        const normal = Cesium.Cartesian3.normalize(surfacePoint, new Cesium.Cartesian3());
        const projection = Cesium.Cartesian3.multiplyByScalar(normal, Cesium.Cartesian3.dot(routeVector, normal), new Cesium.Cartesian3());
        const tangent = Cesium.Cartesian3.subtract(routeVector, projection, new Cesium.Cartesian3());
        Cesium.Cartesian3.normalize(tangent, tangent);
        const lateral = Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(normal, tangent, new Cesium.Cartesian3()), new Cesium.Cartesian3());
        const laneOffset = centeredOffset * offsetDirection * offsetSpacing * Math.sin(Math.PI * fraction);
        const height = Math.sin(Math.PI * fraction) * maxHeight;
        const elevated = Cesium.Cartesian3.add(surfacePoint, Cesium.Cartesian3.multiplyByScalar(normal, height, new Cesium.Cartesian3()), new Cesium.Cartesian3());
        positions.push(Cesium.Cartesian3.add(elevated, Cesium.Cartesian3.multiplyByScalar(lateral, laneOffset, new Cesium.Cartesian3()), new Cesium.Cartesian3()));
    }

    return positions;
}

function getRoutePairKey(origin, destination) {
    return [origin.iata, destination.iata].sort().join('|');
}

function getRouteDirectionSign(origin, destination) {
    return origin.iata <= destination.iata ? 1 : -1;
}

function clearFlightRoutes() {
    if (!cesiumViewer || flightRouteEntities.length === 0) {
        return;
    }

    flightRouteEntities.forEach(entity => {
        cesiumViewer.entities.remove(entity);
    });

    flightRouteEntities = [];
    flightRoutesLoaded = false;
}

function getFlightRouteWidthByHeight(height) {
    const minWidth = 4;
    const maxWidth = 10;
    const clampedHeight = Math.max(800000, Math.min(22000000, height));
    const t = (clampedHeight - 800000) / (22000000 - 800000);
    return minWidth + (maxWidth - minWidth) * t;
}

function updateFlightRouteWidths() {
    if (!cesiumViewer || flightRouteEntities.length === 0) {
        return;
    }

    const cameraHeight = cesiumViewer.camera.positionCartographic.height;
    const width = getFlightRouteWidthByHeight(cameraHeight);

    flightRouteEntities.forEach(entity => {
        if (entity && entity.polyline) {
            entity.polyline.width = width;
        }
    });
}

function getFlightRouteArrowImage() {
    if (flightRouteArrowImage) {
        return flightRouteArrowImage;
    }

    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) {
        return null;
    }

    context.clearRect(0, 0, size, size);
    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    context.strokeStyle = 'rgba(0, 191, 255, 0.95)';
    context.lineWidth = 2;
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(10, 10);
    context.lineTo(38, 24);
    context.lineTo(10, 38);
    context.closePath();
    context.fill();
    context.stroke();

    flightRouteArrowImage = canvas.toDataURL('image/png');
    return flightRouteArrowImage;
}

function addAirportPoint(airport) {
    const entity = cesiumViewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(airport.lon, airport.lat, 0),
        point: {
            pixelSize: 5,
            color: Cesium.Color.WHITE.withAlpha(0.95),
            outlineColor: Cesium.Color.DEEPSKYBLUE,
            outlineWidth: 2
        },
        description: `<p><strong>${airport.iata}</strong> ${airport.name}</p><p>${airport.city}${airport.city && airport.country ? ', ' : ''}${airport.country}</p>`
    });

    flightRouteEntities.push(entity);
}

function loadFlightRoutes() {
    if (!cesiumViewer || flightRoutesLoading || flightRoutesLoaded) {
        return Promise.resolve();
    }

    flightRoutesLoading = true;

    return Promise.all([
        fetchPossiblyDirtyJson('data/02_my_flights_sum.json'),
        fetchPossiblyDirtyJson('data/02_airports_info.json')
    ]).then(([flights, airportsInfo]) => {
        const airportIndex = buildAirportIataIndex(airportsInfo);
        const airportPoints = new Map();
        const routeCounts = new Map();
        let renderedRoutes = 0;
        let skippedRoutes = 0;

        (Array.isArray(flights) ? flights : []).forEach(flight => {
            const origin = getAirportByIata(airportIndex, flight && flight.origin);
            const destination = getAirportByIata(airportIndex, flight && flight.destination);
            if (!origin || !destination) {
                skippedRoutes += 1;
                return;
            }

            const routeKey = getRoutePairKey(origin, destination);
            routeCounts.set(routeKey, (routeCounts.get(routeKey) || 0) + 1);
            airportPoints.set(origin.iata, origin);
            airportPoints.set(destination.iata, destination);
            renderedRoutes += 1;
        });

        const routeOffsets = new Map();
        (Array.isArray(flights) ? flights : []).forEach(flight => {
            const origin = getAirportByIata(airportIndex, flight && flight.origin);
            const destination = getAirportByIata(airportIndex, flight && flight.destination);
            if (!origin || !destination) {
                return;
            }

            const routeKey = getRoutePairKey(origin, destination);
            const offsetIndex = routeOffsets.get(routeKey) || 0;
            routeOffsets.set(routeKey, offsetIndex + 1);

            const positions = buildGreatCircleArcPositions(
                origin,
                destination,
                offsetIndex,
                routeCounts.get(routeKey) || 1,
                getRouteDirectionSign(origin, destination)
            );
            const routeLabel = `${origin.iata} -> ${destination.iata}`;
            const flightNumber = flight.flightNumber || 'Flight';
            const routeEntity = cesiumViewer.entities.add({
                name: `${flightNumber} ${routeLabel}`,
                polyline: {
                    positions,
                    width: new Cesium.CallbackProperty(() => {
                        if (!cesiumViewer) {
                            return 2.1;
                        }
                        return getFlightRouteWidthByHeight(cesiumViewer.camera.positionCartographic.height);
                    }, false),
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.18,
                        color: Cesium.Color.DEEPSKYBLUE.withAlpha(0.82)
                    }),
                    arcType: Cesium.ArcType.NONE,
                    clampToGround: false
                },
                description: [
                    `<p><strong>${flightNumber}</strong> ${routeLabel}</p>`,
                    flight.date ? `<p>Date: ${flight.date}</p>` : '',
                    flight.airline ? `<p>Airline: ${flight.airline}</p>` : '',
                    flight.aircraft ? `<p>Aircraft: ${flight.aircraft}</p>` : '',
                    `<p>${origin.name} to ${destination.name}</p>`
                ].join('')
            });

            flightRouteEntities.push(routeEntity);

            const arrowMidIndex = Math.floor(positions.length * 0.5);
            const arrowPosition = positions[arrowMidIndex] || positions[Math.floor(positions.length / 2)];
            const arrowHeading = Cesium.Cartesian3.normalize(
                Cesium.Cartesian3.subtract(
                    positions[Math.min(positions.length - 1, arrowMidIndex + 1)] || positions[positions.length - 1],
                    positions[Math.max(0, arrowMidIndex - 1)] || positions[0],
                    new Cesium.Cartesian3()
                ),
                new Cesium.Cartesian3()
            );
            const arrowBillboard = cesiumViewer.entities.add({
                position: arrowPosition,
                billboard: {
                    image: getFlightRouteArrowImage(),
                    width: 16,
                    height: 16,
                    color: Cesium.Color.WHITE,
                    rotation: new Cesium.CallbackProperty(() => {
                        if (!cesiumViewer) {
                            return 0;
                        }

                        const screenDirection = Cesium.Matrix4.multiplyByPointAsVector(
                            cesiumViewer.camera.viewMatrix,
                            arrowHeading,
                            new Cesium.Cartesian3()
                        );
                        return Math.atan2(screenDirection.y, screenDirection.x);
                    }, false),
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                }
            });
            flightRouteEntities.push(arrowBillboard);
        });

        airportPoints.forEach(addAirportPoint);
        flightRoutesLoaded = true;
        console.log(`Loaded ${renderedRoutes} flight routes; skipped ${skippedRoutes} incomplete routes`);
    }).catch(error => {
        showFlightRoutes = false;
    setFootprintsButtonActive('toggleFlightRoutesBtn', false, FOOTPRINT_BUTTON_ACTIVE_BG);
        console.error('Error loading flight routes:', error);
    }).finally(() => {
        flightRoutesLoading = false;
    });
}

function toggleFlightRoutes() {
    showFlightRoutes = !showFlightRoutes;
    setFootprintsButtonActive('toggleFlightRoutesBtn', showFlightRoutes, FOOTPRINT_BUTTON_ACTIVE_BG);

    setVisitedCityMarkersVisible(!showFlightRoutes);

    if (showFlightRoutes) {
        loadFlightRoutes();
    } else {
        clearFlightRoutes();
    }

    console.log(`Flight routes overlay: ${showFlightRoutes ? 'ON' : 'OFF'}`);
    return showFlightRoutes;
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

function setVisitedCityMarkersVisible(visible) {
    visitedCityEntities.forEach(entity => {
        entity.show = visible;
    });
}

/**
 * Draw line segments from array of coordinates
 * @deprecated - Now using Cesium's GeoJsonDataSource instead
 */
function drawCountryBoundaryLine(coords) {
    if (!Array.isArray(coords) || coords.length < 2) return;

    const positions = coords.map(coord => 
        Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
    );

    try {
        const entity = cesiumViewer.entities.add({
            polyline: {
                positions: positions,
                width: 1.5,
                material: Cesium.Color.LIGHTGREY.withAlpha(0.8),
                clampToGround: false,
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
 * Draw polygon boundaries for provinces
 * @deprecated - Now using Cesium's GeoJsonDataSource instead
 */
function drawProvincePolygon(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return;

    // Handle both Polygon and MultiPolygon
    const polygonCoordinates = Array.isArray(coordinates[0][0]) 
        ? coordinates[0] 
        : coordinates;

    const positions = polygonCoordinates.map(coord => 
        Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
    );

    if (positions.length < 3) return;

    try {
        const entity = cesiumViewer.entities.add({
            polyline: {
                positions: positions,
                width: 1.0,
                material: Cesium.Color.LIGHTGREY.withAlpha(0.6),
                clampToGround: false,
                arcType: Cesium.ArcType.GEODESIC
            }
        });

        if (entity) {
            provinceBoundaryEntities.push(entity);
        }
    } catch (e) {
        console.warn('Error drawing province boundary:', e);
    }
}

/**
 * Load province boundaries from local GeoJSON data using Cesium's GeoJsonDataSource
 */
function loadProvinceBoundaries() {
    if (!cesiumViewer) return;

    // Clear existing province boundaries
    if (provinceBoundaryDataSource) {
        cesiumViewer.dataSources.remove(provinceBoundaryDataSource);
        provinceBoundaryDataSource = null;
    }

    console.log('Loading province boundary lines using GeoJsonDataSource...');

    Cesium.GeoJsonDataSource.load('data/provinces_boundaries_50m.geojson', {
        stroke: Cesium.Color.LIGHTGREY.withAlpha(0.6),
        strokeWidth: 1.0,
        fill: Cesium.Color.TRANSPARENT,
        clampToGround: false
    }).then(function(dataSource) {
        provinceBoundaryDataSource = dataSource;
        cesiumViewer.dataSources.add(dataSource);
        
        // Convert polylines to dashed lines with distance-based visibility
        const entities = dataSource.entities.values;
        entities.forEach(entity => {
            if (entity.polyline) {
                // Create dashed line pattern using PolylineDashMaterialProperty
                entity.polyline.material = new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.LIGHTGREY.withAlpha(0.9),
                    dashLength: 25,
                    dashPattern: 0x0F0F // 鏍囧噯铏氱嚎锛氭樉绀?0%鍍忕礌锛岄殣钘?0%鍍忕礌
                });
                entity.polyline.width = 1;
                
                // Hide province boundaries when zoomed in too close (below 500km)
                // Only set lower limit, no upper limit - always show when zoomed out
                entity.polyline.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(5000000);
            }
        });
        
        const boundaryCount = dataSource.entities.length;
        console.log(`鉁?Loaded ${boundaryCount} province boundaries (dashed)`);
    }).catch(function(error) {
        console.error('Error loading province boundaries:', error);
    });
}



/**
 * Load country boundaries from local Natural Earth boundaries lines data using Cesium's GeoJsonDataSource
 */
function loadCountryBoundaries() {
    if (!showCountryBoundaries || !cesiumViewer) return;

    // Clear existing boundaries
    if (countryBoundaryDataSource) {
        cesiumViewer.dataSources.remove(countryBoundaryDataSource);
        countryBoundaryDataSource = null;
    }

    console.log('Loading country boundary lines using GeoJsonDataSource...');

    Cesium.GeoJsonDataSource.load('data/countries_boundary_50m.geojson', {
        stroke: Cesium.Color.LIGHTGREY.withAlpha(0.8),
        strokeWidth: 1.5,
        fill: Cesium.Color.TRANSPARENT,
        clampToGround: false
    }).then(function(dataSource) {
        countryBoundaryDataSource = dataSource;
        cesiumViewer.dataSources.add(dataSource);
        
        // Add distance-based visibility to country boundaries
        const entities = dataSource.entities.values;
        entities.forEach(entity => {
            if (entity.polyline) {
                // Hide country boundaries when zoomed in too close (below 1M)
                // Only set lower limit, no upper limit - always show when zoomed out
                entity.polyline.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(5500000);
            }
        });
        
        const lineCount = dataSource.entities.length;
        console.log(`鉁?Loaded ${lineCount} international boundary lines`);
    }).catch(function(error) {
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
        if (countryBoundaryDataSource) {
            cesiumViewer.dataSources.remove(countryBoundaryDataSource);
            countryBoundaryDataSource = null;
        }
    }

    console.log(`Country boundaries: ${showCountryBoundaries ? 'ON' : 'OFF'}`);
    return showCountryBoundaries;
}

/**
 * Load visited cities from JSON file and add markers
 */
function addVisitedCityMarkers() {
    if (!cesiumViewer || visitedCities.length === 0) {
        return;
    }

    clearVisitedCityMarkers();

    visitedCities.forEach(city => {
        // 銆愬缓璁€戝鏋滀綘浠ュ悗鍦?JSON 涓鍔犱簡 level 瀛楁锛屽彲浠ュ湪杩欓噷鍔ㄦ€佽瀹氬熀纭€閰嶇疆
        // let baseScale = city.level === 1 ? 1.2 : 0.9;
        // let visibleDistance = city.level === 1 ? 15000000 : 5000000;

        const entity = cesiumViewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(city.longitude, city.latitude, 0),
            
            // 鏋佺畝鍦嗙偣
            point: {
                pixelSize: 4,
                color: Cesium.Color.DEEPSKYBLUE.withAlpha(0.9),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 1
            },

            description: `<p><strong>${city.name}</strong></p><p>Latitude: ${city.latitude.toFixed(4)}掳</p><p>Longitude: ${city.longitude.toFixed(4)}掳</p>`
        });

        visitedCityEntities.push(entity);
    });
}

function loadVisitedCitiesFromJson() {
    fetch('data/00_visited_cities.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load visited cities JSON: ${response.status}`);
            }

            return response.json();
        })
        .then(data => {
            visitedCities = data.cities || [];
            addVisitedCityMarkers();
            setVisitedCityMarkersVisible(!showFlightRoutes);
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

// Helper to extract a readable name from an entity (tries several property keys)
function getEntityName(entity) {
    // First prefer entity.name set by GeoJsonDataSource
    if (entity && entity.name) return String(entity.name).trim();

    if (!entity || !entity.properties) return '';

    const keys = ['name','NAME','NAME_1','admin','province','prov_name','NAME_EN'];
    for (let k of keys) {
        if (entity.properties[k]) {
            try {
                const prop = entity.properties[k];
                const val = (typeof prop.getValue === 'function') ? prop.getValue(Cesium.JulianDate.now()) : prop;
                if (val) return String(val).trim();
            } catch (e) {
                // ignore and continue
            }
        }
    }

    // As a last resort, try to inspect property names on the PropertyBag
    try {
        const propNames = entity.properties.propertyNames || Object.keys(entity.properties);
        for (let n of propNames) {
            try {
                const prop = entity.properties[n];
                const val = (prop && typeof prop.getValue === 'function') ? prop.getValue(Cesium.JulianDate.now()) : prop;
                if (val && String(val).trim()) return String(val).trim();
            } catch (e) {}
        }
    } catch (e) {}

    return '';
}

/**
 * Load and render visited provinces by reading local JSON and matching against province GeoJSON
 */
function loadVisitedProvinces() {
    if (!cesiumViewer) return;

    // Remove previous data source if any
    if (visitedProvinceDataSource) {
        cesiumViewer.dataSources.remove(visitedProvinceDataSource);
        visitedProvinceDataSource = null;
    }

    // Load visited provinces list
    fetch('data/00_visited_chinese_provinces.json')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load visited provinces JSON');
            return response.json();
        })
        .then(json => {
            const visitedNames = (json.provinces || []).map(p => (p.name || '').trim());
            if (visitedNames.length === 0) {
                console.log('No visited provinces found');
                return;
            }

            // Load province polygons
            Cesium.GeoJsonDataSource.load('data/provinces_profiles_50m.geojson', {
                stroke: Cesium.Color.TRANSPARENT,
                fill: Cesium.Color.TRANSPARENT,
                clampToGround: false
            }).then(function(dataSource) {
                visitedProvinceDataSource = dataSource;
                cesiumViewer.dataSources.add(dataSource);

                // For each entity (province), show & fill if visited, otherwise hide
                const entities = dataSource.entities.values;
                entities.forEach(entity => {
                    const ename = getEntityName(entity);
                    const matched = visitedNames.includes(ename) || visitedNames.includes(ename.replace(/\s+Province$/i, ''));

                    if (entity.polygon) {
                        if (matched) {
                            entity.show = true;
                            entity.polygon.material = Cesium.Color.ORANGE.withAlpha(0.45);
                            entity.polygon.outline = true;
                            entity.polygon.outlineColor = Cesium.Color.WHITE;
                            entity.polygon.outlineWidth = 1;
                        } else {
                            entity.show = false;
                        }
                    } else if (entity.polyline) {
                        // Some GeoJSON may give boundaries as polylines - highlight them when matched
                        if (matched) {
                            entity.show = true;
                            entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
                                glowPower: 0.2,
                                color: Cesium.Color.WHITE
                            });
                            entity.polyline.width = 2;
                        } else {
                            entity.show = false;
                        }
                    } else {
                        // fallback show/hide
                        entity.show = !!matched;
                    }
                });

                console.log('鉁?Loaded visited provinces overlay');
            }).catch(err => {
                console.error('Error loading provinces geojson:', err);
            });
        })
        .catch(err => console.error('Error loading visited provinces JSON:', err));
}

function toggleVisitedProvinces() {
    showVisitedProvinces = !showVisitedProvinces;

    if (showVisitedProvinces) {
        // Hide countries when showing provinces
        showVisitedCountries = false;
        if (visitedCountryDataSource) {
            cesiumViewer.dataSources.remove(visitedCountryDataSource);
            visitedCountryDataSource = null;
        }
        loadVisitedProvinces();
    } else {
        if (visitedProvinceDataSource) {
            cesiumViewer.dataSources.remove(visitedProvinceDataSource);
            visitedProvinceDataSource = null;
        }
    }

    setFootprintsButtonActive('toggleVisitedProvincesBtn', showVisitedProvinces, FOOTPRINT_BUTTON_ACTIVE_BG);
    setFootprintsButtonActive('toggleVisitedCountriesBtn', showVisitedCountries, FOOTPRINT_BUTTON_ACTIVE_BG);

    console.log(`Visited provinces overlay: ${showVisitedProvinces ? 'ON' : 'OFF'}`);
    return showVisitedProvinces;
}

/**
 * Load and render visited countries by reading local JSON and matching against country GeoJSON
 */
function loadVisitedCountries() {
    if (!cesiumViewer) return;

    // Remove previous data source if any
    if (visitedCountryDataSource) {
        cesiumViewer.dataSources.remove(visitedCountryDataSource);
        visitedCountryDataSource = null;
    }

    // Load visited countries list
    fetch('data/00_visited_countries.json')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load visited countries JSON');
            return response.json();
        })
        .then(json => {
            const visitedNames = (json.countries || []).map(c => (c.name || '').trim());
            if (visitedNames.length === 0) {
                console.log('No visited countries found');
                return;
            }

            // Load country polygons
            Cesium.GeoJsonDataSource.load('data/countries_profiles_50m.geojson', {
                stroke: Cesium.Color.TRANSPARENT,
                fill: Cesium.Color.TRANSPARENT,
                clampToGround: false
            }).then(function(dataSource) {
                visitedCountryDataSource = dataSource;
                cesiumViewer.dataSources.add(dataSource);

                // For each entity (country), show & fill if visited, otherwise hide
                const entities = dataSource.entities.values;
                entities.forEach(entity => {
                    const ename = getEntityName(entity);
                    const matched = visitedNames.includes(ename) || visitedNames.includes(ename.replace(/\s+Province$/i, ''));

                    if (entity.polygon) {
                        if (matched) {
                            entity.show = true;
                            entity.polygon.material = Cesium.Color.CYAN.withAlpha(0.4);
                            entity.polygon.outline = true;
                            entity.polygon.outlineColor = Cesium.Color.WHITE;
                            entity.polygon.outlineWidth = 1;
                        } else {
                            entity.show = false;
                        }
                    } else if (entity.polyline) {
                        // Some GeoJSON may give boundaries as polylines - highlight them when matched
                        if (matched) {
                            entity.show = true;
                            entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
                                glowPower: 0.2,
                                color: Cesium.Color.WHITE
                            });
                            entity.polyline.width = 2;
                        } else {
                            entity.show = false;
                        }
                    } else {
                        // fallback show/hide
                        entity.show = !!matched;
                    }
                });

                console.log('鉁?Loaded visited countries overlay');
            }).catch(err => {
                console.error('Error loading countries geojson:', err);
            });
        })
        .catch(err => console.error('Error loading visited countries JSON:', err));
}

function toggleVisitedCountries() {
    showVisitedCountries = !showVisitedCountries;

    if (showVisitedCountries) {
        // Hide provinces when showing countries
        showVisitedProvinces = false;
        if (visitedProvinceDataSource) {
            cesiumViewer.dataSources.remove(visitedProvinceDataSource);
            visitedProvinceDataSource = null;
        }
        loadVisitedCountries();
    } else {
        if (visitedCountryDataSource) {
            cesiumViewer.dataSources.remove(visitedCountryDataSource);
            visitedCountryDataSource = null;
        }
    }

    setFootprintsButtonActive('toggleVisitedCountriesBtn', showVisitedCountries, FOOTPRINT_BUTTON_ACTIVE_BG);
    setFootprintsButtonActive('toggleVisitedProvincesBtn', showVisitedProvinces, FOOTPRINT_BUTTON_ACTIVE_BG);

    console.log(`Visited countries overlay: ${showVisitedCountries ? 'ON' : 'OFF'}`);
    return showVisitedCountries;
}

/**
 * Toggle flags sidebar collapse/expand state
 */
function toggleFlagsSidebar() {
    flagsSidebarCollapsed = !flagsSidebarCollapsed;
    
    const sidebarPanel = document.getElementById('flagsSidebarPanel');
    const toggleBtn = document.getElementById('toggleFlagsSidebar');
    const cesiumMainContainer = document.getElementById('cesiumMainContainer');
    
    if (sidebarPanel && toggleBtn && cesiumMainContainer) {
        if (flagsSidebarCollapsed) {
            // Collapse: slide sidebar left, restore cesium container
            sidebarPanel.style.transform = 'translateX(-140px)';
            cesiumMainContainer.style.width = '100%';
            cesiumMainContainer.style.transform = 'translateX(0)';
            cesiumMainContainer.style.marginLeft = '2rem';
            toggleBtn.innerHTML = '<';
            toggleBtn.title = 'Expand Sidebar';
        } else {
            // Expand: slide sidebar right, reduce cesium container width and shift right
            sidebarPanel.style.transform = 'translateX(0)';
            cesiumMainContainer.style.transform = 'translateX(140px)';
            cesiumMainContainer.style.width = 'calc(100% - 140px)';
            cesiumMainContainer.style.marginLeft = '0';
            toggleBtn.innerHTML = '>';
            toggleBtn.title = 'Collapse Sidebar';
        }
        
        // Trigger cesium viewer resize after animation completes
        if (cesiumViewer) {
            setTimeout(() => {
                cesiumViewer.resize();
            }, 400);
        }
    }
    
    console.log(`Flags sidebar: ${flagsSidebarCollapsed ? 'COLLAPSED' : 'EXPANDED'}`);
}

/**
 * Load visited countries flags from JSON and display in sidebar
 */
function loadVisitedCountriesFlags() {
    const flagsContainer = document.getElementById('flagsSidebarContainer');
    if (!flagsContainer) return;

    // Clear existing flags
    flagsContainer.innerHTML = '';

    // Load visited countries JSON
    fetch('data/00_visited_countries.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load visited countries JSON: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const countries = data.countries || [];
            
            if (countries.length === 0) {
                console.log('No visited countries found');
                return;
            }

            // Create flag items for each visited country
            countries.forEach(country => {
                const countryName = country.name || '';
                const countryYear = country.year || '';
                const countryCode = COUNTRY_CODE_MAP[countryName];

                if (countryCode) {
                    // Create flag item wrapper
                    const flagItem = document.createElement('div');
                    flagItem.className = 'flag-item';
                    flagItem.setAttribute('data-year', countryYear);
                    flagItem.title = `${countryName} (${countryYear})`;

                    // Create content wrapper
                    const contentWrapper = document.createElement('div');
                    contentWrapper.className = 'flag-item-content';

                    // Create flag icon using flag-icons library
                    const flagIcon = document.createElement('span');
                    flagIcon.className = `fi fi-${countryCode} flag-icon-large`;

                    // Create country name label
                    const nameLabel = document.createElement('div');
                    nameLabel.className = 'flag-name';
                    nameLabel.textContent = countryName;

                    // Append to content wrapper
                    contentWrapper.appendChild(flagIcon);
                    contentWrapper.appendChild(nameLabel);

                    // Append content wrapper to flag item
                    flagItem.appendChild(contentWrapper);

                    // Append to container
                    flagsContainer.appendChild(flagItem);
                } else {
                    console.warn(`Country code not found for: ${countryName}`);
                }
            });

            console.log(`鉁?Loaded ${countries.length} visited country flags`);
        })
        .catch(error => console.error('Error loading visited countries flags:', error));
}

