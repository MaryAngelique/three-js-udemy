import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import * as CANNON from 'cannon-es'
import CannonDebugRenderer from './utils/cannonDebugRenderer'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'

class Car {
    enabled
    frameMesh = new THREE.Mesh()
    wheelLFMesh = new THREE.Group()
    wheelRFMesh = new THREE.Group()
    wheelLBMesh = new THREE.Group()
    wheelRBMesh = new THREE.Group()
    frameBody
    wheelLFBody
    wheelRFBody
    wheelLBBody
    wheelRBBody
    constraintLF
    constraintRF
    constraintLB
    constraintRB
    thrusting = false
    forwardVelocity = 0

    v = new THREE.Vector3()
    cameraPivot = new THREE.Object3D()

    constructor(scene: THREE.Scene, world: CANNON.World) {
        this.enabled = false

        const pipesMaterial = new THREE.MeshStandardMaterial()
        pipesMaterial.color = new THREE.Color('#ffffff')
        pipesMaterial.roughness = 0.2
        pipesMaterial.metalness = 1

        const loader = new GLTFLoader()
        loader.load('./models/frame.glb', (gltf) => {
            this.frameMesh = gltf.scene.children[0] as THREE.Mesh
            this.frameMesh.material = pipesMaterial

            this.cameraPivot.position.set(2.5, 2.5, 2.5)
            this.frameMesh.add(this.cameraPivot)

            scene.add(this.frameMesh)
        })
        loader.load(
            'models/tyre.glb',
            (gltf) => {
                this.wheelLFMesh = gltf.scene
                this.wheelRFMesh = this.wheelLFMesh.clone()
                this.wheelLBMesh = this.wheelLFMesh.clone()
                this.wheelRBMesh = this.wheelLFMesh.clone()
                this.wheelLFMesh.scale.setScalar(0.87)
                this.wheelRFMesh.scale.setScalar(0.87)
                scene.add(this.wheelLFMesh)
                scene.add(this.wheelRFMesh)
                scene.add(this.wheelLBMesh)
                scene.add(this.wheelRBMesh)
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
            },
            (error) => {
                console.log(error)
            }
        )

        this.frameBody = new CANNON.Body({ mass: 1 })
        this.frameBody.addShape(
            new CANNON.Sphere(0.5),
            new CANNON.Vec3(0, 0.3, 0.2)
        )
        this.frameBody.addShape(
            new CANNON.Sphere(0.25),
            new CANNON.Vec3(0, 0.1, 1.2)
        )
        this.frameBody.addShape(
            new CANNON.Sphere(0.25),
            new CANNON.Vec3(0, 0.1, -1.2)
        )
        this.frameBody.angularFactor.set(1, 0, 0)
        this.frameBody.position.set(0, 0, 0)

        const wheelLFShape = new CANNON.Sphere(0.35)
        this.wheelLFBody = new CANNON.Body({
            mass: 1,
        })
        this.wheelLFBody.addShape(wheelLFShape)
        this.wheelLFBody.position.set(-1, 0, -1)

        const wheelRFShape = new CANNON.Sphere(0.35)
        this.wheelRFBody = new CANNON.Body({
            mass: 1,
        })
        this.wheelRFBody.addShape(wheelRFShape)
        this.wheelRFBody.position.set(1, 0, -1)

        const wheelLBShape = new CANNON.Sphere(0.4)
        this.wheelLBBody = new CANNON.Body({
            mass: 1,
        })
        this.wheelLBBody.addShape(wheelLBShape)
        this.wheelLBBody.position.set(-1, 0, 1)

        const wheelRBShape = new CANNON.Sphere(0.4)
        this.wheelRBBody = new CANNON.Body({
            mass: 1,
        })
        this.wheelRBBody.addShape(wheelRBShape)
        this.wheelRBBody.position.set(1, 0, 1)

        this.constraintLF = new CANNON.HingeConstraint(
            this.frameBody,
            this.wheelLFBody,
            {
                pivotA: new CANNON.Vec3(-1, 0, -1),
                axisA: new CANNON.Vec3(1, -0.25, 0),
            }
        )
        world.addConstraint(this.constraintLF)
        this.constraintRF = new CANNON.HingeConstraint(
            this.frameBody,
            this.wheelRFBody,
            {
                pivotA: new CANNON.Vec3(1, 0, -1),
                axisA: new CANNON.Vec3(1, 0.25, 0),
            }
        )
        world.addConstraint(this.constraintRF)
        this.constraintLB = new CANNON.HingeConstraint(
            this.frameBody,
            this.wheelLBBody,
            {
                pivotA: new CANNON.Vec3(-1, 0, 1),
                axisA: new CANNON.Vec3(1, -0.25, 0),
            }
        )
        world.addConstraint(this.constraintLB)
        this.constraintRB = new CANNON.HingeConstraint(
            this.frameBody,
            this.wheelRBBody,
            {
                pivotA: new CANNON.Vec3(1, 0, 1),
                axisA: new CANNON.Vec3(1, 0.25, 0),
            }
        )
        world.addConstraint(this.constraintRB)

        this.constraintLB.enableMotor()
        this.constraintRB.enableMotor()
    }

