import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'

const scene = new THREE.Scene()

const light1 = new THREE.PointLight(0xffffff, 2)
light1.position.set(10, 10, 10)
light1.castShadow = true
light1.shadow.mapSize.height = 1024
light1.shadow.mapSize.width = 1024
scene.add(light1)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(-2.5, 0, 5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.shadowMap.enabled = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

var loader = new THREE.TextureLoader()
var texture = loader.load('img/grid.png')
var alphaMap = loader.load('img/grayscale-test.png')

var material = new THREE.MeshStandardMaterial({
    map: texture,
    alphaMap: alphaMap,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.5,
})

const wall = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), material)
wall.position.set(0, 0, 0)
wall.castShadow = true
scene.add(wall)

const floorMaterial = new THREE.MeshPhongMaterial()
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    floorMaterial
)
floor.rotateX(-Math.PI / 2)
floor.position.set(0, -2, 0)
floor.receiveShadow = true
scene.add(floor)

const stats = new Stats()
document.body.appendChild(stats.dom)

const gui = new GUI()
gui.add(material, 'alphaTest', 0, 1, 0.01).onChange((v) => {
    material.needsUpdate = true
})

var animate = function () {
    requestAnimationFrame(animate)

    controls.update()

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}
animate()