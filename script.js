// ========================================
// CLASS: Float
// Represents a floating pontoon/section of the barge
// ========================================
class Float {
    constructor(id) {
        this.width = 20;
        this.height = 7;
        this.depth = 10;
        this.color = 0x8b4513;

        this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.material = new THREE.MeshPhongMaterial({ color: this.color });
        this.material.transparent = true;
        this.material.opacity = 0.8;
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.id = id;
        this.weight = 20000;
        this.waterDensity = 62.4;
    }

    setPosition(x, y, z) {
        this.mesh.position.set(x, y, z);
    }

    getPosition() {
        return this.mesh.position;
    }

    calculateDraft() {
        const volumeNeeded = this.weight / this.waterDensity;
        const draft = volumeNeeded / (this.width * this.depth);
        return draft;
    }
}

// ========================================
// CLASS: Item
// ========================================
class Item {
    constructor() {
        this.width = 2;
        this.height = 2;
        this.depth = 2;
        this.color = 0xff6347;

        this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.material = new THREE.MeshPhongMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }

    setPosition(x, y, z) {
        this.mesh.position.set(x, y, z);
    }

    getPosition() {
        return this.mesh.position;
    }
}

// ========================================
// CLASS: Barge
// ========================================
class Barge {
    constructor(scene) {
        this.scene = scene;
        this.floats = [];
        this.items = [];
        this.nextFloatId = 1;
        this.centerFlotation = new THREE.Vector3(0, 0, 0);
        this.tiltX = 0;
        this.tiltZ = 0;

        this.addFloat();
        this.addItem();
    }

    calculateCenterFlotation() {
        if (this.floats.length === 0) return;

        let totalArea = 0;
        let weightedX = 0;
        let weightedZ = 0;

        for (let float of this.floats) {
            const area = float.width * float.depth;
            const pos = float.getPosition();

            totalArea += area;
            weightedX += pos.x * area;
            weightedZ += pos.z * area;
        }

        this.centerFlotation.set(
            weightedX / totalArea,
            0,
            weightedZ / totalArea
        );
    }

    calculateArea() {
        let totalArea = 0;
        for (let float of this.floats) {
            totalArea += float.width * float.depth;
        }
        return totalArea;
    }

    addFloat() {
        const float = new Float(this.nextFloatId);
        this.nextFloatId++;

        const draft = float.calculateDraft();
        const yPosition = -draft + float.height / 2;

        let xPosition = 0;
        let zPosition = 0;

        if (this.floats.length > 0) {
            const lastFloat = this.floats[this.floats.length - 1];
            const lastPos = lastFloat.getPosition();
            xPosition = lastPos.x + lastFloat.width / 2 + float.width / 2;
            zPosition = lastPos.z;
        }

        float.setPosition(xPosition, yPosition, zPosition);
        float.restPosition = { x: xPosition, y: yPosition, z: zPosition };

        this.scene.add(float.mesh);
        this.floats.push(float);
        this.calculateCenterFlotation();

        return float;
    }

    addItem() {
        const item = new Item();
        const float = this.floats[0];
        const initialY = float.getPosition().y + float.height / 2 + item.height / 2;

        item.setPosition(
            this.centerFlotation.x,
            initialY,
            this.centerFlotation.z
        );
        this.scene.add(item.mesh);
        this.items.push(item);
        return item;
    }

    calculateTilt() {
        if (this.items.length > 0) {
            const item = this.items[0];
            const itemPos = item.getPosition();

            const offsetX = itemPos.x - this.centerFlotation.x;
            const offsetZ = itemPos.z - this.centerFlotation.z;

            const maxTilt = 0.05;

            this.tiltX = -(offsetZ / 5) * maxTilt;
            this.tiltZ = (offsetX / 10) * maxTilt;
        }
    }

