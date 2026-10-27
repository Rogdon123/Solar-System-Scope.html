import * as THREE from 'three';

// ============================================================
// 1. 天体数据
// ============================================================
const BODIES = {
    sun: {
        name: '太阳', radius: 3.5, color: 0xffaa33, distance: 0, speed: 0,
        info: { '类型': 'G型主序星', '直径': '约 139.2 万公里', '表面温度': '约 5,500°C', '质量占比': '太阳系 99.86%', '年龄': '约 46 亿年' }
    },
    mercury: {
        name: '水星', radius: 0.35, color: 0x9e9e9e, distance: 7, speed: 0.04,
        info: { '类型': '类地行星', '直径': '4,879 公里', '公转周期': '88 地球日', '自转周期': '58.6 地球日', '表面温度': '-173°C 至 427°C' }
    },
    venus: {
        name: '金星', radius: 0.55, color: 0xe8b46a, distance: 10, speed: 0.025,
        info: { '类型': '类地行星', '直径': '12,104 公里', '公转周期': '225 地球日', '自转周期': '243 地球日（逆向）', '表面温度': '约 465°C' }
    },
    earth: {
        name: '地球', radius: 0.6, color: 0x3a7bd5, distance: 13.5, speed: 0.018,
        info: { '类型': '类地行星', '直径': '12,742 公里', '公转周期': '365.25 天', '自转周期': '23 小时 56 分', '卫星': '1 颗（月球）' }
    },
    mars: {
        name: '火星', radius: 0.45, color: 0xc1440e, distance: 17, speed: 0.014,
        info: { '类型': '类地行星', '直径': '6,779 公里', '公转周期': '687 地球日', '自转周期': '24 小时 37 分', '卫星': '2 颗' }
    },
    jupiter: {
        name: '木星', radius: 1.6, color: 0xc9a87c, distance: 24, speed: 0.008,
        info: { '类型': '气态巨行星', '直径': '139,820 公里', '公转周期': '11.86 地球年', '自转周期': '9 小时 56 分', '卫星': '95 颗以上' }
    },
    saturn: {
        name: '土星', radius: 1.35, color: 0xe0c080, distance: 31, speed: 0.006,
        info: { '类型': '气态巨行星', '直径': '116,460 公里', '公转周期': '29.46 地球年', '自转周期': '10 小时 42 分', '光环': '冰粒与岩石构成' }
    },
    uranus: {
        name: '天王星', radius: 0.9, color: 0x7ec8e3, distance: 37, speed: 0.004,
        info: { '类型': '冰巨星', '直径': '50,724 公里', '公转周期': '84 地球年', '自转周期': '17 小时 14 分（侧躺）', '卫星': '28 颗' }
    },
    neptune: {
        name: '海王星', radius: 0.88, color: 0x3b5ba5, distance: 43, speed: 0.003,
        info: { '类型': '冰巨星', '直径': '49,244 公里', '公转周期': '164.8 地球年', '自转周期': '16 小时 6 分', '卫星': '16 颗' }
    }
};

// ============================================================
// 2. Three.js 场景（无 OrbitControls，完全手控）
// ============================================================
const container = document.getElementById('canvas-container');
const loadingEl = document.getElementById('loading');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020408);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 28, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// 相机注视目标（固定太阳位置）
const cameraTarget = new THREE.Vector3(0, 0, 0);
const initialCameraOffset = camera.position.clone().sub(cameraTarget);
let orbitYaw = Math.atan2(initialCameraOffset.x, initialCameraOffset.z);
let orbitPitch = Math.asin(initialCameraOffset.y / initialCameraOffset.length());

// ============================================================
// 3. 光照 + 星空
// ============================================================
scene.add(new THREE.AmbientLight(0x405060, 1.05));
const sunLight = new THREE.PointLight(0xffdd99, 2.5, 0, 0);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
fillLight.position.set(-20, 30, 20);
scene.add(fillLight);

