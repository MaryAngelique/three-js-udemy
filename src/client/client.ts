import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'
import * as CANNON from 'cannon-es'
import CannonDebugRenderer from './utils/cannonDebugRenderer'

const scene = new THREE.Scene()

const light = new THREE.DirectionalLight()
light.position.set(25, 50, 25)
light.castShadow = true
light.shadow.mapSize.width = 16384
light.shadow.mapSize.height = 16384
light.shadow.camera.near = 0.5
light.shadow.camera.far = 100
light.shadow.camera.top = 100
light.shadow.camera.bottom = -100
light.shadow.camera.left = -100
light.shadow.camera.right = 100
scene.add(light)

const helper = new THREE.CameraHelper(light.shadow.camera)
scene.add(helper)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
const chaseCam = new THREE.Object3D()
chaseCam.position.set(0, 0, 0)
const chaseCamPivot = new THREE.Object3D()
chaseCamPivot.position.set(0, 2, 4)
chaseCam.add(chaseCamPivot)
scene.add(chaseCam)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const phongMaterial = new THREE.MeshPhongMaterial()

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

const groundMaterial = new CANNON.Material('groundMaterial')
groundMaterial.friction = 0.25
groundMaterial.restitution = 0.25

const wheelMaterial = new CANNON.Material('wheelMaterial')
wheelMaterial.friction = 0.25
wheelMaterial.restitution = 0.25

//ground
const groundGeometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(100, 100)
const groundMesh: THREE.Mesh = new THREE.Mesh(groundGeometry, phongMaterial)
groundMesh.rotateX(-Math.PI / 2)
groundMesh.receiveShadow = true
scene.add(groundMesh)
const groundShape = new CANNON.Box(new CANNON.Vec3(50, 1, 50))
const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial })
groundBody.addShape(groundShape)
groundBody.position.set(0, -1, 0)
world.addBody(groundBody)

//jumps
for (let i = 0; i < 100; i++) {
    const height = Math.random() * 50 + 0.5
    const jump = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 1, height, 5),
        phongMaterial
    )
    jump.position.x = Math.random() * 100 - 50
    jump.position.y = height / 2
    jump.position.z = Math.random() * 100 - 50
    scene.add(jump)

    const cylinderShape = new CANNON.Cylinder(0.01, 1, height, 5)
    const cylinderBody = new CANNON.Body({ mass: 0 })
    cylinderBody.addShape(cylinderShape, new CANNON.Vec3())
    cylinderBody.position.x = jump.position.x
    cylinderBody.position.y = jump.position.y
    cylinderBody.position.z = jump.position.z
    world.addBody(cylinderBody)
}

const heliBodyGeometry = new THREE.SphereGeometry(0.66)
const heliBodyMesh = new THREE.Mesh(heliBodyGeometry, phongMaterial)
heliBodyMesh.position.y = 1
heliBodyMesh.castShadow = true
scene.add(heliBodyMesh)
heliBodyMesh.add(chaseCam)
const heliTailGeometry = new THREE.BoxGeometry(0.1, 0.1, 2)
const heliTailMesh = new THREE.Mesh(heliTailGeometry, phongMaterial)
heliTailMesh.position.z = 1
heliTailMesh.castShadow = true
heliBodyMesh.add(heliTailMesh)
const skidGeometry = new THREE.BoxGeometry(0.1, 0.05, 1.5)
const skidLeftMesh = new THREE.Mesh(skidGeometry, phongMaterial)
const skidRightMesh = new THREE.Mesh(skidGeometry, phongMaterial)
skidLeftMesh.position.set(-0.5, -0.45, 0)
skidRightMesh.position.set(0.5, -0.45, 0)
skidLeftMesh.castShadow = true
skidRightMesh.castShadow = true
heliBodyMesh.add(skidLeftMesh)
heliBodyMesh.add(skidRightMesh)

const heliBodyShape = new CANNON.Box(new CANNON.Vec3(0.6, 0.5, 0.6))
const heliBody = new CANNON.Body({ mass: 0.5 })
heliBody.addShape(heliBodyShape)
heliBody.position.x = heliBodyMesh.position.x
heliBody.position.y = heliBodyMesh.position.y
heliBody.position.z = heliBodyMesh.position.z
heliBody.angularDamping = 0.9 //so it doesn't pendulum so much
world.addBody(heliBody)

//rotor
const rotorGeometry = new THREE.BoxGeometry(0.1, 0.01, 5)
const rotorMesh: THREE.Mesh = new THREE.Mesh(rotorGeometry, phongMaterial)
rotorMesh.position.x = 0
rotorMesh.position.y = 3
rotorMesh.position.z = 0
scene.add(rotorMesh)

