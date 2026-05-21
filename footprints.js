// CesiumJS 3D Footprints Map
let cesiumViewer = null;
let cesiumInitialized = false;
let countriesEntities = [];
let countryLabels = {};

const visitedCountries = [
    { name: 'China', latitude: 35.8617, longitude: 104.1954, color: Cesium.Color.RED },
    { name: 'Malaysia', latitude: 4.2105, longitude: 101.6964, color: Cesium.Color.BLUE },
    { name: 'Vietnam', latitude: 14.0583, longitude: 108.2772, color: Cesium.Color.GREEN },
    { name: 'Azerbaijan', latitude: 40.1431, longitude: 47.5769, color: Cesium.Color.YELLOW },
    { name: 'Japan', latitude: 36.2048, longitude: 138.2529, color: Cesium.Color.PURPLE },
    { name: 'Singapore', latitude: 1.3521, longitude: 103.8198, color: Cesium.Color.CYAN },
    { name: 'Kazakhstan', latitude: 48.0196, longitude: 66.9237, color: Cesium.Color.ORANGE },
    { name: 'Australia', latitude: -25.2744, longitude: 133.7751, color: Cesium.Color.LIME }
];

// Set Cesium Ion Access Token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZTc2Yzg3Ny0xZDEzLTRhMjItYTc1MS03MGU1Mjk5ZDY2YTMiLCJpZCI6NDM0NjI5LCJzdWIiOiJQaWNjYWJvbyIsImlzcyI6Imh0dHBzOi8vaW9uLmNlc2l1bS5jb20iLCJhdWQiOiJNeVRva2VuIiwiaWF0IjoxNzc5MzY1Mjk4fQ.mpN9JH1ltXPounHE-42giykKbFgvFgoMkDncCEhYCok';

function initCesiumMap() {
    if (cesiumInitialized) {
        return;
    }

    try {
        // Create Cesium Viewer with default settings
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

        // Set initial view to show the entire Earth with China centered
        cesiumViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(104.1954, 35.8617, 20000000), // Match Reset View height
            duration: 1.5
        });

        // Add visited country markers
        // addCountryMarkers();

        // Add button event listeners
        setupControlButtons();

        cesiumInitialized = true;
    } catch (error) {
        console.error('Error initializing Cesium map:', error);
    }
}

function addCountryMarkers() {
    if (!cesiumViewer) return;

    visitedCountries.forEach(country => {
        // Add point entity
        const entity = cesiumViewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(country.longitude, country.latitude, 0),
            point: {
                pixelSize: 10,
                color: country.color,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE
            },
            label: {
                text: country.name,
                font: '12px Helvetica',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, 10)
            },
            description: `<p><strong>${country.name}</strong></p><p>Latitude: ${country.latitude.toFixed(4)}°</p><p>Longitude: ${country.longitude.toFixed(4)}°</p>`
        });

        countriesEntities.push(entity);
        countryLabels[country.name] = entity;
    });
}

function setupControlButtons() {
    // Reset view button
    const resetViewBtn = document.getElementById('resetView3D');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', function() {
            if (cesiumViewer) {
                cesiumViewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(104.1954, 35.8617, 20000000), // Adjusted height for entire Earth view
                    duration: 1.5
                });
            }
        });
    }
}

function getCentroid(coordinates) {
    // Calculate centroid of a polygon
    if (!coordinates || coordinates.length === 0) return null;
    
    let sumLat = 0, sumLng = 0;
    let count = 0;
    
    const processCoords = (coords) => {
        if (typeof coords[0] === 'number') {
            // This is a coordinate pair [lng, lat]
            sumLng += coords[0];
            sumLat += coords[1];
            count++;
        } else {
            // This is an array of coordinates
            coords.forEach(c => processCoords(c));
        }
    };
    
    processCoords(coordinates);
    
    if (count === 0) return null;
    return { lng: sumLng / count, lat: sumLat / count };
}

function loadGeoJsonData() {
    if (!cesiumViewer) {
        console.error('Cesium Viewer is not initialized.');
        return;
    }

    // Load country boundaries (Google Maps style)
    Cesium.GeoJsonDataSource.load('data/countries.geo.json').then(dataSource => {
        cesiumViewer.dataSources.add(dataSource);
        dataSource.entities.values.forEach(entity => {
            if (entity.polygon) {
                entity.polygon.material = Cesium.Color.fromCssColorString('#f0f0f0').withAlpha(0.05);
                entity.polygon.outline = true;
                entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#dadce0');
                entity.polygon.outlineWidth = 1.5;
            }
        });
    }).catch(error => console.error('Error loading countries GeoJSON:', error));

    // Load province boundaries (Google Maps style)
    Cesium.GeoJsonDataSource.load('data/china-provinces.json').then(dataSource => {
        cesiumViewer.dataSources.add(dataSource);
        dataSource.entities.values.forEach(entity => {
            if (entity.polygon) {
                entity.polygon.material = Cesium.Color.fromCssColorString('#f0f0f0').withAlpha(0.02);
                entity.polygon.outline = true;
                entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#e8eaed');
                entity.polygon.outlineWidth = 1.0;
            }
        });
    }).catch(error => console.error('Error loading provinces GeoJSON:', error));
}

// Call the function to load GeoJSON data after initializing the viewer
setTimeout(loadGeoJsonData, 1000); // Ensure viewer is ready

// Listen for page changes to initialize map when needed
document.addEventListener('DOMContentLoaded', function() {
    const originalShowPage = window.showPage || function() {};
    
    // Observe when footprints page is shown
    const observer = new MutationObserver(function(mutations) {
        const footprintsSection = document.getElementById('footprints');
        if (footprintsSection && footprintsSection.style.display !== 'none') {
            if (!cesiumInitialized) {
                initCesiumMap();
            } else if (cesiumViewer) {
                // Refresh viewer size if it was hidden
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

    // Also observe all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        observer.observe(page, config);
    });
});

// Handle map resize on window resize
window.addEventListener('resize', function() {
    if (cesiumInitialized && cesiumViewer) {
        cesiumViewer.resize();
    }
});
