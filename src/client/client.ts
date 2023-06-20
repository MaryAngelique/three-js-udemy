import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(0, 0.75, 0.25)

const light = new THREE.DirectionalLight()
light.position.set(1, 1, 1)
scene.add(light)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enablePan = false
controls.enableDamping = true

const canvasD = document.getElementById('canvasD') as HTMLCanvasElement
const contextD = canvasD.getContext('2d') as CanvasRenderingContext2D
const canvasN = document.getElementById('canvasN') as HTMLCanvasElement
const contextN = canvasN.getContext('2d') as CanvasRenderingContext2D
contextN.fillStyle = '#7f7fff'
contextN.fillRect(0, 0, 128, 128)

const displacementMap = new THREE.CanvasTexture(canvasD)
const normalMap = new THREE.CanvasTexture(canvasN)

const geometry = new THREE.PlaneGeometry(1, 1, 128, 128)
const material = new THREE.MeshStandardMaterial({
    displacementMap: displacementMap,
    displacementScale: 0.1,
    normalMap: normalMap,
})

const plane = new THREE.Mesh(geometry, material)
plane.rotation.x = -Math.PI / 2
scene.add(plane)

const raycaster = new THREE.Raycaster()
let intersects: THREE.Intersection[]
const mouse = new THREE.Vector2()
let ctrlDown = false
let ptrDown = false

// height2normal - based on www.mrdoob.com/lab/javascript/height2normal/
function height2normal(
    context: CanvasRenderingContext2D,
    contextN: CanvasRenderingContext2D
) {
    var width = 128
    var height = 128

    var src = context.getImageData(0, 0, width, height)
    var dst = contextN.createImageData(width, height)

    for (var i = 0, l = width * height * 4; i < l; i += 4) {
        var x1, x2, y1, y2

        if (i % (width * 4) == 0) {
            // left edge
            x1 = src.data[i]
            x2 = src.data[i + 4]
        } else if (i % (width * 4) == (width - 1) * 4) {
            // right edge
            x1 = src.data[i - 4]
            x2 = src.data[i]
        } else {
            x1 = src.data[i - 4]
            x2 = src.data[i + 4]
        }

        if (i < width * 4) {
            // top edge
            y1 = src.data[i]
            y2 = src.data[i + width * 4]
        } else if (i > width * (height - 1) * 4) {
            // bottom edge
            y1 = src.data[i - width * 4]
            y2 = src.data[i]
        } else {
            y1 = src.data[i - width * 4]
            y2 = src.data[i + width * 4]
        }

        dst.data[i] = x1 - x2 + 127
        dst.data[i + 1] = y1 - y2 + 127
        dst.data[i + 2] = 255
        dst.data[i + 3] = 255
    }

    contextN.putImageData(dst, 0, 0)
}

function draw(uv: THREE.Vector2) {
    contextD.fillStyle = '#FFFFFF'
    contextD.fillRect(uv.x * 128, 128 - uv.y * 128, 2, 2)
    material.needsUpdate = true
    ;(material.displacementMap as THREE.Texture).needsUpdate = true
    height2normal(contextD, contextN)
    ;(material.normalMap as THREE.Texture).needsUpdate = true
}

function raycast() {
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObject(plane, false)
    if (intersects.length > 0) {
        draw(intersects[0].uv as THREE.Vector2)
    }
}

document.addEventListener('mousemove', function (event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    if (ctrlDown && ptrDown) raycast()
})

renderer.domElement.addEventListener('pointerdown', function () {
    ptrDown = true
    if (ctrlDown) raycast()
})

renderer.domElement.addEventListener('pointerup', function () {
    ptrDown = false
})

window.addEventListener('keydown', function (event) {
    if (event.key === 'Control') {
        renderer.domElement.style.cursor = 'crosshair'
        controls.enabled = false
        ctrlDown = true
    }
})

window.addEventListener('keyup', function (event) {
    if (event.key === 'Control') {
        renderer.domElement.style.cursor = 'pointer'
        controls.enabled = true
        ctrlDown = false
    }
})

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

const stats = new Stats()
document.body.appendChild(stats.dom)

const gui = new GUI()
gui.add(material, 'displacementScale', 0, 0.2, 0.01)

function animate() {
    requestAnimationFrame(animate)

    controls.update()

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()