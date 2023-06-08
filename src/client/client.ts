import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass'
const scene = new THREE.Scene()
const envTexture = new THREE.CubeTextureLoader().load([
    'img/px_25.jpg',
    'img/nx_25.jpg',
    'img/py_25.jpg',
    'img/ny_25.jpg',
    'img/pz_25.jpg',
    'img/nz_25.jpg',
])
scene.background = envTexture
const ambientLight = new THREE.AmbientLight(0x444444)
scene.add(ambientLight)
const light1 = new THREE.PointLight()
light1.position.set(-6, 10, -6)
light1.castShadow = true
light1.shadow.mapSize.height = 1024
light1.shadow.mapSize.width = 1024
scene.add(light1)
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.01,
    100
)
camera.position.set(3, 1.5, 3)
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
const renderPass = new RenderPass(scene, camera)
const bokehPass = new BokehPass(scene, camera, {
    focus: 1.0,
    aperture: 0.0001,
    maxblur: 1.0,
    width: window.innerWidth,
    height: window.innerHeight,
})
const composer = new EffectComposer(renderer)
composer.addPass(renderPass)
composer.addPass(bokehPass)
const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.enableDamping = true
orbitControls.target.set(1, 0, 0)
const planeGeometry = new THREE.PlaneGeometry(25, 25)
const texture = new THREE.TextureLoader().load('img/grid.png')
const plane = new THREE.Mesh(
    planeGeometry,
    new THREE.MeshPhongMaterial({ map: texture })
)
plane.rotateX(-Math.PI / 2)
plane.position.y = -1
plane.receiveShadow = true
scene.add(plane)
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    composer.setSize(window.innerWidth, window.innerHeight)
}
const pivot = new THREE.Object3D()
scene.add(pivot)
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(2048)
const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget)
scene.add(cubeCamera)
const material = new THREE.MeshPhysicalMaterial({
    reflectivity: 1.0,
    transmission: 1.0,
    roughness: 0,
    metalness: 0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.25,
    color: new THREE.Color(0xffffff),
    ior: 1.5,
})
material.thickness = 50.0

//cubeRenderTarget.texture.mapping = THREE.CubeRefractionMapping;
const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), material)
ball.position.set(1.5, 0, 0)
ball.castShadow = true
pivot.add(ball)
const gui = new GUI()
const ballFolder = gui.addFolder('Ball1')
ballFolder.add(ball, 'visible').name('Visible')
ballFolder.add(material, 'metalness', 0, 1.0, 0.01).name('Metalness')
ballFolder.add(material, 'roughness', 0, 1.0, 0.01).name('Roughness')
ballFolder.add(material, 'transmission', 0, 1.0, 0.01).name('Transmission')
ballFolder.add(material, 'clearcoat', 0, 1.0, 0.01).name('Clearcoat')
ballFolder
    .add(material, 'clearcoatRoughness', 0, 1.0, 0.01)
    .name('ClearcoatRoughness')
ballFolder.add(material, 'reflectivity', 0, 1.0, 0.01).name('Reflectivity')
ballFolder.add(material, 'ior', 1.0, 2.333, 0.01).name('IOR')
ballFolder.add(material, 'thickness', 0, 50.0, 0.1).name('thickness')
ballFolder.open()
const stats = new Stats()
document.body.appendChild(stats.dom)
const clock = new THREE.Clock()
var animate = function () {
    requestAnimationFrame(animate)
    orbitControls.update()
    const ballWorldPosition = new THREE.Vector3()
    ball.getWorldPosition(ballWorldPosition)
    ;(bokehPass.uniforms as any).focus.value =
        camera.position.distanceTo(ballWorldPosition)
    const delta = clock.getDelta()
    ball.rotateY(-0.5 * delta)
    pivot.rotateY(0.5 * delta)
    render()
    stats.update()
}
function render() {
    cubeCamera.position.copy(camera.position)
    cubeCamera.update(renderer, scene)
    //renderer.render(scene, camera)
    composer.render(0.1)
}
animate()