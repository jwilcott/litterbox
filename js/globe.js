let scene, camera, renderer, globeModel;

const GLOBE_COLOR = 0x33ff33;

function createFallbackGlobe() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: GLOBE_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 0.4
    });

    return new THREE.Mesh(geometry, material);
}

function createGlobeLineMaterial() {
    return new THREE.LineBasicMaterial({
        color: GLOBE_COLOR,
        transparent: true,
        opacity: 0.85
    });
}

function parseObjLinePaths(objText) {
    const vertices = [];
    const paths = [];

    objText.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.trim();

        if (!line || line.startsWith('#')) {
            return;
        }

        if (line.startsWith('v ')) {
            const [, x, y, z] = line.split(/\s+/);
            vertices.push(new THREE.Vector3(Number(x), Number(y), Number(z)));
            return;
        }

        if (!line.startsWith('l ')) {
            return;
        }

        const points = line
            .split(/\s+/)
            .slice(1)
            .map((token) => {
                const vertexToken = token.split('/')[0];
                const vertexIndex = Number(vertexToken);

                if (Number.isNaN(vertexIndex)) {
                    return null;
                }

                const normalizedIndex = vertexIndex < 0
                    ? vertices.length + vertexIndex
                    : vertexIndex - 1;

                return vertices[normalizedIndex] || null;
            })
            .filter(Boolean);

        if (points.length >= 2) {
            paths.push(points);
        }
    });

    return paths;
}

function buildGlobeFromPaths(paths) {
    const group = new THREE.Group();
    const material = createGlobeLineMaterial();

    paths.forEach((points) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const coastline = new THREE.Line(geometry, material);
        group.add(coastline);
    });

    return group;
}

function styleLoadedGlobe(object) {
    const lineMaterial = createGlobeLineMaterial();
    const meshMaterial = new THREE.MeshBasicMaterial({
        color: GLOBE_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });

    object.traverse((child) => {
        if (child.isLine || child.isLineSegments) {
            child.material = lineMaterial;
        } else if (child.isMesh) {
            child.material = meshMaterial;
        }
    });

    object.rotation.x = -0.15;
    object.rotation.y = 0.3;
    object.scale.setScalar(1.02);

    return object;
}

function loadGlobeModel() {
    fetch('assets/world-coastlines.obj')
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to load globe model: ${response.status}`);
            }

            return response.text();
        })
        .then((objText) => {
            const coastlinePaths = parseObjLinePaths(objText);

            if (coastlinePaths.length === 0) {
                throw new Error('No coastline paths found in globe model');
            }

            if (globeModel) {
                scene.remove(globeModel);
            }

            globeModel = styleLoadedGlobe(buildGlobeFromPaths(coastlinePaths));
            scene.add(globeModel);
        })
        .catch(() => {
            globeModel = createFallbackGlobe();
            scene.add(globeModel);
        });
}

function initGlobe() {
    scene = new THREE.Scene();
    
    const container = document.getElementById('globeCanvas');
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({
        canvas: container,
        alpha: true,
        antialias: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight, false);

    loadGlobeModel();
    camera.position.z = 2.5;
}

function animateGlobe() {
    requestAnimationFrame(animateGlobe);
    if (globeModel) {
        globeModel.rotation.y += 0.005;
    }
    renderer.render(scene, camera);
}

initGlobe();
animateGlobe();

// Handle window resize
window.addEventListener('resize', () => {
    const width = document.getElementById('globeCanvas').clientWidth;
    const height = document.getElementById('globeCanvas').clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});
