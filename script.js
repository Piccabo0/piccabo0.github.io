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
    
    // Store original click handler and wrap it
    const originalShowPage = showPage;
    showPage = function(pageId) {
        originalShowPage(pageId);
        
        // Initialize CesiumJS map when showing footprints page
        if (pageId === 'footprints' && typeof initCesiumMap === 'function') {
            setTimeout(initCesiumMap, 150);
        }

        // Initialize stamps board when showing stamps page
        if (pageId === 'stamps' && typeof initStampsPage === 'function') {
            setTimeout(initStampsPage, 100);
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