    update(delta: number, camera: THREE.Camera, light: THREE.DirectionalLight) {
        if (this.enabled) {
            this.thrusting = false
            if (keyMap['KeyW'] || keyMap['ArrowUp']) {
                if (this.forwardVelocity < 100.0) this.forwardVelocity += 1
                this.thrusting = true
            }
            if (keyMap['KeyS'] || keyMap['ArrowDown']) {
                if (this.forwardVelocity > -100.0) this.forwardVelocity -= 1
                this.thrusting = true
            }

            if (keyMap['Space']) {
                if (this.forwardVelocity > 0) {
                    this.forwardVelocity -= 1
                }
                if (this.forwardVelocity < 0) {
                    this.forwardVelocity += 1
                }
            }

            if (keyMap['KeyR']) {
                this.spawn(new THREE.Vector3(0, 10, 780))
            }

            if (!this.thrusting) {
                if (this.forwardVelocity > 0) {
                    this.forwardVelocity -= 0.25
                }
                if (this.forwardVelocity < 0) {
                    this.forwardVelocity += 0.25
                }
            }

            this.constraintLB.setMotorSpeed(this.forwardVelocity)
            this.constraintRB.setMotorSpeed(this.forwardVelocity)

            this.frameBody.force.x = 0
            this.wheelLFBody.force.x = 0
            this.wheelRFBody.force.x = 0
            this.wheelLBBody.force.x = 0
            this.wheelRBBody.force.x = 0
            this.frameBody.position.x = 0
            this.wheelLFBody.position.x = -1
            this.wheelRFBody.position.x = 1
            this.wheelLBBody.position.x = -1
            this.wheelRBBody.position.x = 1

            this.frameMesh.position.x = this.frameBody.position.x
            this.frameMesh.position.y = this.frameBody.position.y
            this.frameMesh.position.z = this.frameBody.position.z
            this.frameMesh.quaternion.x = this.frameBody.quaternion.x
            this.frameMesh.quaternion.y = this.frameBody.quaternion.y
            this.frameMesh.quaternion.z = this.frameBody.quaternion.z
            this.frameMesh.quaternion.w = this.frameBody.quaternion.w
            this.wheelLFMesh.position.x = this.wheelLFBody.position.x
            this.wheelLFMesh.position.y = this.wheelLFBody.position.y
            this.wheelLFMesh.position.z = this.wheelLFBody.position.z
            this.wheelLFMesh.quaternion.x = this.wheelLFBody.quaternion.x
            this.wheelLFMesh.quaternion.y = this.wheelLFBody.quaternion.y
            this.wheelLFMesh.quaternion.z = this.wheelLFBody.quaternion.z
            this.wheelLFMesh.quaternion.w = this.wheelLFBody.quaternion.w

            this.wheelRFMesh.position.x = this.wheelRFBody.position.x
            this.wheelRFMesh.position.y = this.wheelRFBody.position.y
            this.wheelRFMesh.position.z = this.wheelRFBody.position.z
            this.wheelRFMesh.quaternion.x = this.wheelRFBody.quaternion.x
            this.wheelRFMesh.quaternion.y = this.wheelRFBody.quaternion.y
            this.wheelRFMesh.quaternion.z = this.wheelRFBody.quaternion.z
            this.wheelRFMesh.quaternion.w = this.wheelRFBody.quaternion.w

            this.wheelLBMesh.position.x = this.wheelLBBody.position.x
            this.wheelLBMesh.position.y = this.wheelLBBody.position.y
            this.wheelLBMesh.position.z = this.wheelLBBody.position.z
            this.wheelLBMesh.quaternion.x = this.wheelLBBody.quaternion.x
            this.wheelLBMesh.quaternion.y = this.wheelLBBody.quaternion.y
            this.wheelLBMesh.quaternion.z = this.wheelLBBody.quaternion.z
            this.wheelLBMesh.quaternion.w = this.wheelLBBody.quaternion.w

            this.wheelRBMesh.position.x = this.wheelRBBody.position.x
            this.wheelRBMesh.position.y = this.wheelRBBody.position.y
            this.wheelRBMesh.position.z = this.wheelRBBody.position.z
            this.wheelRBMesh.quaternion.x = this.wheelRBBody.quaternion.x
            this.wheelRBMesh.quaternion.y = this.wheelRBBody.quaternion.y
            this.wheelRBMesh.quaternion.z = this.wheelRBBody.quaternion.z
            this.wheelRBMesh.quaternion.w = this.wheelRBBody.quaternion.w

            this.constraintLB.setMotorSpeed(this.forwardVelocity)
            this.constraintRB.setMotorSpeed(this.forwardVelocity)
        }

        this.cameraPivot.getWorldPosition(this.v)
        this.v.y = Math.max(this.frameMesh.position.y + 2.5, this.v.y)
        camera.position.lerp(this.v, delta * 3) //orbit
        camera.lookAt(this.frameMesh.position)

        light.position.set(this.v.x + 50, 50, this.v.z + 50)
        light.target = this.frameMesh
    }

