import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'
import * as CANNON from 'cannon-es'
import CannonDebugRenderer from './utils/cannonDebugRenderer'
import { DragControls } from 'three/examples/jsm/controls/DragControls'

const scene = new THREE.Scene()

const light1 = new THREE.SpotLight()
light1.position.set(2.5, 5, 5)
light1.angle = Math.PI / 4
light1.penumbra = 0.5
light1.castShadow = true
light1.shadow.mapSize.width = 1024
light1.shadow.mapSize.height = 1024
light1.shadow.camera.near = 0.5
light1.shadow.camera.far = 20
scene.add(light1)

const light2 = new THREE.SpotLight()
light2.position.set(-2.5, 5, 5)
light2.angle = Math.PI / 4
light2.penumbra = 0.5
light2.castShadow = true
light2.shadow.mapSize.width = 1024
light2.shadow.mapSize.height = 1024
light2.shadow.camera.near = 0.5
light2.shadow.camera.far = 20
scene.add(light2)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.y = 10
camera.position.z = 3

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.screenSpacePanning = true
controls.target.y = 1

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

const normalMaterial = new THREE.MeshNormalMaterial()
const phongMaterial = new THREE.MeshPhongMaterial()

const planeGeometry = new THREE.PlaneGeometry(25, 25)
const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial)
planeMesh.rotateX(-Math.PI / 2)
planeMesh.receiveShadow = true
scene.add(planeMesh)
const planeShape = new CANNON.Plane()
const planeBody = new CANNON.Body({ mass: 0 })
planeBody.addShape(planeShape)
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
world.addBody(planeBody)

const sphereMeshes: THREE.Object3D[] = []
const sphereBodies: CANNON.Body[] = []

const sphereGeometry = new THREE.SphereGeometry()
const sphereMesh = new THREE.Mesh(sphereGeometry, normalMaterial)
let i = 0
for (let x = -5; x <= 6; x += 2.5) {
    for (let z = -5; z <= 6; z += 2.5) {
        const sphereMeshClone = sphereMesh.clone()
        sphereMeshClone.position.x = x
        sphereMeshClone.position.y = 3
        sphereMeshClone.position.z = z
        sphereMeshClone.castShadow = true
        sphereMeshClone.userData.i = i
        scene.add(sphereMeshClone)
        sphereMeshes.push(sphereMeshClone)

        const sphereBody = new CANNON.Body({ mass: 1 })
        sphereBody.addShape(new CANNON.Sphere(1))
        sphereBody.position.x = sphereMeshClone.position.x
        sphereBody.position.y = sphereMeshClone.position.y
        sphereBody.position.z = sphereMeshClone.position.z
        world.addBody(sphereBody)
        sphereBodies.push(sphereBody)

        const localPivotSphere = new CANNON.Vec3(0, 0, 1)
        const localPivotPlane = new CANNON.Vec3(x, z, 0)
        const constraint = new CANNON.PointToPointConstraint(
            sphereBody,
            localPivotSphere,
            planeBody,
            localPivotPlane
        )
        world.addConstraint(constraint)

        i++
    }
}

let draggingId = -1
const dragControls = new DragControls(sphereMeshes, camera, renderer.domElement)
dragControls.addEventListener('dragstart', function (event: THREE.Event) {
    draggingId = event.object.userData.i
    console.log(draggingId)
    event.object.material.opacity = 0.33
    controls.enabled = false
})
dragControls.addEventListener('dragend', function (event: THREE.Event) {
    draggingId = -1
    event.object.material.opacity = 1
    controls.enabled = true
})
dragControls.addEventListener('drag', function (event) {
    event.object.position.y = 1
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
const physicsFolder = gui.addFolder('Physics')
physicsFolder.add(world.gravity, 'x', -10.0, 10.0, 0.1)
physicsFolder.add(world.gravity, 'y', -10.0, 10.0, 0.1)
physicsFolder.add(world.gravity, 'z', -10.0, 10.0, 0.1)
physicsFolder.open()

const clock = new THREE.Clock()
let delta

const cannonDebugRenderer = new CannonDebugRenderer(scene, world)

function animate() {
    requestAnimationFrame(animate)

    controls.update()

    delta = Math.min(clock.getDelta(), 0.1)
    world.step(delta)

    cannonDebugRenderer.update()

    // Copy coordinates from Cannon to Three.js

    sphereMeshes.forEach((m, i) => {
        if (i === draggingId) {
            sphereBodies[i].position.x = m.position.x
            sphereBodies[i].position.y = m.position.y
            sphereBodies[i].position.z = m.position.z
            sphereBodies[i].quaternion.x = m.quaternion.x
            sphereBodies[i].quaternion.y = m.quaternion.y
            sphereBodies[i].quaternion.z = m.quaternion.z
            sphereBodies[i].quaternion.w = m.quaternion.w
            sphereBodies[i].velocity.set(0, 0, 0)
            sphereBodies[i].angularVelocity.set(0, 0, 0)
        } else {
            m.position.set(
                sphereBodies[i].position.x,
                sphereBodies[i].position.y,
                sphereBodies[i].position.z
            )
            m.quaternion.set(
                sphereBodies[i].quaternion.x,
                sphereBodies[i].quaternion.y,
                sphereBodies[i].quaternion.z,
                sphereBodies[i].quaternion.w
            )
        }
    })

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()