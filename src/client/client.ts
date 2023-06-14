import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import Stats from 'three/examples/jsm/libs/stats.module'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry'
import * as CANNON from 'cannon-es'
import CannonUtils from './utils/cannonUtils'

const scene = new THREE.Scene()

const light1 = new THREE.SpotLight()
light1.position.set(2.5, 5, 5)
light1.angle = Math.PI / 4
light1.penumbra = 0.5
light1.castShadow = true
light1.shadow.mapSize.width = 2048
light1.shadow.mapSize.height = 2048
light1.shadow.camera.near = 0.5
light1.shadow.camera.far = 20
scene.add(light1)

const light = new THREE.SpotLight()
light.position.set(-2.5, 5, 5)
light.angle = Math.PI / 4
light.penumbra = 0.5
light.castShadow = true
light.shadow.mapSize.width = 2048
light.shadow.mapSize.height = 2048
light.shadow.camera.near = 0.5
light.shadow.camera.far = 20
scene.add(light)

const camera = new THREE.PerspectiveCamera(
    85,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(-0.9, 0.5, 2)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const material = new THREE.MeshPhysicalMaterial({})
material.thickness = 3.0
material.roughness = 0.9
material.clearcoat = 0.1
material.clearcoatRoughness = 0
material.transmission = 0.99
material.ior = 1.25
material.envMapIntensity = 25

const texture = new THREE.TextureLoader().load('img/grid.png')
material.map = texture
const envTexture = new THREE.CubeTextureLoader().load(
    [
        'img/px_25.jpg',
        'img/nx_25.jpg',
        'img/py_25.jpg',
        'img/ny_25.jpg',
        'img/pz_25.jpg',
        'img/nz_25.jpg',
    ],
    () => {
        material.envMap = envTexture
    }
)

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)
world.allowSleep = true

let monkey: THREE.Mesh
let convexHull: THREE.Mesh
let body: CANNON.Body
let sphereMesh: THREE.Mesh
let sphereBody: CANNON.Body

const objLoader = new OBJLoader()
objLoader.load(
    'models/monkey.obj',
    (object) => {
        monkey = object.children[0] as THREE.Mesh
        monkey.material = material
        monkey.position.y = 1.5
        monkey.rotation.x = 0.4
        monkey.rotation.z = -0.4
        monkey.castShadow = true
        scene.add(monkey)

        setTimeout(() => {
            createConvexHull()
        }, 2000)
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)

function createConvexHull() {
    const position = monkey.geometry.attributes.position.array
    const points: THREE.Vector3[] = []
    for (let i = 0; i < position.length; i += 3) {
        points.push(
            new THREE.Vector3(position[i], position[i + 1], position[i + 2])
        )
    }
    const convexGeometry = new ConvexGeometry(points)
    convexHull = new THREE.Mesh(
        convexGeometry,
        new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
        })
    )
    monkey.add(convexHull)

    setTimeout(() => {
        addFloor()
    }, 2000)
}

function addFloor() {
    const planeGeometry = new THREE.PlaneGeometry(25, 25)
    const texture = new THREE.TextureLoader().load('img/grid.png')
    const plane: THREE.Mesh = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshPhongMaterial({ map: texture })
    )
    plane.rotateX(-Math.PI / 2)
    plane.position.y = -1
    plane.receiveShadow = true
    scene.add(plane)

    const planeShape = new CANNON.Plane()
    const planeBody = new CANNON.Body({ mass: 0 })
    planeBody.addShape(planeShape)
    planeBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(1, 0, 0),
        -Math.PI / 2
    )
    planeBody.position.y = plane.position.y
    world.addBody(planeBody)

    const sphereGeometry = new THREE.SphereGeometry(0.5)
    sphereMesh = new THREE.Mesh(sphereGeometry, material)
    sphereMesh.position.x = -0.2
    sphereMesh.position.z = -0.5
    sphereMesh.castShadow = true
    scene.add(sphereMesh)
    const sphereShape = new CANNON.Sphere(0.5)
    sphereBody = new CANNON.Body({ mass: 1 })
    sphereBody.addShape(sphereShape)
    sphereBody.position.x = sphereMesh.position.x
    sphereBody.position.y = sphereMesh.position.y
    sphereBody.position.z = sphereMesh.position.z
    world.addBody(sphereBody)

    setTimeout(() => {
        convertConvexHullToTrimesh()
    }, 2000)
}

function convertConvexHullToTrimesh() {
    const shape = CannonUtils.CreateTrimesh(convexHull.geometry)
    body = new CANNON.Body({ mass: 1 })
    body.allowSleep = true
    body.addShape(shape)
    body.position.x = monkey.position.x
    body.position.y = monkey.position.y
    body.position.z = monkey.position.z
    body.quaternion.x = monkey.quaternion.x
    body.quaternion.y = monkey.quaternion.y
    body.quaternion.z = monkey.quaternion.z
    body.quaternion.w = monkey.quaternion.w
    world.addBody(body)
}

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

const stats = new Stats()
document.body.appendChild(stats.dom)

const clock = new THREE.Clock()
let delta

function animate() {
    requestAnimationFrame(animate)

    controls.update()
    if (monkey) {
        controls.target.copy(monkey.position)
    }

    delta = Math.min(clock.getDelta(), 0.1)
    world.step(delta)

    if (body) {
        monkey.position.set(body.position.x, body.position.y, body.position.z)
        monkey.quaternion.set(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
        )
    }
    if (sphereBody) {
        sphereMesh.position.set(
            sphereBody.position.x,
            sphereBody.position.y,
            sphereBody.position.z
        )
        sphereMesh.quaternion.set(
            sphereBody.quaternion.x,
            sphereBody.quaternion.y,
            sphereBody.quaternion.z,
            sphereBody.quaternion.w
        )
    }
    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()