    spawn(startPosition: THREE.Vector3) {
        console.log('Spawn Car')
        this.enabled = false

        world.removeBody(this.frameBody)
        world.removeBody(this.wheelLFBody)
        world.removeBody(this.wheelRFBody)
        world.removeBody(this.wheelLBBody)
        world.removeBody(this.wheelRBBody)

        this.forwardVelocity = 0

        const o = new THREE.Object3D()
        o.position.copy(startPosition)

        const q = new CANNON.Quaternion().set(
            o.quaternion.x,
            o.quaternion.y,
            o.quaternion.z,
            o.quaternion.w
        )

        this.frameBody.velocity.set(0, 0, 0)
        this.frameBody.angularVelocity.set(0, 0, 0)
        this.frameBody.position.set(
            startPosition.x,
            startPosition.y,
            startPosition.z
        )
        this.frameBody.quaternion.copy(q)

        this.wheelLFBody.velocity.set(0, 0, 0)
        this.wheelLFBody.angularVelocity.set(0, 0, 0)
        this.wheelLFBody.position.set(
            startPosition.x - 1,
            startPosition.y,
            startPosition.z - 1
        )
        this.wheelLFBody.quaternion.copy(q)

        this.wheelRFBody.velocity.set(0, 0, 0)
        this.wheelRFBody.angularVelocity.set(0, 0, 0)
        this.wheelRFBody.position.set(
            startPosition.x + 1,
            startPosition.y,
            startPosition.z - 1
        )
        this.wheelRFBody.quaternion.copy(q)

        this.wheelLBBody.velocity.set(0, 0, 0)
        this.wheelLBBody.angularVelocity.set(0, 0, 0)
        this.wheelLBBody.position.set(
            startPosition.x - 1,
            startPosition.y,
            startPosition.z + 1
        )
        this.wheelLBBody.quaternion.copy(q)

        this.wheelRBBody.velocity.set(0, 0, 0)
        this.wheelRBBody.angularVelocity.set(0, 0, 0)
        this.wheelRBBody.position.set(
            startPosition.x + 1,
            startPosition.y,
            startPosition.z + 1
        )
        this.wheelRBBody.quaternion.copy(q)

        setTimeout(() => {
            world.addBody(this.frameBody)
            world.addBody(this.wheelLFBody)
            world.addBody(this.wheelRFBody)
            world.addBody(this.wheelLBBody)
            world.addBody(this.wheelRBBody)

            this.enabled = true
        }, 100)
    }
}

const scene = new THREE.Scene()

new RGBELoader().load(
    './img/kloppenheim_06_puresky_1k.hdr',
    function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping
        scene.background = texture
        scene.environment = texture
    }
)

const light = new THREE.DirectionalLight()
scene.add(light)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(20, 30, 20)
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)

document.body.appendChild(renderer.domElement)


const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

const gltfLoader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader()

const sphereShape = new CANNON.Sphere(0.9)
const sphereCount = 25
const sphereMesh = new Array(sphereCount)
const sphereBody = new Array(sphereCount)

const logCount = 25
const logMesh = new Array(logCount)
const logBody = new Array(logCount)

const treeCount = 50
const treeMesh = new Array(treeCount)