function createStars() {
    const count = 4000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
        const r = 200 + Math.random() * 600;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i] = r * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0.85, sizeAttenuation: true })));
}
createStars();

// ============================================================
// 4. 创建天体
// ============================================================
const planets = [];
const clickableMeshes = [];

function createSurfaceTexture(key) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const image = context.createImageData(canvas.width, canvas.height);
    const pixels = image.data;
    const hash = (x, y, seed) => {
        const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
        return value - Math.floor(value);
    };
    const noise = (x, y, seed) => {
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const fx = x - x0, fy = y - y0;
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const top = THREE.MathUtils.lerp(hash(x0, y0, seed), hash(x0 + 1, y0, seed), sx);
        const bottom = THREE.MathUtils.lerp(hash(x0, y0 + 1, seed), hash(x0 + 1, y0 + 1, seed), sx);
        return THREE.MathUtils.lerp(top, bottom, sy);
    };
    const palettes = {
        sun: [[190, 48, 7], [255, 195, 55]],
        mercury: [[58, 55, 51], [184, 164, 137]],
        venus: [[133, 66, 20], [255, 220, 143]],
        earth: [[8, 39, 91], [43, 125, 83]],
        mars: [[91, 38, 23], [229, 117, 65]],
        jupiter: [[111, 58, 37], [235, 197, 149]],
        saturn: [[132, 103, 58], [246, 224, 169]],
        uranus: [[24, 105, 127], [153, 232, 236]],
        neptune: [[20, 43, 112], [87, 157, 238]]
    };
    const [dark, light] = palettes[key];

    for (let y = 0; y < canvas.height; y++) {
        const latitude = y / canvas.height;
        for (let x = 0; x < canvas.width; x++) {
            const u = x / canvas.width;
            const broad = noise(u * 7, latitude * 5, key.length);
            const detail = noise(u * 31, latitude * 17, key.length + 4);
            const fine = noise(u * 96, latitude * 48, key.length + 9);
            const band = Math.sin(latitude * (key === 'jupiter' ? 100 : 62) + broad * 3.4);
            let amount = 0.28 + broad * 0.5 + detail * 0.18;
            let red, green, blue;

            if (key === 'earth') {
                const continent = broad * 0.72 + detail * 0.28 > 0.54;
                const polar = Math.abs(latitude - 0.5) > 0.455;
                const ocean = [8, 39, 91];
                const land = polar ? [204, 218, 210] : [44 + detail * 46, 99 + broad * 58, 55 + detail * 24];
                [red, green, blue] = continent ? land : ocean.map((value, index) => value + detail * [7, 17, 26][index]);
                if (fine > 0.79 && !polar) [red, green, blue] = [207, 220, 224];
            } else if (['jupiter', 'saturn', 'venus', 'uranus', 'neptune'].includes(key)) {
                amount = 0.48 + band * 0.19 + broad * 0.25 + (fine - 0.5) * 0.12;
                if (key === 'venus') amount = 0.42 + Math.sin(latitude * 34 + broad * 5) * 0.14 + detail * 0.35;
                if (key === 'uranus' || key === 'neptune') amount = 0.5 + band * 0.1 + broad * 0.28;
                [red, green, blue] = dark.map((value, index) => value + (light[index] - value) * amount);
            } else {
                [red, green, blue] = dark.map((value, index) => value + (light[index] - value) * amount);
            }

            const pixel = (y * canvas.width + x) * 4;
            pixels[pixel] = red;
            pixels[pixel + 1] = green;
            pixels[pixel + 2] = blue;
            pixels[pixel + 3] = 255;
        }
    }
    context.putImageData(image, 0, 0);

    if (key === 'mercury' || key === 'mars') {
        for (let i = 0; i < 36; i++) {
            const x = hash(i, 2, key.length) * canvas.width;
            const y = 18 + hash(i, 7, key.length) * (canvas.height - 36);
            const radius = 2 + hash(i, 13, key.length) * (key === 'mercury' ? 13 : 7);
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fillStyle = 'rgba(24, 20, 18, 0.2)';
            context.fill();
            context.beginPath();
            context.arc(x - radius * 0.15, y - radius * 0.18, radius * 0.72, 0, Math.PI * 2);
            context.strokeStyle = 'rgba(245, 220, 190, 0.22)';
            context.lineWidth = Math.max(1, radius * 0.12);
            context.stroke();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function createSun() {
    const d = BODIES.sun;
    const texture = createSurfaceTexture('sun');
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(d.radius, 48, 48),
        new THREE.MeshStandardMaterial({
            map: texture,
            emissive: 0xffffff,
            emissiveMap: texture,
            emissiveIntensity: 0.45,
            roughness: 0.4
        })
    );
    mesh.userData = { bodyKey: 'sun', ...d };
    scene.add(mesh);
    clickableMeshes.push(mesh);

    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(d.radius * 1.25, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.12 })
    );
    scene.add(glow);
}

