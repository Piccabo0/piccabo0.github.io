let stampsInitialized = false;
let stampsManifest = [];
let stampsResizeTimer = null;

function mulberry32(seed) {
    let t = seed;
    return function() {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), t | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function getHashSeed(text) {
    let hash = 1779033703;
    for (let i = 0; i < text.length; i += 1) {
        hash = Math.imul(hash ^ text.charCodeAt(i), 3432918353);
        hash = (hash << 13) | (hash >>> 19);
    }
    return hash >>> 0;
}

function parseStampLabel(path) {
    const fileName = String(path || '').split('/').pop() || '';
    const noExt = fileName.replace(/\.[^.]+$/, '');
    const compact = noExt.replace(/[-_]+/g, ' ').trim();
    return compact || 'Postmark';
}

function intersects(a, b) {
    const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const overlapArea = overlapX * overlapY;
    const aArea = (a.right - a.left) * (a.bottom - a.top);
    return overlapArea > aArea * 0.23;
}

function buildStampCard(path, index) {
    const paper = document.createElement('article');
    paper.className = 'stamp-paper';
    paper.dataset.index = String(index);
    paper.title = parseStampLabel(path);

    const image = document.createElement('img');
    image.src = path;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = parseStampLabel(path);

    paper.appendChild(image);
    return paper;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function layoutStampPapers(board, imagePaths) {
    if (!board) {
        return;
    }

    board.innerHTML = '';

    const boardWidth = Math.max(320, board.clientWidth - 4);
    const navHeight = 48;
    const boardHeight = Math.max(420, window.innerHeight - navHeight);
    board.style.height = `${boardHeight}px`;

    const totalCards = imagePaths.length;
    const shuffledPaths = imagePaths.slice();
    const orderRng = mulberry32(getHashSeed(`${imagePaths.join('|')}|order`));
    for (let i = shuffledPaths.length - 1; i > 0; i -= 1) {
        const j = Math.floor(orderRng() * (i + 1));
        [shuffledPaths[i], shuffledPaths[j]] = [shuffledPaths[j], shuffledPaths[i]];
    }

    const isMobile = window.innerWidth <= 768;
    const cardWidth = isMobile ? 132 : 178;
    const framePadding = isMobile ? 6 : 8;
    const cardHeight = cardWidth + framePadding * 3;
    const bleedX = Math.round(cardWidth * 0.2);
    const bleedY = Math.round(cardHeight * 0.2);

    const rng = mulberry32(getHashSeed(imagePaths.join('|')));
    const overlapFactor = isMobile ? 0.62 : 0.66;
    const stepX = Math.max(24, cardWidth * overlapFactor);
    const expandedWidth = boardWidth + bleedX * 2;
    const cols = Math.max(1, Math.ceil((expandedWidth - cardWidth) / stepX) + 1);
    const rowStepFactor = isMobile ? 0.58 : 0.62;
    const stepY = Math.max(20, cardHeight * rowStepFactor);
    const expandedHeight = boardHeight + bleedY * 2;
    const rows = Math.max(1, Math.ceil((expandedHeight - cardHeight) / stepY) + 1);
    const layerCapacity = Math.max(1, cols * rows);
    const layerCount = Math.max(1, Math.ceil(totalCards / layerCapacity));

    shuffledPaths.forEach((path, index) => {
        const paper = buildStampCard(path, index);
        const layer = Math.floor(index / layerCapacity);
        const slot = index % layerCapacity;
        const row = Math.floor(slot / cols);
        const col = slot % cols;

        const rotation = (rng() * 34) - 17;
        const scale = 0.94 + rng() * 0.14;
        const jitterX = (rng() - 0.5) * cardWidth * 0.34;
        const jitterY = (rng() - 0.5) * cardHeight * 0.3;
        const layerOffsetX = (layer % 2 === 0 ? 1 : -1) * (cardWidth * 0.2 + rng() * cardWidth * 0.12);
        const layerOffsetY = (layer / Math.max(1, layerCount - 1)) * (cardHeight * 0.32);
        const minLeft = -bleedX;
        const maxLeft = boardWidth - cardWidth + bleedX;
        const minTop = -bleedY;
        const maxTop = boardHeight - cardHeight + bleedY;
        const x = Math.round(clamp(-bleedX + col * stepX + layerOffsetX + jitterX, minLeft, maxLeft));
        const y = Math.round(clamp(-bleedY + row * stepY + layerOffsetY + jitterY, minTop, maxTop));

        paper.style.width = `${cardWidth}px`;
        paper.style.padding = `${framePadding}px`;
        paper.style.transform = `rotate(${rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

        paper.style.left = `${x}px`;
        paper.style.top = `${y}px`;
        paper.style.zIndex = String(100 + layer * 100 + slot);

        paper.addEventListener('mouseenter', () => {
            paper.style.zIndex = String(5000 + index);
            paper.style.transform += ' translateY(-5px)';
        });

        paper.addEventListener('mouseleave', () => {
            paper.style.zIndex = String(100 + layer * 100 + slot);
            paper.style.transform = paper.style.transform.replace(' translateY(-5px)', '');
        });

        board.appendChild(paper);
    });
}

function normalizeManifestPaths(stamps) {
    return (Array.isArray(stamps) ? stamps : []).map(path => String(path || '').replace(/\\/g, '/'));
}

function renderStampsBoard() {
    const board = document.getElementById('stampsBoard');
    if (!board || stampsManifest.length === 0) {
        return;
    }

    layoutStampPapers(board, stampsManifest);
}

function initStampsPage() {
    const board = document.getElementById('stampsBoard');
    if (!board || stampsInitialized) {
        return;
    }

    stampsInitialized = true;

    fetch('data/stamps_manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load stamps manifest: ${response.status}`);
            }
            return response.json();
        })
        .then(manifest => {
            stampsManifest = normalizeManifestPaths(manifest.stamps);
            renderStampsBoard();
        })
        .catch(error => {
            console.error('Error loading stamps manifest:', error);
            board.innerHTML = '<p class="text-red-700 text-sm p-4">Unable to load stamp images.</p>';
        });

    window.addEventListener('resize', () => {
        if (stampsResizeTimer) {
            clearTimeout(stampsResizeTimer);
        }
        stampsResizeTimer = setTimeout(() => {
            renderStampsBoard();
        }, 180);
    });
}
