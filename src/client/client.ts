import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Stats from 'three/examples/jsm/libs/stats.module'
import * as CANNON from 'cannon-es'
import CannonDebugRenderer from './utils/cannonDebugRenderer'

const scene = new THREE.Scene()

var light1 = new THREE.SpotLight()
light1.position.set(2.5, 5, 2.5)
light1.angle = Math.PI / 8
light1.penumbra = 0.5
light1.castShadow = true
light1.shadow.mapSize.width = 1024
light1.shadow.mapSize.height = 1024
light1.shadow.camera.near = 0.5
light1.shadow.camera.far = 20
scene.add(light1)

var light2 = new THREE.SpotLight()
light2.position.set(-2.5, 5, 2.5)
light2.angle = Math.PI / 8
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
    0.01,
    100
)
camera.position.set(0, 1.4, 2.0)

const followCamPivot = new THREE.Object3D()
followCamPivot.rotation.order = 'YXZ'
const followCam = new THREE.Object3D()
followCam.position.z = 2
followCamPivot.add(followCam)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputEncoding = THREE.sRGBEncoding
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

const groundMaterial = new CANNON.Material('groundMaterial')
const slipperyMaterial = new CANNON.Material('slipperyMaterial')
const slippery_ground_cm = new CANNON.ContactMaterial(
    groundMaterial,
    slipperyMaterial,
    {
        friction: 0,
        restitution: 0.3,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
    }
)
world.addContactMaterial(slippery_ground_cm)

// Character Collider
const characterCollider = new THREE.Object3D()
characterCollider.add(followCamPivot)
characterCollider.position.y = 3
scene.add(characterCollider)
const colliderShape = new CANNON.Sphere(0.5)
const colliderBody = new CANNON.Body({ mass: 1, material: slipperyMaterial })
colliderBody.addShape(colliderShape, new CANNON.Vec3(0, 0.5, 0))
colliderBody.addShape(colliderShape, new CANNON.Vec3(0, -0.5, 0))
colliderBody.position.set(
    characterCollider.position.x,
    characterCollider.position.y,
    characterCollider.position.z
)
colliderBody.linearDamping = 0.95
colliderBody.angularFactor.set(0, 1, 0) // prevents rotation X,Z axis
world.addBody(colliderBody)

let mixer: THREE.AnimationMixer
let modelReady = false
let modelMesh: THREE.Object3D
const animationActions: THREE.AnimationAction[] = []
let activeAction: THREE.AnimationAction
let lastAction: THREE.AnimationAction

const gltfLoader = new GLTFLoader()
gltfLoader.load(
    'models/eve.glb',
    (gltf) => {
        gltf.scene.traverse(function (child) {
            if ((child as THREE.Mesh).isMesh) {
                let m = child
                m.receiveShadow = true
                m.castShadow = true
                m.frustumCulled = false
                ;(m as THREE.Mesh).geometry.computeVertexNormals()
                if ((child as THREE.Mesh).material) {
                    const mat = (child as THREE.Mesh).material
                    ;(mat as THREE.Material).transparent = false
                    ;(mat as THREE.Material).side = THREE.FrontSide
                }
            }
        })
        mixer = new THREE.AnimationMixer(gltf.scene)
        let animationAction = mixer.clipAction(gltf.animations[0])
        animationActions.push(animationAction)
        activeAction = animationActions[0]
        scene.add(gltf.scene)
        modelMesh = gltf.scene
        light1.target = modelMesh
        light2.target = modelMesh

        //add an animation from another file
        gltfLoader.load(
            'models/eve@walking.glb',
            (gltf) => {
                console.log('loaded Eve walking')
                let animationAction = mixer.clipAction(gltf.animations[0])
                animationActions.push(animationAction)

                gltfLoader.load(
                    'models/eve@jump.glb',
                    (gltf) => {
                        console.log('loaded Eve jump')
                        gltf.animations[0].tracks.shift() //delete the specific track that moves the object up/down while jumping
                        let animationAction = mixer.clipAction(
                            gltf.animations[0]
                        )
                        animationActions.push(animationAction)
                        //progressBar.style.display = 'none'
                        modelReady = true

                        setAction(animationActions[1], true)
                    },
                    (xhr) => {
                        if (xhr.lengthComputable) {
                            //const percentComplete = (xhr.loaded / xhr.total) * 100
                            //progressBar.value = percentComplete
                            //progressBar.style.display = 'block'
                        }
                    },
                    (error) => {
                        console.log(error)
                    }
                )
            },
            (xhr) => {
                if (xhr.lengthComputable) {
                    //const percentComplete = (xhr.loaded / xhr.total) * 100
                    //progressBar.value = percentComplete
                    //progressBar.style.display = 'block'
                }
            },
            (error) => {
                console.log(error)
            }
        )
    },
    (xhr) => {
        if (xhr.lengthComputable) {
            //const percentComplete = (xhr.loaded / xhr.total) * 100
            //progressBar.value = percentComplete
            //progressBar.style.display = 'block'
        }
    },
    (error) => {
        console.log(error)
    }
)

