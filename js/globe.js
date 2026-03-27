let scene, camera, renderer, globeModel;

function createFallbackGlobe() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x33ff33,
        wireframe: true,
        transparent: true,
        opacity: 0.4
    });

    return new THREE.Mesh(geometry, material);
}

function styleLoadedGlobe(object) {
    object.traverse((child) => {
        if (child.isLine || child.isLineSegments) {
            child.material = new THREE.LineBasicMaterial({
                color: 0x33ff33,
                transparent: true,
                opacity: 0.85
            });
        } else if (child.isMesh) {
            child.material = new THREE.MeshBasicMaterial({
                color: 0x33ff33,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
        }
    });

    object.rotation.x = -0.15;
    object.rotation.y = 0.3;
    object.scale.setScalar(1.02);

    return object;
}

function loadGlobeModel() {
    const loader = new THREE.OBJLoader();

    loader.load(
        'assets/world-coastlines.obj',
        (object) => {
            if (globeModel) {
                scene.remove(globeModel);
            }

            globeModel = styleLoadedGlobe(object);
            scene.add(globeModel);
        },
        undefined,
        () => {
            globeModel = createFallbackGlobe();
            scene.add(globeModel);
        }
    );
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