function createPlanet(key) {
    const d = BODIES[key];
    if (key === 'sun') { createSun(); return; }

    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(d.radius, 32, 32),
        new THREE.MeshStandardMaterial({ map: createSurfaceTexture(key), roughness: 0.82, metalness: 0.02 })
    );
    mesh.userData = { bodyKey: key, ...d };

    const angle = Math.random() * Math.PI * 2;
    mesh.position.x = Math.cos(angle) * d.distance;
    mesh.position.z = Math.sin(angle) * d.distance;
    scene.add(mesh);
    clickableMeshes.push(mesh);

    if (key === 'saturn') {
        const rings = new THREE.Mesh(
            new THREE.RingGeometry(d.radius * 1.45, d.radius * 2.55, 96),
            new THREE.MeshStandardMaterial({
                color: 0xd7c394,
                roughness: 0.95,
                metalness: 0.02,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.78
            })
        );
        rings.rotation.x = -Math.PI / 2;
        rings.rotation.z = 0.12;
        mesh.add(rings);
    }

    // 轨道线
    const pts = [];
    for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * d.distance, 0, Math.sin(a) * d.distance));
    }
    scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x335588, transparent: true, opacity: 0.3 })
    ));

    planets.push({ mesh, data: d, angle });
}

Object.keys(BODIES).forEach(createPlanet);

// ============================================================
// 5. 手控状态
// ============================================================
const videoEl = document.getElementById('input-video');
const overlayCanvas = document.getElementById('overlay-canvas');
const overlayCtx = overlayCanvas.getContext('2d');

let zoomFactor = 1.0;
const ZOOM_MIN = 0.35, ZOOM_MAX = 2.8;
let pointerIndicator;
let lastInteraction = 'none';
let lastPointedBodyKey = null;
let lastLeftPalmPosition = null;
const ORBIT_SENSITIVITY = 2.4;
const ORBIT_DEADZONE = 0.003;
const MAX_PALM_DELTA = 0.05;
const ORBIT_PITCH_LIMIT = Math.PI * 0.44;

// 指尖 3D 指示器
function initPointer() {
    pointerIndicator = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.95 })
    );
    pointerIndicator.visible = false;
    scene.add(pointerIndicator);
}
initPointer();

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const targetPointerNDC = new THREE.Vector2();
let hasSmoothedPointer = false;