const setAction = (toAction: THREE.AnimationAction, loop: Boolean) => {
    if (toAction != activeAction) {
        lastAction = activeAction
        activeAction = toAction
        lastAction.fadeOut(0.1)
        activeAction.reset()
        activeAction.fadeIn(0.1)
        activeAction.play()
        if (!loop) {
            activeAction.clampWhenFinished = true
            activeAction.loop = THREE.LoopOnce
        }
    }
}

let moveForward = false
let moveBackward = false
let moveLeft = false
let moveRight = false
let canJump = true
const contactNormal = new CANNON.Vec3()
const upAxis = new CANNON.Vec3(0, 1, 0)
colliderBody.addEventListener('collide', function (e: any) {
    const contact = e.contact
    if (contact.bi.id == colliderBody.id) {
        contact.ni.negate(contactNormal)
    } else {
        contactNormal.copy(contact.ni)
    }
    if (contactNormal.dot(upAxis) > 0.5) {
        if (!canJump) {
            setAction(animationActions[1], true)
        }
        canJump = true
    }
})

const planeGeometry = new THREE.PlaneGeometry(100, 100)
const texture = new THREE.TextureLoader().load('img/grid.png')
const plane = new THREE.Mesh(
    planeGeometry,
    new THREE.MeshPhongMaterial({ map: texture })
)
plane.rotateX(-Math.PI / 2)
plane.receiveShadow = true
scene.add(plane)
const planeShape = new CANNON.Plane()
const planeBody = new CANNON.Body({ mass: 0, material: groundMaterial })
planeBody.addShape(planeShape)
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
world.addBody(planeBody)

const boxes: CANNON.Body[] = []
const boxMeshes: THREE.Mesh[] = []
for (let i = 0; i < 50; i++) {
    const halfExtents = new CANNON.Vec3(
        Math.random() * 2,
        Math.random() * 2,
        Math.random() * 2
    )
    const boxShape = new CANNON.Box(halfExtents)
    const boxGeometry = new THREE.BoxGeometry(
        halfExtents.x * 2,
        halfExtents.y * 2,
        halfExtents.z * 2
    )
    const x = (Math.random() - 0.5) * 20
    const y = 2 + i * 2
    const z = (Math.random() - 0.5) * 20
    const boxBody = new CANNON.Body({ mass: 1, material: groundMaterial })
    boxBody.addShape(boxShape)
    const boxMesh = new THREE.Mesh(boxGeometry, new THREE.MeshStandardMaterial())
    world.addBody(boxBody)
    scene.add(boxMesh)
    boxBody.position.set(x, y, z)
    boxMesh.castShadow = true
    boxMesh.receiveShadow = true
    boxes.push(boxBody)
    boxMeshes.push(boxMesh)
}

const menuPanel = document.getElementById('menuPanel') as HTMLDivElement
const startButton = document.getElementById('startButton') as HTMLInputElement
startButton.addEventListener(
    'click',
    () => {
        controls.lock()
    },
    false
)

const controls = new PointerLockControls(camera, renderer.domElement)

controls.addEventListener('lock', () => {
    startButton.style.display = 'none'
    menuPanel.style.display = 'none'

    document.addEventListener('keydown', onDocumentKey, false)
    document.addEventListener('keyup', onDocumentKey, false)

    renderer.domElement.addEventListener(
        'mousemove',
        onDocumentMouseMove,
        false
    )
    renderer.domElement.addEventListener(
        'mousewheel',
        onDocumentMouseWheel,
        false
    )
})

