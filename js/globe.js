let scene, camera, renderer, sphere;

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
    
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x33ff33,
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    
    camera.position.z = 2.5;
}

function animateGlobe() {
    requestAnimationFrame(animateGlobe);
    sphere.rotation.y += 0.005;
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
