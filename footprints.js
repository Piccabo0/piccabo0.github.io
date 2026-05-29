// CesiumJS 3D Footprints Map
let cesiumViewer = null;
let cesiumInitialized = false;
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

// Add variable for sidebar collapsed state
let flagsSidebarCollapsed = true;

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
            navigationInstructionsInitiallyVisible: false,
        });

        // Hide credit information
        cesiumViewer.creditDisplay.container.style.display = 'none';

        // Fix blur issue on high-DPI screens by matching device pixel ratio
        cesiumViewer.resolutionScale = window.devicePixelRatio;

        // 开启抗锯齿
        cesiumViewer.scene.postProcessStages.fxaa.enabled = true;

        // 关闭环境迷雾，提升通透度
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
        
        console.log('✓ Background label layer loaded');
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
        
        console.log('✓ Mouse wheel zoom speed adjusted');
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
                background: '#4b5563',
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
                background: '#4b5563',
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
                    dashPattern: 0x0F0F // 标准虚线：显示50%像素，隐藏50%像素
                });
                entity.polyline.width = 1;
                
                // Hide province boundaries when zoomed in too close (below 500km)
                // Only set lower limit, no upper limit - always show when zoomed out
                entity.polyline.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(5000000);
            }
        });
        
        const boundaryCount = dataSource.entities.length;
        console.log(`✓ Loaded ${boundaryCount} province boundaries (dashed)`);
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
        console.log(`✓ Loaded ${lineCount} international boundary lines`);
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
        // 【建议】如果你以后在 JSON 中增加了 level 字段，可以在这里动态设定基础配置
        // let baseScale = city.level === 1 ? 1.2 : 0.9;
        // let visibleDistance = city.level === 1 ? 15000000 : 5000000;

        const entity = cesiumViewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(city.longitude, city.latitude, 0),
            
            // 极简圆点
            point: {
                pixelSize: 4,
                color: Cesium.Color.ORANGE.withAlpha(0.9),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 1,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },

            description: `<p><strong>${city.name}</strong></p><p>Latitude: ${city.latitude.toFixed(4)}°</p><p>Longitude: ${city.longitude.toFixed(4)}°</p>`
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

                console.log('✓ Loaded visited provinces overlay');
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

                console.log('✓ Loaded visited countries overlay');
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
            toggleBtn.innerHTML = '▶';
            toggleBtn.title = 'Expand Sidebar';
        } else {
            // Expand: slide sidebar right, reduce cesium container width and shift right
            sidebarPanel.style.transform = 'translateX(0)';
            cesiumMainContainer.style.transform = 'translateX(140px)';
            cesiumMainContainer.style.width = 'calc(100% - 140px)';
            cesiumMainContainer.style.marginLeft = '0';
            toggleBtn.innerHTML = '◀';
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

            console.log(`✓ Loaded ${countries.length} visited country flags`);
        })
        .catch(error => console.error('Error loading visited countries flags:', error));
}