import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Stats from 'three/examples/jsm/libs/stats.module'
import * as CANNON from 'cannon-es'
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min'

const scene = new THREE.Scene()
const axesHelper = new THREE.AxesHelper(5)
scene.add(axesHelper)

const light1 = new THREE.SpotLight()
light1.position.set(2.5, 5, 2.5)
light1.angle = Math.PI / 4
light1.penumbra = 0.5
light1.castShadow = true
light1.shadow.mapSize.width = 1024
light1.shadow.mapSize.height = 1024
light1.shadow.camera.near = 0.5
light1.shadow.camera.far = 20
scene.add(light1)

const light2 = new THREE.SpotLight()
light2.position.set(-2.5, 5, 2.5)
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
    0.01,
    1000
)
camera.position.set(0.8, 1.4, 1.0)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.screenSpacePanning = true
controls.target.set(0, 1, 0)

let sceneMeshes = new Array()

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

const planeGeometry = new THREE.PlaneGeometry(25, 25)
const texture = new THREE.TextureLoader().load('img/grid.png')
const plane: THREE.Mesh = new THREE.Mesh(
    planeGeometry,
    new THREE.MeshPhongMaterial({ map: texture })
)
plane.rotateX(-Math.PI / 2)
plane.receiveShadow = true
scene.add(plane)

const planeShape = new CANNON.Plane()
const planeBody = new CANNON.Body({ mass: 0 })
planeBody.addShape(planeShape)
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
world.addBody(planeBody)

const cubeMeshes: THREE.Mesh[] = []
const cubeBodies: CANNON.Body[] = []

for (let i = 0; i < 10; i++) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshPhongMaterial({ map: texture })
    )
    mesh.position.x = Math.floor(Math.random() * 10) - 5
    mesh.position.z = Math.floor(Math.random() * 10) - 5
    mesh.position.y = 5 + i
    mesh.castShadow = true
    scene.add(mesh)
    cubeMeshes.push(mesh)
    sceneMeshes.push(mesh)
    const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1))
    const body = new CANNON.Body({ mass: 1 })
    body.addShape(shape)
    body.position.x = mesh.position.x
    body.position.y = mesh.position.y
    body.position.z = mesh.position.z
    cubeBodies.push(body)
    world.addBody(body)
}

const gltfLoader = new GLTFLoader()

let leftFoot: THREE.Object3D
let leftFootMesh: THREE.Object3D
let leftFootBody: CANNON.Body

function addLeftFootBox() {
    leftFootMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2),
        new THREE.MeshBasicMaterial({ wireframe: true, color: 0x00ff00 })
    )
    leftFootMesh.position.set(0, 0, 0)
    scene.add(leftFootMesh)

    const leftFootShape = new CANNON.Sphere(0.2)
    leftFootBody = new CANNON.Body({ mass: 1 })
    leftFootBody.addShape(leftFootShape)
    leftFootBody.position.x = 0
    leftFootBody.position.y = 10
    leftFootBody.position.z = 0
    world.addBody(leftFootBody)
}

let mixer: THREE.AnimationMixer
let modelReady = false
let modelMesh: THREE.Object3D
let animationActions: THREE.AnimationAction[] = []
let activeAction: THREE.AnimationAction
let lastAction: THREE.AnimationAction

