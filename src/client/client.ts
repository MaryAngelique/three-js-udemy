import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { CSM } from 'three/examples/jsm/csm/CSM'
import { CSMHelper } from 'three/examples/jsm/csm/CSMHelper'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(4, 1, 7)

const csm = new CSM({
    fade: true,
    far: camera.far,
    cascades: 4,
    shadowMapSize: 4096,
    lightDirection: new THREE.Vector3(-1, -1, 0),
    camera: camera,
    parent: scene,
    lightIntensity: 0.5
})

console.log(csm)

const csmHelper = new CSMHelper(csm)
csmHelper.displayFrustum = true
csmHelper.displayPlanes = true
csmHelper.displayShadowBounds = true
scene.add(csmHelper as any)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.dampingFactor = 0.05
controls.enableDamping = true

const trees = ['birchTreeWithLeaves', 'saplingTree', 'tree1WithLeaves']
const material = new THREE.MeshPhongMaterial({ color: 0x567d46 })

const gLTFLoader = new GLTFLoader()
trees.forEach((tree) => {
    gLTFLoader.load(
        'models/' + tree + '.glb',
        (gltf) => {
            let childObjectCount = 0
            gltf.scene.traverse(function (child) {
                if ((child as THREE.Mesh).isMesh) {
                    child.castShadow = true
                    childObjectCount++
                }
            })
            const instancesCount = 100
            const positions = []
            for (let i = 0; i < instancesCount; i++) {
                positions.push(
                    new THREE.Vector3(
                        Math.random() * 200 - 100,
                        0,
                        Math.random() * 200 - 100
                    )
                )
            }
            const scales = []
            for (let i = 0; i < instancesCount; i++) {
                scales.push({
                    x: Math.random() + 2,
                    y: Math.random() + 2,
                    z: Math.random() + 2
                })
            }
            const rotations = []
            for (let i = 0; i < instancesCount; i++) {
                rotations.push(Math.random() * Math.PI * 2)
            }
            for (let i = 0; i < childObjectCount; i++) {
                const geometry = (
                    gltf.scene.children[2].children[i] as THREE.Mesh
                ).geometry
                const copy = new THREE.InstancedMesh(
                    geometry,
                    (gltf.scene.children[2].children[i] as THREE.Mesh).material,
                    instancesCount
                )
                copy.castShadow = true
                const matrix = new THREE.Matrix4()
                for (let j = 0; j < instancesCount; j++) {
                    matrix.makeRotationY(rotations[j])
                    matrix.makeScale(scales[j].x, scales[j].y, scales[j].z)
                    matrix.setPosition(positions[j])
                    copy.setMatrixAt(j, matrix)
                }
                scene.add(copy)
            }
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )
})

const planeGeometry = new THREE.PlaneGeometry(200, 200)
const planeMesh = new THREE.Mesh(planeGeometry, material)
planeMesh.rotateX(-Math.PI / 2)
planeMesh.receiveShadow = true
scene.add(planeMesh)

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
const csmFolder = gui.addFolder('CSM')
csmFolder.add(csm.lightDirection, 'x', -1, 1, 0.01)
csmFolder.add(csm.lightDirection, 'y', -1, 1, 0.01)
csmFolder.add(csm.lightDirection, 'z', -1, 1, 0.01)
csmFolder.add(csm, 'lightNear', 1, 1000, 1).onChange(function (value) {
    for (let i = 0; i < csm.lights.length; i++) {
        csm.lights[i].shadow.camera.near = value
        csm.lights[i].shadow.camera.updateProjectionMatrix()
    }
})
csmFolder.add(csm, 'lightFar', 1, 1000, 1).onChange(function (value) {
    for (let i = 0; i < csm.lights.length; i++) {
        csm.lights[i].shadow.camera.far = value
        csm.lights[i].shadow.camera.updateProjectionMatrix()
    }
})
csmFolder.add(csm, 'lightIntensity', 0.1, 2, 0.1).onChange(function (value) {
    for (let i = 0; i < csm.lights.length; i++) {
        csm.lights[i].intensity = value
    }
})
csmFolder.open()

function animate() {
    requestAnimationFrame(animate)

    controls.update()

    csm.update()
    csmHelper.update()

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()