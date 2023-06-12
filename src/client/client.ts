import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import Stats from 'three/examples/jsm/libs/stats.module'
import * as CANNON from 'cannon-es'
import CannonDebugRenderer from './utils/cannonDebugRenderer'

const scene = new THREE.Scene()

const light1 = new THREE.SpotLight()
light1.position.set(10, 10, -10)
light1.angle = Math.PI / 4
light1.penumbra = 0.5
light1.castShadow = true
light1.shadow.mapSize.width = 2048
light1.shadow.mapSize.height = 2048
light1.shadow.camera.near = 10
light1.shadow.camera.far = 30
light1.shadow.bias = 0.001
scene.add(light1)

const light2 = new THREE.SpotLight()
light2.position.set(-10, 10, -10)
light2.angle = Math.PI / 4
light2.penumbra = 0.5
light2.castShadow = true
light2.shadow.mapSize.width = 2048
light2.shadow.mapSize.height = 2048
light2.shadow.camera.near = 10
light2.shadow.camera.far = 30
light2.shadow.bias = 0.001
scene.add(light2)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(-2, 6, 4)

const renderer = new THREE.WebGLRenderer()
renderer.shadowMap.enabled = true
//renderer.outputEncoding =  THREE.sRGBEncoding
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)

const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.54,
    flatShading: true,
})
const handMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.54,
    flatShading: true,
    transparent: true,
    opacity: 0.9,
})
const pmremGenerator = new THREE.PMREMGenerator(renderer)
const envTexture = new THREE.TextureLoader().load(
    'img/pano-equirectangular.jpg',
    () => {
        material.envMap = pmremGenerator.fromEquirectangular(envTexture).texture
    }
)

let hand: THREE.Group
let bowl: THREE.Mesh
let fingerBody: CANNON.Body

const gltfLoader = new GLTFLoader()
gltfLoader.load(
    'models/right-hand-bent.glb',
    function (gltf) {
        hand = gltf.scene
        hand.children[0].position.set(0.95, 4, 0.85)
        hand.children[0].receiveShadow = true
        hand.children[0].castShadow = true
        ;(hand.children[0] as THREE.Mesh).material = handMaterial

        scene.add(gltf.scene)

        fingerBody = new CANNON.Body({ mass: 0 })
        fingerBody.addShape(new CANNON.Sphere(0.25))
        fingerBody.addShape(
            new CANNON.Sphere(0.25),
            new CANNON.Vec3(0.05, 0.5, 0.1)
        )
        fingerBody.addShape(
            new CANNON.Sphere(0.25),
            new CANNON.Vec3(0.1, 1.0, 0.2)
        )
        fingerBody.position.set(0, 0, 0)
        world.addBody(fingerBody)

        const objLoader = new OBJLoader()
        objLoader.load(
            'models/bowl.obj',
            function (obj) {
                bowl = obj.children[0] as THREE.Mesh
                bowl.receiveShadow = true
                bowl.material = material
                scene.add(bowl)

                // using the raycaster to generate a cannon height field based on
                // the loaded bowl geometry
                const raycaster = new THREE.Raycaster()
                const down = new THREE.Vector3(0, -1, 0)
                const matrix: number[][] = []
                for (let x = -10; x <= 10; x++) {
                    matrix.push([])
                    for (let z = -10; z <= 10; z++) {
                        raycaster.set(new THREE.Vector3(x, 10, z), down)
                        const intersects = raycaster.intersectObject(
                            bowl,
                            false
                        )
                        if (intersects.length > 0) {
                            matrix[x + 10][z + 10] = intersects[0].point.y
                        } else {
                            matrix[x + 10][z + 10] = 0
                        }
                    }
                }

                let bowlBody = new CANNON.Body({ mass: 0 })
                var bowlShape = new CANNON.Heightfield(matrix)
                bowlBody.quaternion.setFromAxisAngle(
                    new CANNON.Vec3(1, 0, 0),
                    -Math.PI / 2
                )
                bowlBody.addShape(bowlShape, new CANNON.Vec3())
                bowlBody.position.x = -10
                bowlBody.position.z = 10
                world.addBody(bowlBody)

                renderer.domElement.addEventListener(
                    'mousemove',
                    onMouseMove,
                    false
                )
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

const ballCount = 100
const sphereMesh: THREE.Mesh[] = new Array()
const sphereBody: CANNON.Body[] = new Array()
for (let i = 0; i < ballCount; i++) {
    const sphereGeometry = new THREE.SphereGeometry(0.5, 8, 8)
    sphereMesh.push(new THREE.Mesh(sphereGeometry, material))
    sphereMesh[i].position.x = Math.random() * 10 - 5
    sphereMesh[i].position.y = i / 4 + 4
    sphereMesh[i].position.z = Math.random() * 10 - 5
    sphereMesh[i].castShadow = true
    sphereMesh[i].receiveShadow = true
    scene.add(sphereMesh[i])
    const sphereShape = new CANNON.Sphere(0.5)
    sphereBody.push(new CANNON.Body({ mass: 0.1 }))
    sphereBody[i].addShape(sphereShape)
    sphereBody[i].position.x = sphereMesh[i].position.x
    sphereBody[i].position.y = sphereMesh[i].position.y
    sphereBody[i].position.z = sphereMesh[i].position.z
    world.addBody(sphereBody[i])
}

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

const raycaster = new THREE.Raycaster()

let fingerTo = new THREE.Vector3()

function onMouseMove(event: MouseEvent) {
    const mouse = {
        x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
    }

    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObject(bowl, false)

    if (intersects.length > 0) {
        fingerTo.copy(intersects[0].point)
    }
}

const stats = new Stats()
document.body.appendChild(stats.dom)

const clock = new THREE.Clock()
let delta

const cannonDebugRenderer = new CannonDebugRenderer(scene, world)

function animate() {
    requestAnimationFrame(animate)
    controls.update()

    delta = clock.getDelta()
    if (delta > 0.1) delta = 0.1
    world.step(delta)

    if (hand) {
        hand.position.copy(fingerTo)
        fingerBody.position.set(
            hand.position.x,
            hand.position.y + 0.66,
            hand.position.z
        )
        for (let i = 0; i < ballCount; i++) {
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
        }
    }

    //un-commment next line to see the cannon debug renderer shapes
    //cannonDebugRenderer.update()

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()