gltfLoader.load(
    'models/Kachujin.glb',
    (gltf) => {
        gltf.scene.traverse(function (child) {
            if ((child as THREE.Mesh).isMesh) {
                let m = child as THREE.Mesh
                m.castShadow = true
                m.frustumCulled = false
                m.geometry.computeVertexNormals()
            }
            if (child.name === 'LeftFoot') {
                leftFoot = child
            }
        })

        mixer = new THREE.AnimationMixer(gltf.scene)

        let animationAction = mixer.clipAction((gltf as any).animations[0])
        animationActions.push(animationAction)
        activeAction = animationActions[0]

        scene.add(gltf.scene)
        modelMesh = gltf.scene

        //add an animation from another file
        gltfLoader.load(
            'models/Kachujin@kick.glb',
            (gltf) => {
                console.log('loaded Kachujin kick')
                let animationAction = mixer.clipAction(
                    (gltf as any).animations[0]
                )
                animationActions.push(animationAction)

                //add an animation from another file
                gltfLoader.load(
                    'models/Kachujin@walking.glb',
                    (gltf) => {
                        console.log('loaded Kachujin walking')
                        ;(gltf as any).animations[0].tracks.shift() //delete the specific track that moves the object forward while running
                        let animationAction = mixer.clipAction(
                            (gltf as any).animations[0]
                        )
                        animationActions.push(animationAction)

                        modelReady = true
                    },
                    (xhr) => {
                        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
                    },
                    (error) => {
                        console.log(error)
                    }
                )
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
            },
            (error) => {
                console.log(error)
            }
        )

        addLeftFootBox()
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

const raycaster = new THREE.Raycaster()
const targetQuaternion = new THREE.Quaternion()

renderer.domElement.addEventListener('dblclick', onDoubleClick, false)
function onDoubleClick(event: MouseEvent) {
    const mouse = {
        x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
    }
    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(sceneMeshes, false)

    if (intersects.length > 0) {
        //get the normal of the point
        const p = intersects[0].point
        const n = (intersects[0].face as THREE.Face).normal

        const rotationMatrixObject = new THREE.Matrix4().extractRotation(
            intersects[0].object.matrixWorld
        )
        const normalWorld = n.clone().applyMatrix4(rotationMatrixObject)

        p.y = 0
        let walkToPoint = p.clone()
        walkToPoint = walkToPoint.addScaledVector(normalWorld, 1)
        walkToPoint.y = 0
        const distance = modelMesh.position.distanceTo(walkToPoint)

        const rotationMatrix = new THREE.Matrix4()
        rotationMatrix.lookAt(walkToPoint, modelMesh.position, modelMesh.up)
        targetQuaternion.setFromRotationMatrix(rotationMatrix)

        setAction(animationActions[2])

        TWEEN.removeAll()
        new TWEEN.Tween(modelMesh.position)
            .to(
                {
                    x: walkToPoint.x,
                    y: walkToPoint.y,
                    z: walkToPoint.z,
                },
                (1000 / 2.2) * distance
            ) //walks 2 meters a second * the distance
            .onUpdate(() => {
                controls.target.set(
                    modelMesh.position.x,
                    modelMesh.position.y + 1,
                    modelMesh.position.z
                )
                light1.target = modelMesh
                light2.target = modelMesh
            })
            .start()
            .onComplete(() => {
                rotationMatrix.lookAt(p, modelMesh.position, modelMesh.up)
                targetQuaternion.setFromRotationMatrix(rotationMatrix)
                setAction(animationActions[1])
                activeAction.clampWhenFinished = true
                activeAction.loop = THREE.LoopOnce
            })
    }
}

const stats = new Stats()
document.body.appendChild(stats.dom)

const setAction = (toAction: THREE.AnimationAction) => {
    if (toAction != activeAction) {
        lastAction = activeAction
        activeAction = toAction
        lastAction.fadeOut(0.2)
        activeAction.reset()
        activeAction.fadeIn(0.2)
        activeAction.play()
    }
}

const clock = new THREE.Clock()

function animate() {
    requestAnimationFrame(animate)

    controls.update()

    let delta = clock.getDelta()
    if (delta > 0.1) delta = 0.1
    world.step(delta)

    if (modelReady) {
        mixer.update(delta)

        if (!modelMesh.quaternion.equals(targetQuaternion)) {
            modelMesh.quaternion.rotateTowards(targetQuaternion, delta * 10)
        }
    }

    TWEEN.update()

    cubeMeshes.forEach((m, i) => {
        m.position.set(
            cubeBodies[i].position.x,
            cubeBodies[i].position.y,
            cubeBodies[i].position.z
        )
        m.quaternion.set(
            cubeBodies[i].quaternion.x,
            cubeBodies[i].quaternion.y,
            cubeBodies[i].quaternion.z,
            cubeBodies[i].quaternion.w
        )
    })

    if (leftFootMesh) {
        leftFoot.getWorldPosition(leftFootMesh.position)

        leftFootBody.position.x = leftFootMesh.position.x
        leftFootBody.position.y = leftFootMesh.position.y
        leftFootBody.position.z = leftFootMesh.position.z
        leftFootBody.quaternion.x = leftFootMesh.quaternion.x
        leftFootBody.quaternion.y = leftFootMesh.quaternion.y
        leftFootBody.quaternion.z = leftFootMesh.quaternion.z
        leftFootBody.quaternion.w = leftFootMesh.quaternion.w
        leftFootBody.velocity.set(0, 0, 0)
        leftFootBody.angularVelocity.set(0, 0, 0)
    }

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}
animate()