gltfLoader.load('./models/terrain.glb', (gltf) => {
    // blender --> lanscape preset canyons, subdivs X 32, Y 128, meshsize X 4, Y 16, editmode, UV unwrap
    const terrainMesh = gltf.scene.children[0] as THREE.Mesh
    //terrainMesh.receiveShadow = true
    terrainMesh.geometry.scale(100, 50, 100)
    const m = terrainMesh.material as THREE.MeshStandardMaterial
    m.map = textureLoader.load('./img/aerial_grass_rock_diff_1k.jpg')
    m.normalMap = textureLoader.load('./img/aerial_grass_rock_nor_dx_1k.jpg')

    const raycaster = new THREE.Raycaster()
    const down = new THREE.Vector3(0, -1, 0)
    const elementSize = 6

    for (let offsetZ = -130; offsetZ <= 130; offsetZ += 10) {
        const matrix = new Array()
        for (let x = -1; x <= 1; x++) {
            matrix.push([])
            for (let z = -5 - offsetZ; z <= 5 - offsetZ; z++) {
                raycaster.set(
                    new THREE.Vector3(x * elementSize, 100, -z * elementSize),
                    down
                )
                const intersects = raycaster.intersectObject(terrainMesh, false)
                matrix[x + 1][z + 5 + offsetZ] = intersects.length
                    ? intersects[0].point.y
                    : -100
            }
        }
        const terrainShape = new CANNON.Heightfield(matrix, {
            elementSize: elementSize,
        })
        const terrainBody = new CANNON.Body({ mass: 0 })
        terrainBody.addShape(terrainShape)
        terrainBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0),
            -Math.PI / 2
        )
        terrainBody.position.x = -1 * elementSize
        //terrainBody.position.y = 0.1
        terrainBody.position.z = 5 * elementSize + offsetZ * elementSize
        world.addBody(terrainBody)
    }

    scene.add(terrainMesh)

    for (let i = 0; i < sphereCount; i++) {
        sphereMesh[i] = new THREE.Mesh(
            new THREE.SphereGeometry(),
            new THREE.MeshStandardMaterial()
        )
        sphereMesh[i].material.map = textureLoader.load(
            './img/river_small_rocks_diff_1k.jpg'
        )
        sphereMesh[i].material.normalMap = textureLoader.load(
            './img/river_small_rocks_nor_dx_1k.jpg'
        )
        sphereMesh[i].position.set(0, 5, (Math.random() - 0.5) * 1500)
        raycaster.set(
            new THREE.Vector3(
                sphereMesh[i].position.x,
                100,
                sphereMesh[i].position.z
            ),
            down
        )
        const intersects = raycaster.intersectObject(terrainMesh, false)
        intersects.length
            ? (sphereMesh[i].position.y = intersects[0].point.y + 5)
            : (sphereMesh[i].position.y = 5)
        //sphereMesh[i].castShadow = true
        scene.add(sphereMesh[i])
        sphereBody[i] = new CANNON.Body({ mass: 1 })
        sphereBody[i].angularFactor.set(1, 1, 0)
        sphereBody[i].addShape(sphereShape)
        sphereBody[i].position.x = sphereMesh[i].position.x
        sphereBody[i].position.y = sphereMesh[i].position.y
        sphereBody[i].position.z = sphereMesh[i].position.z
        world.addBody(sphereBody[i])
    }
    //})

    gltfLoader.load('./models/log.glb', (gltf) => {
        const mesh = gltf.scene
        //mesh.traverse((m) => (m.castShadow = true))
        const material = (mesh.children[0] as THREE.Mesh)
            .material as THREE.MeshStandardMaterial
        material.normalMap = textureLoader.load(
            './img/bark_willow_nor_dx_1k.jpg'
        )
        for (let i = 0; i < logCount; i++) {
            logMesh[i] = mesh.clone()
            logMesh[i].position.set(0, 5, (Math.random() - 0.5) * 1500)
            raycaster.set(
                new THREE.Vector3(
                    logMesh[i].position.x,
                    100,
                    logMesh[i].position.z
                ),
                down
            )
            const intersects = raycaster.intersectObject(terrainMesh, false)
            intersects.length
                ? (logMesh[i].position.y = intersects[0].point.y + 5)
                : (logMesh[i].position.y = 5)
            //logMesh[i].castShadow = true
            scene.add(logMesh[i])
            logBody[i] = new CANNON.Body({ mass: 1 })
            logBody[i].angularFactor.set(1, 0, 0)
            const logShape = new CANNON.Cylinder(0.25, 0.25, 4, 6)
            const q = new CANNON.Quaternion()
            q.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2)
            logBody[i].addShape(logShape, new CANNON.Vec3(), q)
            logBody[i].position.x = logMesh[i].position.x
            logBody[i].position.y = logMesh[i].position.y
            logBody[i].position.z = logMesh[i].position.z
            world.addBody(logBody[i])
        }
    })


    gltfLoader.load('./models/tree1.glb', (gltf) => {
        const mesh = gltf.scene
        //mesh.traverse((m) => (m.castShadow = true))
        for (let i = 0; i < treeCount; i++) {
            treeMesh[i] = mesh.clone()
            treeMesh[i].position.set(
                (Math.random() + 0.1) * 200 * ((Math.random() * 2) | 0 || -1),
                5,
                (Math.random() - 0.5) * 1600
            )
            raycaster.set(
                new THREE.Vector3(
                    treeMesh[i].position.x,
                    100,
                    treeMesh[i].position.z
                ),
                down
            )
            const intersects = raycaster.intersectObject(terrainMesh, false)
            intersects.length
                ? (treeMesh[i].position.y = intersects[0].point.y - 0.1)
                : (treeMesh[i].position.y = -0.1)
            treeMesh[i].scale.setScalar(1 + Math.random() * 10)
            //treeMesh[i].castShadow = true
            scene.add(treeMesh[i])
        }
    })
    gltfLoader.load('./models/tree2.glb', (gltf) => {
        const mesh = gltf.scene
        //mesh.traverse((m) => (m.castShadow = true))
        for (let i = 0; i < treeCount; i++) {
            treeMesh[i] = mesh.clone()
            treeMesh[i].position.set(
                (Math.random() + 0.1) * 200 * ((Math.random() * 2) | 0 || -1),
                5,
                (Math.random() - 0.5) * 1600
            )
            raycaster.set(
                new THREE.Vector3(
                    treeMesh[i].position.x,
                    100,
                    treeMesh[i].position.z
                ),
                down
            )
            const intersects = raycaster.intersectObject(terrainMesh, false)
            intersects.length
                ? (treeMesh[i].position.y = intersects[0].point.y - 0.1)
                : (treeMesh[i].position.y = -0.1)
            treeMesh[i].scale.setScalar(1 + Math.random() * 10)
            //treeMesh[i].castShadow = true
            scene.add(treeMesh[i])
        }
    })
    gltfLoader.load('./models/tree3.glb', (gltf) => {
        const mesh = gltf.scene
        //mesh.traverse((m) => (m.castShadow = true))
        for (let i = 0; i < treeCount; i++) {
            treeMesh[i] = mesh.clone()
            treeMesh[i].position.set(
                (Math.random() + 0.1) * 200 * ((Math.random() * 2) | 0 || -1),
                5,
                (Math.random() - 0.5) * 1600
            )
            raycaster.set(
                new THREE.Vector3(
                    treeMesh[i].position.x,
                    100,
                    treeMesh[i].position.z
                ),
                down
            )
            const intersects = raycaster.intersectObject(terrainMesh, false)
            intersects.length
                ? (treeMesh[i].position.y = intersects[0].point.y - 0.1)
                : (treeMesh[i].position.y = -0.1)
            treeMesh[i].scale.setScalar(1 + Math.random() * 10)
            //treeMesh[i].castShadow = true
            scene.add(treeMesh[i])
        }
    })
})

