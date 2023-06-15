import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'

const scene = new THREE.Scene()

const axesHelper = new THREE.AxesHelper(5)
scene.add(axesHelper)

const ambientLight = new THREE.AmbientLight(0x444444)
scene.add(ambientLight)

const light = new THREE.DirectionalLight(0xffffff, 2)
light.position.set(0, 0, 3)
light.castShadow = true
light.shadow.bias = -0.003
light.shadow.mapSize.width = 2048
light.shadow.mapSize.height = 2048
light.shadow.camera.left = -2
light.shadow.camera.right = 2
light.shadow.camera.top = -2
light.shadow.camera.bottom = 2
light.shadow.camera.near = 1
light.shadow.camera.far = 5

const helper = new THREE.CameraHelper(light.shadow.camera)
scene.add(helper)

const lightPivot = new THREE.Object3D()
lightPivot.add(light)
scene.add(lightPivot)

scene.background = new THREE.CubeTextureLoader().load([
    'img/px_eso0932a.jpg',
    'img/nx_eso0932a.jpg',
    'img/py_eso0932a.jpg',
    'img/ny_eso0932a.jpg',
    'img/pz_eso0932a.jpg',
    'img/nz_eso0932a.jpg',
])

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
)

const renderer = new THREE.WebGLRenderer()
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const locationDataElem = document.getElementById(
    'locationData'
) as HTMLDivElement
let locationDataText = ''

const controls = new OrbitControls(camera, renderer.domElement)
controls.addEventListener('change', () => {
    locationDataText =
        ((controls.getPolarAngle() / -Math.PI) * 180 + 90).toFixed(6) +
        ' ' +
        ((controls.getAzimuthalAngle() / Math.PI) * 180).toFixed(6)
    locationDataElem.innerText = locationDataText
})
controls.screenSpacePanning = true

const sphereGeometry = new THREE.SphereGeometry(1, 720, 360)
const material = new THREE.MeshStandardMaterial()
const texture = new THREE.TextureLoader().load('img/worldColour.5400x2700.jpg')
texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
material.map = texture

const displacementMap = new THREE.TextureLoader().load(
    'img/srtm_ramp2.world.5400x2700.jpg'
)
material.displacementMap = displacementMap
material.displacementScale = 0.1

const sphere = new THREE.Mesh(sphereGeometry, material)
sphere.rotation.y = -Math.PI / 2
sphere.castShadow = true
sphere.receiveShadow = true
scene.add(sphere)

camera.position.z = 2

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

const gui = new GUI()
gui.add(material, 'displacementScale', 0, 1, 0.01)

const stats = new Stats()
document.body.appendChild(stats.dom)

function animate() {
    requestAnimationFrame(animate)

    controls.update()
    helper.update()
    lightPivot.rotation.y += 0.01

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()