// 手势分类（返回 'open' | 'fist' | 'point' | 'double' | 'none'）
function classifyGesture(lm) {
    const wrist = lm[0], palm = lm[9];
    const tips = [lm[8], lm[12], lm[16], lm[20]];
    const mcp = [lm[5], lm[9], lm[13], lm[17]];

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

    // 各指尖到掌心距离
    const fingerDists = tips.map(t => dist(t, palm));
    const avg = fingerDists.reduce((a, b) => a + b, 0) / 4;

    // 伸展判定：指尖到手腕距离相对指根到手腕距离
    const indexExtended = dist(lm[8], wrist) > dist(lm[5], wrist) * 1.55;
    const middleExtended = dist(lm[12], wrist) > dist(lm[9], wrist) * 1.45;

    // 无名指和小指收拢；单指时中指也收拢
    const ringAndPinkyCurled =
        fingerDists[2] < dist(lm[13], wrist) * 1.15 &&
        fingerDists[3] < dist(lm[17], wrist) * 1.15;
    const middleCurled = fingerDists[1] < dist(lm[9], wrist) * 1.15;

    // 拇指是否收拢
    const thumbCurled = dist(lm[4], palm) < dist(lm[2], wrist) * 1.2;

    if (indexExtended && middleExtended && ringAndPinkyCurled) return 'double';
    if (indexExtended && middleCurled && ringAndPinkyCurled) return 'point';
    if (avg > 0.20 && dist(lm[4], palm) > 0.11) return 'open';
    if (avg < 0.14 && thumbCurled) return 'fist';
    return 'none';
}

function onHandResults(results) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        pointerIndicator.visible = false;
        hasSmoothedPointer = false;
        lastInteraction = 'none';
        lastPointedBodyKey = null;
        lastLeftPalmPosition = null;
        return;
    }

    let zoomDirection = 0;
    let pointerHand = null;
    let pointerGesture = 'none';

    for (let handIndex = 0; handIndex < results.multiHandLandmarks.length; handIndex++) {
        const lm = results.multiHandLandmarks[handIndex];
        const gesture = classifyGesture(lm);
        const handedness = results.multiHandedness?.[handIndex]?.classification?.[0]?.label;
        // Camera input is not mirrored, so MediaPipe's handedness labels need swapping.
        const isLeftHand = handedness === 'Right';

        if (typeof drawConnectors !== 'undefined' && typeof HAND_CONNECTIONS !== 'undefined') {
            drawConnectors(overlayCtx, lm, HAND_CONNECTIONS, { color: '#4a9eff', lineWidth: 2 });
            drawLandmarks(overlayCtx, lm, { color: '#ffaa44', lineWidth: 1, radius: 2.5 });
        }

        if (gesture === 'open') zoomDirection++;
        if (gesture === 'fist') zoomDirection--;

        if (isLeftHand && gesture === 'open') {
            const palmPosition = { x: 1 - lm[9].x, y: lm[9].y };
            if (lastLeftPalmPosition) {
                const deltaX = THREE.MathUtils.clamp(
                    palmPosition.x - lastLeftPalmPosition.x,
                    -MAX_PALM_DELTA,
                    MAX_PALM_DELTA
                );
                const deltaY = THREE.MathUtils.clamp(
                    palmPosition.y - lastLeftPalmPosition.y,
                    -MAX_PALM_DELTA,
                    MAX_PALM_DELTA
                );
                if (Math.abs(deltaX) > ORBIT_DEADZONE) orbitYaw += deltaX * ORBIT_SENSITIVITY;
                if (Math.abs(deltaY) > ORBIT_DEADZONE) {
                    orbitPitch = Math.max(
                        -ORBIT_PITCH_LIMIT,
                        Math.min(ORBIT_PITCH_LIMIT, orbitPitch - deltaY * ORBIT_SENSITIVITY)
                    );
                }
            }
            lastLeftPalmPosition = palmPosition;
        } else {
            lastLeftPalmPosition = null;
        }

        if (gesture === 'point' || gesture === 'double') {
            pointerHand = lm;
            pointerGesture = gesture;
        }
    }

    // 单手张开放大，握拳缩小。
    zoomFactor = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomFactor + zoomDirection * 0.022));

    // 相机围绕太阳定位；手势分别更新缩放距离与绕日角度。
    const baseDist = 70;
    const targetDist = baseDist / zoomFactor;
    const horizontalDist = Math.cos(orbitPitch) * targetDist;
    camera.position.set(
        cameraTarget.x + Math.sin(orbitYaw) * horizontalDist,
        cameraTarget.y + Math.sin(orbitPitch) * targetDist,
        cameraTarget.z + Math.cos(orbitYaw) * horizontalDist
    );
    camera.lookAt(cameraTarget);

    // --- 单指选中，双指关闭信息 ---
    const interaction = pointerHand ? `${pointerGesture}` : 'none';
    if (pointerHand) {
        // MediaPipe 坐标 x 需镜像
        const sx = 1 - pointerHand[8].x;
        const sy = pointerHand[8].y;

        // 映射到 NDC
        targetPointerNDC.set((sx - 0.5) * 2, -(sy - 0.5) * 2);
        if (hasSmoothedPointer) {
            pointerNDC.lerp(targetPointerNDC, 0.45);
        } else {
            pointerNDC.copy(targetPointerNDC);
            hasSmoothedPointer = true;
        }

        // 与选中射线共线，确保可见指针和实际命中位置一致。
        raycaster.setFromCamera(pointerNDC, camera);
        pointerIndicator.position.copy(raycaster.ray.origin)
            .addScaledVector(raycaster.ray.direction, 10);
        pointerIndicator.visible = true;

        if (pointerGesture === 'double' && interaction !== lastInteraction) {
            hideInfo();
            lastPointedBodyKey = null;
        } else if (pointerGesture === 'point') {
            raycaster.setFromCamera(pointerNDC, camera);
            const hits = raycaster.intersectObjects(clickableMeshes, false);
            const bodyKey = hits[0]?.object.userData.bodyKey ?? null;
            if (bodyKey && bodyKey !== lastPointedBodyKey) {
                showInfo(hits[0].object.userData);
            }
            lastPointedBodyKey = bodyKey;
        } else {
            lastPointedBodyKey = null;
        }
    } else {
        pointerIndicator.visible = false;
            hasSmoothedPointer = false;
        lastPointedBodyKey = null;
    }
    lastInteraction = interaction;
}