    applyTiltToFloats() {
        for (let float of this.floats) {
            const restX = float.restPosition.x;
            const restY = float.restPosition.y;
            const restZ = float.restPosition.z;

            const relativeX = restX - this.centerFlotation.x;
            const relativeZ = restZ - this.centerFlotation.z;
            const relativeY = restY - this.centerFlotation.y;

            const cosX = Math.cos(-this.tiltX);
            const sinX = Math.sin(-this.tiltX);
            const cosZ = Math.cos(-this.tiltZ);
            const sinZ = Math.sin(-this.tiltZ);

            let tempX = relativeX * cosZ - relativeY * sinZ;
            let tempY = relativeX * sinZ + relativeY * cosZ;
            let tempZ = relativeZ;

            let newY = tempY * cosX - tempZ * sinX;
            let newZ = tempY * sinX + tempZ * cosX;
            let newX = tempX;

            float.mesh.position.x = this.centerFlotation.x + newX;
            float.mesh.position.y = this.centerFlotation.y + newY;
            float.mesh.position.z = this.centerFlotation.z + newZ;

            float.mesh.rotation.x = -this.tiltX;
            float.mesh.rotation.z = -this.tiltZ;
        }
    }

    updateItemPositions() {
        for (let item of this.items) {
            const itemPos = item.getPosition();
            const float = this.floats[0];
            const centerSurfaceY = float.restPosition.y + float.height / 2;

            const relativeX = itemPos.x - this.centerFlotation.x;
            const relativeZ = itemPos.z - this.centerFlotation.z;

            const surfacePoint = {
                x: relativeX,
                y: centerSurfaceY - this.centerFlotation.y,
                z: relativeZ
            };

            const cosX = Math.cos(-this.tiltX);
            const sinX = Math.sin(-this.tiltX);
            const cosZ = Math.cos(-this.tiltZ);
            const sinZ = Math.sin(-this.tiltZ);

            let y1 = surfacePoint.y * cosX - surfacePoint.z * sinX;
            let z1 = surfacePoint.y * sinX + surfacePoint.z * cosX;
            let x1 = surfacePoint.x;

            let x2 = x1 * cosZ - y1 * sinZ;
            let y2 = x1 * sinZ + y1 * cosZ;
            let z2 = z1;

            const rotatedSurfaceY = this.centerFlotation.y + y2;

            item.mesh.position.y = rotatedSurfaceY + item.height / 2;
            item.mesh.rotation.x = -this.tiltX;
            item.mesh.rotation.z = -this.tiltZ;
        }
    }

    update() {
        this.calculateCenterFlotation();
        this.calculateTilt();
        this.applyTiltToFloats();
        this.updateItemPositions();
    }

    moveItem(itemIndex, x, z) {
        if (itemIndex < this.items.length) {
            const item = this.items[itemIndex];
            const mainFloat = this.floats[0];

            const halfWidth = mainFloat.width / 2 - 1;
            const halfDepth = mainFloat.depth / 2 - 1;

            const constrainedX = Math.max(-halfWidth, Math.min(halfWidth, x));
            const constrainedZ = Math.max(-halfDepth, Math.min(halfDepth, z));

            item.mesh.position.x = constrainedX;
            item.mesh.position.z = constrainedZ;

            this.update();
        }
    }

    getItem(index = 0) {
        return this.items[index];
    }

    getFloat(index = 0) {
        return this.floats[index];
    }
}

// ========================================
// MAIN APPLICATION VARIABLES
// ========================================
let scene, camera, renderer;
let barge, water, plane;
let raycaster, mouse, isDragging = false;
let coordinatesDiv, coordinatesTimeout;
let axesScene, axesCamera, axesRenderer;
let isPerspective = true;
let cornerLabels = [];

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(25, 15, 25);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const waterGeometry = new THREE.PlaneGeometry(100, 100);
    const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x1e90ff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    scene.add(water);

    barge = new Barge(scene);

    const mainFloat = barge.getFloat(0);
    const planeGeometry = new THREE.PlaneGeometry(mainFloat.width, mainFloat.depth);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    const floatPos = mainFloat.getPosition();
    plane.position.y = floatPos.y + mainFloat.height / 2;
    scene.add(plane);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    coordinatesDiv = document.getElementById('coordinates');

    setupEventListeners();
    setupAxesHelper();
    setupCornerLabels();
}