const car = new Car(scene, world)
car.spawn(new THREE.Vector3(0, 10, 780))

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

const stats = new Stats()
document.body.appendChild(stats.dom)

const keyMap: { [id: string]: boolean } = {}
const onDocumentKey = (e: KeyboardEvent) => {
    keyMap[e.code] = e.type === 'keydown'
}

document.addEventListener('keydown', onDocumentKey, false)
document.addEventListener('keyup', onDocumentKey, false)

const clock = new THREE.Clock()

const cannonDebugRenderer = new CannonDebugRenderer(scene, world)

function animate() {
    requestAnimationFrame(animate)

    //controls.update()
    //helper.update()

    let delta = Math.min(clock.getDelta(), 0.1)
    world.step(delta)
    //cannonDebugRenderer.update()

    car.update(delta, camera, light)

    sphereMesh.forEach((_, i) => {
        sphereBody[i].position.x = 0
        sphereBody[i].force.x = 0
        sphereMesh[i].position.set(
            sphereBody[i].position.x,
            sphereBody[i].position.y,
            sphereBody[i].position.z
        )
        sphereMesh[i].quaternion.set(
            sphereBody[i].quaternion.x,
            sphereBody[i].quaternion.y,
            sphereBody[i].quaternion.z,
            sphereBody[i].quaternion.w
        )
    })

    logMesh.forEach((_, i) => {
        logBody[i].position.x = 0
        logBody[i].force.x = 0
        logMesh[i].position.set(
            logBody[i].position.x,
            logBody[i].position.y,
            logBody[i].position.z
        )
        logMesh[i].quaternion.set(
            logBody[i].quaternion.x,
            logBody[i].quaternion.y,
            logBody[i].quaternion.z,
            logBody[i].quaternion.w
        )
    })

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()