const rotorShape = new CANNON.Sphere(0.1)
const rotorBody = new CANNON.Body({ mass: 1 })
rotorBody.addShape(rotorShape)
rotorBody.position.x = rotorMesh.position.x
rotorBody.position.y = rotorMesh.position.y
rotorBody.position.z = rotorMesh.position.z
rotorBody.linearDamping = 0.5 //simulates auto altitude
world.addBody(rotorBody)

const rotorConstraint = new CANNON.PointToPointConstraint(
    heliBody,
    new CANNON.Vec3(0, 1, 0),
    rotorBody,
    new CANNON.Vec3()
)

rotorConstraint.collideConnected = false
world.addConstraint(rotorConstraint)

const keyMap: { [id: string]: boolean } = {}
const onDocumentKey = (e: KeyboardEvent) => {
    keyMap[e.code] = e.type === 'keydown'
}

document.addEventListener('keydown', onDocumentKey, false)
document.addEventListener('keyup', onDocumentKey, false)

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
const physicsFolder = gui.addFolder('Physics')
physicsFolder.add(world.gravity, 'x', -10.0, 10.0, 0.1)
physicsFolder.add(world.gravity, 'y', -10.0, 10.0, 0.1)
physicsFolder.add(world.gravity, 'z', -10.0, 10.0, 0.1)
physicsFolder.open()

const clock = new THREE.Clock()
let delta

const cannonDebugRenderer = new CannonDebugRenderer(scene, world)

const v = new THREE.Vector3()
let banking = false
let climbing = false
let pitching = false
let yawing = false
const stableLift = 14.7
const thrust = new CANNON.Vec3(0, 5, 0)

function animate() {
    requestAnimationFrame(animate)

    helper.update()

    delta = Math.min(clock.getDelta(), 0.1)
    world.step(delta)

    cannonDebugRenderer.update()

    // Copy coordinates from Cannon to Three.js
    rotorMesh.position.set(
        rotorBody.position.x,
        rotorBody.position.y,
        rotorBody.position.z
    )
    rotorMesh.rotateY(thrust.y * delta * 2)

    heliBodyMesh.position.set(
        heliBody.position.x,
        heliBody.position.y,
        heliBody.position.z
    )
    heliBodyMesh.quaternion.set(
        heliBody.quaternion.x,
        heliBody.quaternion.y,
        heliBody.quaternion.z,
        heliBody.quaternion.w
    )

    climbing = false
    if (keyMap['KeyW']) {
        if (thrust.y < 40) {
            thrust.y += 5 * delta
            climbing = true
        }
    }
    if (keyMap['KeyS']) {
        if (thrust.y > 0) {
            thrust.y -= 5 * delta
            climbing = true
        }
    }
    yawing = false
    if (keyMap['KeyA']) {
        if (rotorBody.angularVelocity.y < 2.0)
            rotorBody.angularVelocity.y += 5 * delta
        yawing = true
    }
    if (keyMap['KeyD']) {
        if (rotorBody.angularVelocity.y > -2.0)
            rotorBody.angularVelocity.y -= 5 * delta
        yawing = true
    }

    pitching = false
    if (keyMap['ArrowUp'] || keyMap['Numpad8']) {
        if (thrust.z >= -10.0) thrust.z -= 5 * delta
        pitching = true
    }
    if (keyMap['ArrowDown'] || keyMap['Numpad5']) {
        if (thrust.z <= 10.0) thrust.z += 5 * delta
        pitching = true
    }
    banking = false
    if (keyMap['ArrowLeft'] || keyMap['Numpad4']) {
        if (thrust.x >= -10.0) thrust.x -= 5 * delta
        banking = true
    }
    if (keyMap['ArrowRight'] || keyMap['Numpad6']) {
        if (thrust.x <= 10.0) thrust.x += 5 * delta
        banking = true
    }

    //auto stabilise
    if (!yawing) {
        if (rotorBody.angularVelocity.y < 0)
            rotorBody.angularVelocity.y += 1 * delta
        if (rotorBody.angularVelocity.y > 0)
            rotorBody.angularVelocity.y -= 1 * delta
    }
    heliBody.angularVelocity.y = rotorBody.angularVelocity.y

    if (!pitching) {
        if (thrust.z < 0) thrust.z += 2.5 * delta
        if (thrust.z > 0) thrust.z -= 2.5 * delta
    }
    if (!banking) {
        if (thrust.x < 0) thrust.x += 2.5 * delta
        if (thrust.x > 0) thrust.x -= 2.5 * delta
    }
    if (!climbing && heliBodyMesh.position.y > 2) {
        thrust.y = stableLift
    }

    rotorBody.applyLocalForce(thrust, new CANNON.Vec3())

    camera.lookAt(heliBodyMesh.position)

    chaseCamPivot.getWorldPosition(v)
    if (v.y < 1) {
        v.y = 1
    }
    camera.position.lerpVectors(camera.position, v, 0.05)

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()