// ============================================================
// 6. 信息面板
// ============================================================
const panel = document.getElementById('info-panel');
const titleEl = document.getElementById('info-title');
const contentEl = document.getElementById('info-content');

function showInfo(data) {
    titleEl.textContent = data.name;
    let html = '';
    for (const [k, v] of Object.entries(data.info || {})) {
        html += `<div class="field"><span class="label">${k}</span><span class="value">${v}</span></div>`;
    }
    contentEl.innerHTML = html;
    panel.classList.remove('hidden');
}

function hideInfo() {
    panel.classList.add('hidden');
}

// ============================================================
// 7. 动画循环
// ============================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    for (const p of planets) {
        p.angle += p.data.speed * delta;
        p.mesh.position.x = Math.cos(p.angle) * p.data.distance;
        p.mesh.position.z = Math.sin(p.angle) * p.data.distance;
        p.mesh.rotation.y += 0.005;
    }

    const sun = clickableMeshes.find(m => m.userData.bodyKey === 'sun');
    if (sun) sun.rotation.y += 0.001;

    renderer.render(scene, camera);
}
animate();

// ============================================================
// 8. 窗口自适应
// ============================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// 9. 启动 MediaPipe Hands
// ============================================================
async function initHandTracking() {
    overlayCanvas.width = 320;
    overlayCanvas.height = 240;

    const hands = new Hands({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.6
    });

    hands.onResults(onHandResults);

    const cam = new Camera(videoEl, {
        onFrame: async () => { await hands.send({ image: videoEl }); },
        width: 640,
        height: 480
    });

    try {
        await cam.start();
        loadingEl.classList.add('fade-out');
        setTimeout(() => loadingEl.style.display = 'none', 700);
    } catch (e) {
        loadingEl.textContent = '摄像头无法访问，请检查权限后刷新。';
        console.error(e);
    }
}

setTimeout(initHandTracking, 800);