controls.addEventListener('unlock', () => {
    menuPanel.style.display = 'block'

    document.removeEventListener('keydown', onDocumentKey, false)
    document.removeEventListener('keyup', onDocumentKey, false)

    renderer.domElement.removeEventListener(
        'mousemove',
        onDocumentMouseMove,
        false
    )
    renderer.domElement.removeEventListener(
        'mousewheel',
        onDocumentMouseWheel,
        false
    )

    setTimeout(() => {
        startButton.style.display = 'block'
    }, 1000)
})

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

const onDocumentMouseMove = (e: MouseEvent) => {
    followCamPivot.rotation.y -= e.movementX * 0.002
    followCamPivot.rotation.x -= e.movementY * 0.002
    return false
}

const onDocumentMouseWheel = (e: THREE.Event) => {
    let newVal = followCam.position.z + e.deltaY * 0.05
    if (newVal > 0.25 && newVal < 10) {
        followCam.position.z = newVal
    }
    return false
}

const keyMap: { [id: string]: boolean } = {}
const onDocumentKey = (e: KeyboardEvent) => {
    keyMap[e.code] = e.type === 'keydown'

    if (controls.isLocked) {
        moveForward = keyMap['KeyW']
        moveBackward = keyMap['KeyS']
        moveLeft = keyMap['KeyA']
        moveRight = keyMap['KeyD']

        if (keyMap['Space']) {
            if (canJump === true) {
                colliderBody.velocity.y = 10
                setAction(animationActions[2], false)
            }
            canJump = false
        }
    }
}

const inputVelocity = new THREE.Vector3()
const velocity = new CANNON.Vec3()
const euler = new THREE.Euler()
const quat = new THREE.Quaternion()
const camTo = new THREE.Vector3()
const targetQuaternion = new THREE.Quaternion()
let distance = 0

const stats = new Stats()
document.body.appendChild(stats.dom)

const clock = new THREE.Clock()
let delta = 0

//const cannonDebugRenderer = new CannonDebugRenderer(scene, world)

function animate() {
    requestAnimationFrame(animate)

    if (modelReady) {
        if (canJump) {
            //walking
            mixer.update(delta * distance * 5)
        } else {
            //were in the air
            mixer.update(delta)
        }
        const p = characterCollider.position
        p.y -= 1
        modelMesh.position.y = characterCollider.position.y
        distance = modelMesh.position.distanceTo(p)

        const rotationMatrix = new THREE.Matrix4()
        rotationMatrix.lookAt(p, modelMesh.position, modelMesh.up)
        targetQuaternion.setFromRotationMatrix(rotationMatrix)

        if (!modelMesh.quaternion.equals(targetQuaternion)) {
            modelMesh.quaternion.rotateTowards(targetQuaternion, delta * 10)
        }

        if (canJump) {
            inputVelocity.set(0, 0, 0)

            if (moveForward) {
                inputVelocity.z = -10 * delta
            }
            if (moveBackward) {
                inputVelocity.z = 10 * delta
            }

            if (moveLeft) {
                inputVelocity.x = -10 * delta
            }
            if (moveRight) {
                inputVelocity.x = 10 * delta
            }

            // apply camera rotation to inputVelocity
            euler.y = followCamPivot.rotation.y
            euler.order = 'XYZ'
            quat.setFromEuler(euler)
            inputVelocity.applyQuaternion(quat)
        }

        modelMesh.position.lerp(characterCollider.position, 0.1)
    }
    velocity.set(inputVelocity.x, inputVelocity.y, inputVelocity.z)
    colliderBody.applyImpulse(velocity)

    delta = Math.min(clock.getDelta(), 0.1)
    world.step(delta)

    //cannonDebugRenderer.update()

    characterCollider.position.set(
        colliderBody.position.x,
        colliderBody.position.y,
        colliderBody.position.z
    )
    boxes.forEach((b, i) => {
        boxMeshes[i].position.set(b.position.x, b.position.y, b.position.z)
        boxMeshes[i].quaternion.set(
            b.quaternion.x,
            b.quaternion.y,
            b.quaternion.z,
            b.quaternion.w
        )
    })

    followCam.getWorldPosition(camTo)
    camera.position.lerpVectors(camera.position, camTo, 0.1)

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()