function setupEventListeners() {
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onWindowResize);

    let isRotating = false;
    let previousMousePosition = { x: 0, y: 0 };

    renderer.domElement.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            isRotating = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isRotating) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            const radius = Math.sqrt(
                camera.position.x ** 2 +
                camera.position.y ** 2 +
                camera.position.z ** 2
            );

            const theta = Math.atan2(camera.position.z, camera.position.x);
            const phi = Math.acos(camera.position.y / radius);

            const newTheta = theta + deltaX * 0.01;
            const newPhi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - deltaY * 0.01));

            camera.position.x = radius * Math.sin(newPhi) * Math.cos(newTheta);
            camera.position.z = radius * Math.sin(newPhi) * Math.sin(newTheta);
            camera.position.y = radius * Math.cos(newPhi);

            camera.lookAt(0, 0, 0);

            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    renderer.domElement.addEventListener('mouseup', (e) => {
        if (e.button === 2) {
            isRotating = false;
        }
    });

    renderer.domElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 2;
        const direction = e.deltaY > 0 ? 1 : -1;

        const factor = 1 + direction * zoomSpeed * 0.01;
        camera.position.x *= factor;
        camera.position.y *= factor;
        camera.position.z *= factor;

        camera.lookAt(0, 0, 0);
    }, { passive: false });

    document.getElementById('resetButton').addEventListener('click', resetCamera);
    document.getElementById('xzViewButton').addEventListener('click', setXZView);
    document.getElementById('xyViewButton').addEventListener('click', setXYView);
    document.getElementById('yzViewButton').addEventListener('click', setYZView);
    document.getElementById('toggleProjectionButton').addEventListener('click', toggleProjection);

    document.getElementById('viewDropdown').addEventListener('click', function () {
        document.getElementById('viewContent').classList.toggle('active');
    });

    document.getElementById('buildDropdown').addEventListener('click', function () {
        document.getElementById('buildContent').classList.toggle('active');
    });

    document.getElementById('addItemButton').addEventListener('click', addNewItem);
    document.getElementById('addFloatButton').addEventListener('click', addNewFloat);

    document.getElementById('panel').addEventListener('mouseleave', function () {
        document.getElementById('viewContent').classList.remove('active');
        document.getElementById('buildContent').classList.remove('active');
    });
}

function onMouseDown(event) {
    if (event.button !== 0) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const item = barge.getItem(0);
    const itemIntersects = raycaster.intersectObject(item.mesh);

    if (itemIntersects.length > 0) {
        isDragging = true;
        showCoordinates();
        hideFloatProperties();
    } else {
        const float = barge.getFloat(0);
        const floatIntersects = raycaster.intersectObject(float.mesh);

        if (floatIntersects.length > 0) {
            showFloatProperties();
            hideCoordinates();
        } else {
            hideCoordinates();
            hideFloatProperties();
        }
    }
}

function onMouseMove(event) {
    if (!isDragging) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(plane);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        barge.moveItem(0, point.x, point.z);
    }
}

function onMouseUp(event) {
    if (event.button === 0) {
        isDragging = false;
    }
}

