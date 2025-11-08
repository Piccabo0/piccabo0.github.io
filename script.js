// Page navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    function showPage(pageId) {
        // Hide all pages
        pages.forEach(page => {
            page.style.display = 'none';
        });
        
        // Show selected page
        const selectedPage = document.getElementById(pageId);
        if (selectedPage) {
            selectedPage.style.display = 'flex';
        }
        
        // Update nav link styles
        navLinks.forEach(link => {
            if (link.dataset.page === pageId) {
                link.classList.remove('text-gray-300');
                link.classList.add('text-white');
            } else {
                link.classList.remove('text-white');
                link.classList.add('text-gray-300');
            }
        });
    }
    
    // Add click event listeners to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.dataset.page;
            showPage(pageId);
            // Update URL hash
            window.location.hash = pageId;
        });
    });
    
    // Initialize Leaflet map for Footprint section
    let map = null;
    let mapInitialized = false;
    let provinceLayer = null;
    let isProvinceLayerVisible = false;
    let countryLayer = null;
    let isCountryLayerVisible = false;
    
    function initMap() {
        if (mapInitialized) {
            // If map exists, just refresh its size
            if (map) {
                setTimeout(() => map.invalidateSize(), 100);
            }
            return;
        }
        
        try {
            // Create map centered on China with no repeat
            map = L.map('map', {
                worldCopyJump: false,
                maxBounds: [[-90, -180], [90, 180]],
                maxBoundsViscosity: 1.0,
                minZoom: 2,
                maxZoom: 18
            }).setView([35.8617, 104.1954], 4);
            
            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                minZoom: 2,
                noWrap: true
            }).addTo(map);
            
            mapInitialized = true;
            
            // Force map to recalculate size
            setTimeout(() => map.invalidateSize(), 200);
            
            // List of provinces visited (Chinese names as they appear in GeoJSON)
            const visitedProvinces = new Set([
                '\u5317\u4eac\u5e02', '\u5929\u6d25\u5e02', '\u6cb3\u5317\u7701', 
                '\u5185\u8499\u53e4\u81ea\u6cbb\u533a', '\u5c71\u4e1c\u7701', 
                '\u6cb3\u5357\u7701', '\u4e0a\u6d77\u5e02', '\u5c71\u897f\u7701', 
                '\u5e7f\u4e1c\u7701', '\u798f\u5efa\u7701', 
                '\u56db\u5ddd\u7701', '\u91cd\u5e86\u5e02', '\u6c5f\u82cf\u7701', 
                '\u9655\u897f\u7701', '\u6d59\u6c5f\u7701', 
                '\u6c5f\u897f\u7701', '\u5b89\u5fbd\u7701', '\u6e56\u5357\u7701', 
                '\u8fbd\u5b81\u7701', '\u5409\u6797\u7701', 
                '\u9ed1\u9f99\u6c5f\u7701', '\u8d35\u5dde\u7701', 
                '\u5e7f\u897f\u58ee\u65cf\u81ea\u6cbb\u533a', '\u6d77\u5357\u7701', 
                '\u7518\u8083\u7701', 
                '\u897f\u85cf\u81ea\u6cbb\u533a', 
                '\u65b0\u7586\u7ef4\u543e\u5c14\u81ea\u6cbb\u533a'
            ]);
            
            // List of countries visited (English names as they appear in GeoJSON)
            const visitedCountries = new Set([
                'China', 'Malaysia', 'Vietnam', 'Azerbaijan', 'Japan', 'Singapore', 'Kazakhstan'
            ]);
            
            // Load China provinces GeoJSON (but don't add to map yet)
            fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
                .then(response => {
                    console.log('Province GeoJSON fetch response:', response.status);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Province GeoJSON loaded successfully');
                    // Create province layer
                    provinceLayer = L.geoJSON(data, {
                        style: function(feature) {
                            const provinceName = feature.properties.name;
                            const isVisited = visitedProvinces.has(provinceName);
                            
                            return {
                                fillColor: isVisited ? '#FF6B6B' : '#999999',
                                fillOpacity: isVisited ? 0.2 : 0.5,
                                color: isVisited ? '#E63946' : '#666666',
                                weight: isVisited ? 2 : 1,
                                opacity: isVisited ? 0.8 : 0.3
                            };
                        },
                        onEachFeature: function(feature, layer) {
                            const provinceName = feature.properties.name;
                            const isVisited = visitedProvinces.has(provinceName);
                            
                            // Add hover effect
                            layer.on('mouseover', function(e) {
                                this.setStyle({
                                    fillOpacity: isVisited ? 0.4 : 0.6,
                                    weight: 3
                                });
                            });
                            
                            layer.on('mouseout', function(e) {
                                this.setStyle({
                                    fillOpacity: isVisited ? 0.2 : 0.5,
                                    weight: isVisited ? 2 : 1
                                });
                            });
                        }
                    });
                    
                    // Add province layer to map by default
                    provinceLayer.addTo(map);
                    isProvinceLayerVisible = true;
                    
                    // Update button state
                    const toggleButton = document.getElementById('toggleProvinceLayer');
                    if (toggleButton) {
                        toggleButton.textContent = 'Hide Provinces Overlay';
                        toggleButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                        toggleButton.classList.add('bg-red-600', 'hover:bg-red-700');
                    }
                })
                .catch(error => console.error('Error loading province GeoJSON:', error));
            
            // Load world countries GeoJSON
            fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
                .then(response => {
                    console.log('Country GeoJSON fetch response:', response.status);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Country GeoJSON loaded successfully');
                    // Create country layer
                    countryLayer = L.geoJSON(data, {
                        style: function(feature) {
                            const countryName = feature.properties.name;
                            const isVisited = visitedCountries.has(countryName);
                            
                            return {
                                fillColor: isVisited ? '#FBBF24' : '#999999',
                                fillOpacity: isVisited ? 0.25 : 0.5,
                                color: isVisited ? '#F59E0B' : '#666666',
                                weight: isVisited ? 2 : 1,
                                opacity: isVisited ? 0.8 : 0.3
                            };
                        },
                        onEachFeature: function(feature, layer) {
                            const countryName = feature.properties.name;
                            const isVisited = visitedCountries.has(countryName);
                            
                            // Add hover effect
                            layer.on('mouseover', function(e) {
                                this.setStyle({
                                    fillOpacity: isVisited ? 0.45 : 0.6,
                                    weight: 3
                                });
                            });
                            
                            layer.on('mouseout', function(e) {
                                this.setStyle({
                                    fillOpacity: isVisited ? 0.25 : 0.5,
                                    weight: isVisited ? 2 : 1
                                });
                            });
                        }
                    });
                })
                .catch(error => console.error('Error loading country GeoJSON:', error));
            
            // Create custom smaller icon
            const smallIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [15, 25],
                iconAnchor: [7, 25],
                shadowSize: [25, 25],
                shadowAnchor: [7, 25]
            });
            
            // Add markers
            // ==============================China Locations==============================
            // Beijing
            L.marker([39.9042, 116.4074], {icon: smallIcon}).addTo(map); // Beijing

            // Tianjin
            L.marker([39.0915, 117.2007], {icon: smallIcon}).addTo(map); // Tianjin

            // Hebei
            L.marker([38.0428, 114.5149], {icon: smallIcon}).addTo(map); // Shijiazhuang
            L.marker([39.9346, 119.5965], {icon: smallIcon}).addTo(map); // Qinhuangdao
            L.marker([36.6000, 114.4900], {icon: smallIcon}).addTo(map); // Handan
            L.marker([42.4444, 117.4657], {icon: smallIcon}).addTo(map); // Chengde

            // Inner Mongolia
            L.marker([42.4858, 117.2833], {icon: smallIcon}).addTo(map); // Wulanbutong

            // Shandong
            L.marker([36.0671, 120.3826], {icon: smallIcon}).addTo(map); // Qingdao
            L.marker([36.6494, 117.1328], {icon: smallIcon}).addTo(map); // Jinan
            L.marker([37.4638, 121.4486], {icon: smallIcon}).addTo(map); // Yantai
            L.marker([37.8123, 120.7577], {icon: smallIcon}).addTo(map); // Penglai
            L.marker([37.6425, 120.4794], {icon: smallIcon}).addTo(map); // Longkou
            L.marker([35.0653, 118.3426], {icon: smallIcon}).addTo(map); // Linyi
            L.marker([36.7069, 119.1618], {icon: smallIcon}).addTo(map); // Weifang
            L.marker([37.5138, 122.1215], {icon: smallIcon}).addTo(map); // Weihai

            // Henan
            L.marker([34.6197, 112.4540], {icon: smallIcon}).addTo(map); // Luoyang

            // Shanghai
            L.marker([31.2304, 121.4737], {icon: smallIcon}).addTo(map); // Shanghai

            // Shanxi
            L.marker([37.8734, 112.5620], {icon: smallIcon}).addTo(map); // Taiyuan
            L.marker([39.5522, 113.2028], {icon: smallIcon}).addTo(map); // Ying country

            // Guangdong
            L.marker([23.1291, 113.2644], {icon: smallIcon}).addTo(map); // Guangzhou
            L.marker([23.0215, 113.1214], {icon: smallIcon}).addTo(map); // Foshan
            L.marker([22.5431, 114.0579], {icon: smallIcon}).addTo(map); // Shenzhen
            L.marker([22.3193, 114.1694], {icon: smallIcon}).addTo(map); // Hong Kong

            // Fujian
            L.marker([26.0745, 119.2965], {icon: smallIcon}).addTo(map); // Fuzhou

            // Sichuan
            L.marker([30.5728, 104.0668], {icon: smallIcon}).addTo(map); // Chengdu

            // Chongqing
            L.marker([29.5630, 106.5516], {icon: smallIcon}).addTo(map); // Chongqing

            // Jiangsu
            L.marker([32.0603, 118.7969], {icon: smallIcon}).addTo(map); // Nanjing
            L.marker([31.2989, 120.5853], {icon: smallIcon}).addTo(map); // Suzhou

            // Shaanxi
            L.marker([34.3416, 108.9398], {icon: smallIcon}).addTo(map); // Xi'an
            L.marker([34.3466, 108.7075], {icon: smallIcon}).addTo(map); // Xianyang
            L.marker([34.5026, 109.5029], {icon: smallIcon}).addTo(map); // Weinan

            // Zhejiang
            L.marker([30.2741, 120.1551], {icon: smallIcon}).addTo(map); // Hangzhou

            // Jiangxi
            L.marker([28.6820, 115.8582], {icon: smallIcon}).addTo(map); // Nanchang
            L.marker([29.2666, 117.1733], {icon: smallIcon}).addTo(map); // Jingdezhen
            L.marker([29.2347, 117.8757], {icon: smallIcon}).addTo(map); // Wuyuan

            // Anhui
            L.marker([31.8612, 117.2857], {icon: smallIcon}).addTo(map); // Hefei
            L.marker([29.9108, 117.9496], {icon: smallIcon}).addTo(map); // Yi county
            L.marker([29.7018, 118.3493], {icon: smallIcon}).addTo(map); // Huangshan

            // Hunan
            L.marker([28.2282, 112.9388], {icon: smallIcon}).addTo(map); // Changsha

            // Liaoning
            L.marker([41.8057, 123.4315], {icon: smallIcon}).addTo(map); // Shenyang
            L.marker([38.9140, 121.6147], {icon: smallIcon}).addTo(map); // Dalian

            // Jilin
            L.marker([43.8860, 125.3245], {icon: smallIcon}).addTo(map); // Changchun
            L.marker([42.8820, 129.5123], {icon: smallIcon}).addTo(map); // Yanji
            L.marker([42.9689, 129.8419], {icon: smallIcon}).addTo(map); // Tumen
            L.marker([42.1883, 128.1976], {icon: smallIcon}).addTo(map); // Changbai Mountain

            // Heilongjiang
            L.marker([45.8038, 126.5349], {icon: smallIcon}).addTo(map); // Harbin

            // Guizhou
            L.marker([26.6470, 106.6302], {icon: smallIcon}).addTo(map); // Guiyang
            L.marker([26.2536, 105.9280], {icon: smallIcon}).addTo(map); // Anshun

            // Guangxi
            L.marker([25.2736, 110.2900], {icon: smallIcon}).addTo(map); // Guilin

            // Hainan
            L.marker([20.0440, 110.1999], {icon: smallIcon}).addTo(map); // Haikou

            // Gansu
            L.marker([36.0611, 103.8343], {icon: smallIcon}).addTo(map); // Lanzhou


            // Tibet
            L.marker([29.6520, 91.1721], {icon: smallIcon}).addTo(map); // Lhasa
            L.marker([29.2670, 88.8800], {icon: smallIcon}).addTo(map); // Rikaze
            L.marker([28.6564, 87.1290], {icon: smallIcon}).addTo(map); // Dingri County

            // Xinjiang
            L.marker([43.9226, 81.3305], {icon: smallIcon}).addTo(map); // Yining
            L.marker([43.4412, 83.2676], {icon: smallIcon}).addTo(map); // Xinyuan County            
            L.marker([43.2623, 80.8303], {icon: smallIcon}).addTo(map); // Zhaosu County
            L.marker([43.2128, 81.8380], {icon: smallIcon}).addTo(map); // Tekesi County
            L.marker([44.1973, 80.4078], {icon: smallIcon}).addTo(map); // Khogors

            // ==============================International Locations==============================
            // Singapore
            L.marker([1.3521, 103.8198], {icon: smallIcon}).addTo(map); // Singapore
            // Malaysia
            L.marker([3.1390, 101.6869], {icon: smallIcon}).addTo(map); // Kuala Lumpur
            L.marker([5.9804, 116.0735], {icon: smallIcon}).addTo(map); // Kota Kinabalu
            L.marker([4.2442, 117.8916], {icon: smallIcon}).addTo(map); // Tawau
            L.marker([4.4787, 118.6111], {icon: smallIcon}).addTo(map); // Semporna
            // Vietnam
            L.marker([10.8231, 106.6297], {icon: smallIcon}).addTo(map); // Ho Chi Minh City
            // Japan
            L.marker([35.6895, 139.6917], {icon: smallIcon}).addTo(map); // Tokyo
            L.marker([34.6937, 135.5023], {icon: smallIcon}).addTo(map); // Osaka
            L.marker([35.0116, 135.7681], {icon: smallIcon}).addTo(map); // Kyoto
            L.marker([35.3606, 138.7274], {icon: smallIcon}).addTo(map); // Fuji
            // Azerbaijan
            L.marker([40.4093, 49.8671], {icon: smallIcon}).addTo(map); // Baku
            // Kazakhstan
            L.marker([44.1759, 80.0055], {icon: smallIcon}).addTo(map); // Jarkent
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }
    
    // Toggle province layer visibility
    function toggleProvinceLayer() {
        const toggleButton = document.getElementById('toggleProvinceLayer');
        
        if (!provinceLayer || !map) {
            console.log('Province layer not ready yet');
            toggleButton.textContent = 'Loading...';
            return;
        }
        
        if (isProvinceLayerVisible) {
            map.removeLayer(provinceLayer);
            isProvinceLayerVisible = false;
            toggleButton.textContent = 'Show Provinces Overlay';
            toggleButton.classList.remove('bg-red-600', 'hover:bg-red-700');
            toggleButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        } else {
            // If country layer is visible, hide it first
            if (isCountryLayerVisible && countryLayer) {
                map.removeLayer(countryLayer);
                isCountryLayerVisible = false;
                const countryButton = document.getElementById('toggleCountryLayer');
                if (countryButton) {
                    countryButton.textContent = 'Show Countries Overlay';
                    countryButton.classList.remove('bg-red-600', 'hover:bg-red-700');
                    countryButton.classList.add('bg-orange-600', 'hover:bg-orange-700');
                }
            }
            
            provinceLayer.addTo(map);
            isProvinceLayerVisible = true;
            toggleButton.textContent = 'Hide Provinces Overlay';
            toggleButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            toggleButton.classList.add('bg-red-600', 'hover:bg-red-700');
        }
    }
    
    // Toggle country layer visibility
    function toggleCountryLayer() {
        const toggleButton = document.getElementById('toggleCountryLayer');
        
        if (!countryLayer || !map) {
            console.log('Country layer not ready yet');
            toggleButton.textContent = 'Loading...';
            return;
        }
        
        if (isCountryLayerVisible) {
            map.removeLayer(countryLayer);
            isCountryLayerVisible = false;
            toggleButton.textContent = 'Show Countries Overlay';
            toggleButton.classList.remove('bg-red-600', 'hover:bg-red-700');
            toggleButton.classList.add('bg-orange-600', 'hover:bg-orange-700');
        } else {
            // If province layer is visible, hide it first
            if (isProvinceLayerVisible && provinceLayer) {
                map.removeLayer(provinceLayer);
                isProvinceLayerVisible = false;
                const provinceButton = document.getElementById('toggleProvinceLayer');
                if (provinceButton) {
                    provinceButton.textContent = 'Show Provinces Overlay';
                    provinceButton.classList.remove('bg-red-600', 'hover:bg-red-700');
                    provinceButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
                }
            }
            
            countryLayer.addTo(map);
            isCountryLayerVisible = true;
            toggleButton.textContent = 'Hide Countries Overlay';
            toggleButton.classList.remove('bg-orange-600', 'hover:bg-orange-700');
            toggleButton.classList.add('bg-red-600', 'hover:bg-red-700');
        }
    }
    
    // Reset map view to default
    function resetMapView() {
        if (!map) return;
        map.setView([35.8617, 104.1954], 4);
    }
    
    // Add event listeners for toggle buttons
    document.getElementById('toggleProvinceLayer').addEventListener('click', toggleProvinceLayer);
    document.getElementById('toggleCountryLayer').addEventListener('click', toggleCountryLayer);
    document.getElementById('resetMapView').addEventListener('click', resetMapView);
    
    // Store original click handler and wrap it
    const originalShowPage = showPage;
    showPage = function(pageId) {
        originalShowPage(pageId);
        
        // Initialize map when showing footprint page
        if (pageId === 'footprint') {
            setTimeout(initMap, 150);
        }
    };
    
    // Handle initial page load and browser back/forward
    function handleHashChange() {
        const hash = window.location.hash.substring(1) || 'home';
        showPage(hash);
    }
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
});