function setupAxesHelper() {
    axesScene = new THREE.Scene();
    axesScene.background = new THREE.Color(0xf0f0f0);

    axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    axesCamera.position.set(3, 3, 3);
    axesCamera.lookAt(0, -0.2, 0);

    axesRenderer = new THREE.WebGLRenderer({ antialias: true });
    axesRenderer.setSize(100, 100);
    document.getElementById('axesHelper').appendChild(axesRenderer.domElement);

    const axisLength = 0.8;

    const xGeometry = new THREE.CylinderGeometry(0.03, 0.03, axisLength, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = axisLength / 2;
    axesScene.add(xAxis);

    const yGeometry = new THREE.CylinderGeometry(0.03, 0.03, axisLength, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.y = axisLength / 2;
    axesScene.add(yAxis);

    const zGeometry = new THREE.CylinderGeometry(0.03, 0.03, axisLength, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = axisLength / 2;
    axesScene.add(zAxis);

    const xLabelTexture = createTextTexture('X', '#ff0000');
    const xLabelMaterial = new THREE.SpriteMaterial({ map: xLabelTexture });
    const xLabel = new THREE.Sprite(xLabelMaterial);
    xLabel.position.set(axisLength + 0.15, 0, 0);
    xLabel.scale.set(0.3, 0.3, 1);
    axesScene.add(xLabel);

    const yLabelTexture = createTextTexture('Y', '#00ff00');
    const yLabelMaterial = new THREE.SpriteMaterial({ map: yLabelTexture });
    const yLabel = new THREE.Sprite(yLabelMaterial);
    yLabel.position.set(0, axisLength + 0.15, 0);
    yLabel.scale.set(0.3, 0.3, 1);
    axesScene.add(yLabel);

    const zLabelTexture = createTextTexture('Z', '#0000ff');
    const zLabelMaterial = new THREE.SpriteMaterial({ map: zLabelTexture });
    const zLabel = new THREE.Sprite(zLabelMaterial);
    zLabel.position.set(0, 0, axisLength + 0.15);
    zLabel.scale.set(0.3, 0.3, 1);
    axesScene.add(zLabel);

    const light = new THREE.AmbientLight(0xffffff, 1);
    axesScene.add(light);
}

function createTextTexture(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color;
    ctx.font = 'Bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function setupCornerLabels() {
    for (let i = 0; i < 8; i++) {
        const label = document.createElement('div');
        label.className = 'corner-label';
        document.body.appendChild(label);
        cornerLabels.push(label);
    }
}

function hideCoordinates() {
    coordinatesDiv.classList.remove('visible');
    if (coordinatesTimeout) {
        clearTimeout(coordinatesTimeout);
    }
}

function showCoordinates() {
    if (coordinatesTimeout) {
        clearTimeout(coordinatesTimeout);
    }

    coordinatesDiv.classList.add('visible');

    if (!document.getElementById('coordX')) {
        const item = barge.getItem(0);
        const pos = item.getPosition();
        const x = pos.x.toFixed(2);
        const z = pos.z.toFixed(2);
        coordinatesDiv.innerHTML = `
                    X: <input type="number" id="coordX" class="coord-input" value="${x}" step="0.1"> | 
                    Z: <input type="number" id="coordZ" class="coord-input" value="${z}" step="0.1">
                `;

        document.getElementById('coordX').addEventListener('change', updateItemPosition);
        document.getElementById('coordZ').addEventListener('change', updateItemPosition);
        document.getElementById('coordX').addEventListener('input', showCoordinates);
        document.getElementById('coordZ').addEventListener('input', showCoordinates);
        document.getElementById('coordX').addEventListener('mousedown', (e) => e.stopPropagation());
        document.getElementById('coordZ').addEventListener('mousedown', (e) => e.stopPropagation());
    }

    coordinatesTimeout = setTimeout(() => {
        coordinatesDiv.classList.remove('visible');
    }, 5000);
}

function updateCoordinates() {
    if (!coordinatesDiv.classList.contains('visible')) return;

    const item = barge.getItem(0);
    const pos = item.getPosition();
    const x = pos.x.toFixed(2);
    const z = pos.z.toFixed(2);

    const vector = new THREE.Vector3(pos.x, pos.y + 1.5, pos.z);
    vector.project(camera);

    const screenX = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    coordinatesDiv.style.left = screenX + 'px';
    coordinatesDiv.style.top = screenY + 'px';

    const xInput = document.getElementById('coordX');
    const zInput = document.getElementById('coordZ');
    if (xInput && document.activeElement !== xInput) {
        xInput.value = x;
    }
    if (zInput && document.activeElement !== zInput) {
        zInput.value = z;
    }
}

function updateItemPosition() {
    const xInput = document.getElementById('coordX');
    const zInput = document.getElementById('coordZ');

    if (xInput && zInput) {
        let newX = parseFloat(xInput.value);
        let newZ = parseFloat(zInput.value);

        barge.moveItem(0, newX, newZ);

        const item = barge.getItem(0);
        const pos = item.getPosition();
        xInput.value = pos.x.toFixed(2);
        zInput.value = pos.z.toFixed(2);
    }
}

function showFloatProperties() {
    const float = barge.getFloat(0);
    const pos = float.getPosition();
    const draft = float.calculateDraft();

    document.getElementById('floatId').textContent = float.id;
    document.getElementById('floatLength').value = float.width.toFixed(2);
    document.getElementById('floatWidth').value = float.depth.toFixed(2);
    document.getElementById('floatHeight').value = float.height.toFixed(2);
    document.getElementById('floatWeight').value = float.weight.toFixed(0);
    document.getElementById('floatDraft').textContent = draft.toFixed(2);
    document.getElementById('floatPosX').value = pos.x.toFixed(2);
    document.getElementById('floatPosY').value = pos.y.toFixed(2);
    document.getElementById('floatPosZ').value = pos.z.toFixed(2);

    const panel = document.getElementById('floatProperties');
    if (!panel.classList.contains('visible')) {
        panel.classList.add('visible');

        document.getElementById('floatLength').addEventListener('change', updateFloatProperties);
        document.getElementById('floatWidth').addEventListener('change', updateFloatProperties);
        document.getElementById('floatHeight').addEventListener('change', updateFloatProperties);
        document.getElementById('floatWeight').addEventListener('change', updateFloatProperties);
        document.getElementById('floatPosX').addEventListener('change', updateFloatProperties);
        document.getElementById('floatPosY').addEventListener('change', updateFloatProperties);
        document.getElementById('floatPosZ').addEventListener('change', updateFloatProperties);
    }
}

function updateFloatProperties() {
    const float = barge.getFloat(0);

    const newLength = parseFloat(document.getElementById('floatLength').value);
    const newWidth = parseFloat(document.getElementById('floatWidth').value);
    const newHeight = parseFloat(document.getElementById('floatHeight').value);
    const newWeight = parseFloat(document.getElementById('floatWeight').value);
    const newPosX = parseFloat(document.getElementById('floatPosX').value);
    const newPosZ = parseFloat(document.getElementById('floatPosZ').value);

    const posYInput = document.getElementById('floatPosY');
    const manualYChange = (document.activeElement === posYInput);

    let recalculateY = false;

    if (!isNaN(newLength) && newLength > 0) {
        float.width = newLength;
        recalculateY = true;
    }
    if (!isNaN(newWidth) && newWidth > 0) {
        float.depth = newWidth;
        recalculateY = true;
    }
    if (!isNaN(newHeight) && newHeight > 0) {
        float.height = newHeight;
        recalculateY = true;
    }

    if (!isNaN(newWeight) && newWeight > 0) {
        float.weight = newWeight;
        recalculateY = true;
    }

    if (!isNaN(newPosX)) {
        float.mesh.position.x = newPosX;
    }
    if (!isNaN(newPosZ)) {
        float.mesh.position.z = newPosZ;
    }

    float.mesh.geometry.dispose();
    float.geometry = new THREE.BoxGeometry(float.width, float.height, float.depth);
    float.mesh.geometry = float.geometry;

    plane.geometry.dispose();
    plane.geometry = new THREE.PlaneGeometry(float.width, float.depth);

    if (recalculateY && !manualYChange) {
        const draft = float.calculateDraft();
        const yPosition = -draft + float.height / 2;
        float.mesh.position.y = yPosition;
        posYInput.value = yPosition.toFixed(2);
    } else if (manualYChange) {
        const newPosY = parseFloat(posYInput.value);
        if (!isNaN(newPosY)) {
            float.mesh.position.y = newPosY;
        }
    }

    barge.calculateCenterFlotation();

    plane.position.y = float.getPosition().y + float.height / 2;

    const draft = float.calculateDraft();
    document.getElementById('floatDraft').textContent = draft.toFixed(2);

    barge.update();
}

function hideFloatProperties() {
    document.getElementById('floatProperties').classList.remove('visible');
}

function addNewItem() {
    barge.addItem();
    document.getElementById('buildContent').classList.remove('active');
}

function addNewFloat() {
    barge.addFloat();

    const mainFloat = barge.getFloat(0);
    plane.geometry.dispose();
    plane.geometry = new THREE.PlaneGeometry(mainFloat.width, mainFloat.depth);
    const floatPos = mainFloat.getPosition();
    plane.position.y = floatPos.y + mainFloat.height / 2;

    document.getElementById('buildContent').classList.remove('active');
}

function resetCamera() {
    camera.position.set(25, 15, 25);
    camera.lookAt(0, 0, 0);
    document.getElementById('viewContent').classList.remove('active');
}

function setXZView() {
    camera.position.set(0, 40, 0);
    camera.lookAt(0, 0, 0);
    document.getElementById('viewContent').classList.remove('active');
}

function setXYView() {
    camera.position.set(0, 0.5, 40);
    camera.lookAt(0, 0, 0);
    document.getElementById('viewContent').classList.remove('active');
}

function setYZView() {
    camera.position.set(40, 0.5, 0);
    camera.lookAt(0, 0, 0);
    document.getElementById('viewContent').classList.remove('active');
}

function toggleProjection() {
    const position = camera.position.clone();
    const aspect = window.innerWidth / window.innerHeight;

    if (isPerspective) {
        const frustumSize = 30;
        camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        isPerspective = false;
        document.getElementById('toggleProjectionButton').textContent = 'Perspective View';
    } else {
        camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        isPerspective = true;
        document.getElementById('toggleProjectionButton').textContent = 'Orthographic View';
    }

    camera.position.copy(position);
    camera.lookAt(0, 0, 0);

    document.getElementById('viewContent').classList.remove('active');
}

function onWindowResize() {
    if (isPerspective) {
        camera.aspect = window.innerWidth / window.innerHeight;
    } else {
        const frustumSize = 30;
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = frustumSize * aspect / -2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = frustumSize / -2;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    barge.update();
    updateCoordinates();
    updateBargeProperties();

    axesCamera.position.copy(camera.position).normalize().multiplyScalar(3);
    axesCamera.lookAt(0, -0.2, 0);

    renderer.render(scene, camera);
    axesRenderer.render(axesScene, axesCamera);
}

function updateBargeProperties() {
    const mainFloat = barge.floats[0];
    const draft = mainFloat.calculateDraft();

    document.getElementById('bargeTotalFloats').textContent = barge.floats.length;
    document.getElementById('bargeTotalItems').textContent = barge.items.length;
    document.getElementById('bargeArea').textContent = barge.calculateArea().toFixed(2);
    document.getElementById('bargeDraft').textContent = draft.toFixed(2);
    document.getElementById('bargeLength').textContent = mainFloat.width.toFixed(2);
    document.getElementById('bargeWidth').textContent = mainFloat.depth.toFixed(2);
    document.getElementById('bargeCenterX').textContent = barge.centerFlotation.x.toFixed(2);
    document.getElementById('bargeCenterY').textContent = barge.centerFlotation.y.toFixed(2);
    document.getElementById('bargeCenterZ').textContent = barge.centerFlotation.z.toFixed(2);
    document.getElementById('bargeTiltX').textContent = (barge.tiltX * 180 / Math.PI).toFixed(2);
    document.getElementById('bargeTiltZ').textContent = (barge.tiltZ * 180 / Math.PI).toFixed(2);
}