import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Reflector } from 'three/examples/jsm/objects/Reflector'
import * as CANNON from 'cannon-es'
import CannonUtils from './utils/cannonUtils'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry'
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min'
import {
    CSS2DRenderer,
    CSS2DObject,
} from 'three/examples/jsm/renderers/CSS2DRenderer'

interface Annotation {
    title: string
    description: string
    descriptionDomElement?: HTMLElement
}

let annotations: { [key: string]: Annotation } = {}
const annotationMarkers: THREE.Sprite[] = []

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xaec6cf)

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)
world.allowSleep = true

var light = new THREE.DirectionalLight()
light.position.set(2.5, 7.5, 15)
scene.add(light)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(1, 1, 1.5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.sortObjects = false
document.body.appendChild(renderer.domElement)

const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(window.innerWidth, window.innerHeight)
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.top = '0px'
labelRenderer.domElement.style.pointerEvents = 'none'
document.body.appendChild(labelRenderer.domElement)

const circleTexture = new THREE.TextureLoader().load('img/circle.png')
const envTexture = new THREE.CubeTextureLoader().load([
    'img/px_25.jpg',
    'img/nx_25.jpg',
    'img/py_25.jpg',
    'img/ny_25.jpg',
    'img/pz_25.jpg',
    'img/nz_25.jpg',
])
envTexture.mapping = THREE.CubeReflectionMapping

const groundMirror = new Reflector(new THREE.PlaneGeometry(500, 500), {
    color: new THREE.Color(0x222222),
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
})
groundMirror.position.y = -0.005
groundMirror.rotateX(-Math.PI / 2)
groundMirror.layers.set(1)
scene.add(groundMirror)

const planeShape = new CANNON.Plane()
const planeBody = new CANNON.Body({ mass: 0 })
planeBody.addShape(planeShape)
planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
world.addBody(planeBody)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0.5, 0)
controls.addEventListener('change', function () {
    if (camera.position.y < 0.1) {
        camera.position.y = 0.1
    }
})

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(2048)
const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget)
scene.add(cubeCamera)

const lensMaterial = new THREE.MeshPhysicalMaterial({
    metalness: 1.0,
    roughness: 0.2,
    envMap: cubeRenderTarget.texture,
    transparent: true,
    opacity: 0.5,
    transmission: 0.1,
    side: THREE.FrontSide,
    clearcoat: 1.0,
    clearcoatRoughness: 0.39,
})

const armMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x444444,
    envMap: envTexture,
    metalness: 1,
    roughness: 0,
})

const hingMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf0e68c,
    envMap: envTexture,
    metalness: 1,
    roughness: 0,
})

const frameRefraction = new THREE.MeshPhysicalMaterial({
    metalness: 1,
    roughness: 0,
    color: 0xffffff,
    envMap: cubeRenderTarget.texture,
    transparent: true,
    transmission: 1.0,
    side: THREE.BackSide,
})

const frameMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb2ffc8,
    envMap: envTexture,
    metalness: 1,
    roughness: 0,
    transparent: true,
    opacity: 0.75,
    side: THREE.FrontSide,
})

cubeRenderTarget.texture.mapping = THREE.CubeRefractionMapping

let modelReady = false
let glasses = new THREE.Object3D()
const glassesBody = new CANNON.Body({ mass: 1 })
const glTFLoader = new GLTFLoader()
let annotationCounter = 0

glTFLoader.load(
    'models/glasses.glb',
    (gltf) => {
        gltf.scene.traverse(function (child) {
            if ((<THREE.Mesh>child).isMesh) {
                const mesh = (<THREE.Mesh>child).clone()
                mesh.rotation.x = 0
                if (mesh.name.endsWith('Lens')) {
                    mesh.material = lensMaterial
                    glasses.add(mesh)
                    glassesBody.addShape(
                        gemoetryToShape(mesh.geometry as THREE.BufferGeometry)
                    )
                } else if (mesh.name.endsWith('hinge')) {
                    mesh.material = hingMaterial
                    glasses.add(mesh)
                    glassesBody.addShape(
                        gemoetryToShape(mesh.geometry as THREE.BufferGeometry)
                    )
                } else if (mesh.name.endsWith('frame')) {
                    mesh.material = frameRefraction
                    glasses.add(mesh)
                    const newMesh = new THREE.Mesh(
                        mesh.geometry.clone(),
                        frameMaterial
                    )
                    newMesh.rotation.copy(mesh.rotation)
                    glasses.add(newMesh)
                    const shape = gemoetryToShape(
                        mesh.geometry as THREE.BufferGeometry
                    )
                    glassesBody.addShape(shape)
                } else if (mesh.name.endsWith('Arm')) {
                    mesh.material = armMaterial
                    glasses.add(mesh)
                    glassesBody.addShape(
                        gemoetryToShape(mesh.geometry as THREE.BufferGeometry)
                    )
                }
            } else if (child.isObject3D) {
                if (child.name.startsWith('Annotation')) {
                    const aId = (annotationCounter++).toString()
                    annotations[aId] = {
                        title: child.userData.title,
                        description: child.userData.description,
                    }
                    const annotationSpriteMaterial = new THREE.SpriteMaterial({
                        map: circleTexture,
                        depthTest: false,
                        depthWrite: false,
                        sizeAttenuation: false,
                    })
                    const annotationSprite = new THREE.Sprite(
                        annotationSpriteMaterial
                    )
                    annotationSprite.scale.set(6.6, 6.6, 6.6)
                    //changing from blender annotation coords to threejs coords
                    const tmpY = -child.position.y
                    child.position.y = child.position.z
                    child.position.z = tmpY
                    child.getWorldPosition(annotationSprite.position)
                    annotationSprite.userData.id = aId
                    glasses.add(annotationSprite)
                    annotationSprite.layers.set(1)
                    annotationMarkers.push(annotationSprite)
                    const annotationDiv = document.createElement('div')
                    annotationDiv.className = 'annotationLabel'
                    annotationDiv.innerHTML = aId
                    const annotationLabel = new CSS2DObject(annotationDiv)
                    annotationLabel.position.copy(annotationSprite.position)
                    glasses.add(annotationLabel)
                    if (child.userData.title) {
                        const annotationTextDiv = document.createElement('div')
                        annotationTextDiv.className = 'annotationDescription'
                        annotationTextDiv.innerHTML = child.userData.title
                        if (child.userData.description) {
                            annotationTextDiv.innerHTML +=
                                '<p>' + child.userData.description + '</p>'
                        }
                        annotationDiv.appendChild(annotationTextDiv)
                        annotations[aId].descriptionDomElement =
                            annotationTextDiv
                    }
                }
            }
        })

        glasses.scale.set(0.01, 0.01, 0.01)
        scene.add(glasses)

        glassesBody.position.y = 5
        glassesBody.quaternion.x = Math.PI / 4
        glassesBody.quaternion.z = -Math.PI / 7
        glassesBody.sleepSpeedLimit = 1
        world.addBody(glassesBody)

        modelReady = true
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)

function gemoetryToShape(geometry: THREE.BufferGeometry) {
    const position = geometry.attributes.position.array
    const points: THREE.Vector3[] = []
    for (let i = 0; i < position.length; i += 3) {
        points.push(
            new THREE.Vector3(position[i], position[i + 1], position[i + 2])
        )
    }
    const convexHull = new ConvexGeometry(points)
    const shape = CannonUtils.CreateTrimesh(convexHull.scale(0.01, 0.01, 0.01))
    return shape
}

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    labelRenderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

const raycaster = new THREE.Raycaster()
raycaster.layers.set(1)

renderer.domElement.addEventListener('pointerdown', onClick, false)

function onClick(event: MouseEvent) {
    raycaster.setFromCamera(
        {
            x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
            y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
        },
        camera
    )
    const intersects = raycaster.intersectObjects(annotationMarkers, true)
    if (intersects.length > 0) {
        if (intersects[0].object.userData && intersects[0].object.userData.id) {
            const p = intersects[0].point
            const diffVec3 = p.clone().sub(controls.target)
            const camTo = camera.position.clone().add(diffVec3)
            new TWEEN.Tween(controls.target)
                .to(
                    {
                        x: p.x,
                        y: p.y,
                        z: p.z,
                    },
                    500
                )
                .easing(TWEEN.Easing.Cubic.Out)
                .start()
            new TWEEN.Tween(camera.position)
                .to(
                    {
                        x: camTo.x,
                        y: camTo.y,
                        z: camTo.z,
                    },
                    500
                )
                .easing(TWEEN.Easing.Cubic.Out)
                .start()
            Object.keys(annotations).forEach((annotation) => {
                if (annotations[annotation].descriptionDomElement) {
                    ;(
                        annotations[annotation]
                            .descriptionDomElement as HTMLDivElement
                    ).style.display = 'none'
                }
            })
            if (
                annotations[intersects[0].object.userData.id]
                    .descriptionDomElement
            ) {
                ;(
                    annotations[intersects[0].object.userData.id]
                        .descriptionDomElement as HTMLDivElement
                ).style.display = 'block'
            }
        }
    }
}
const gui = new GUI()
const lensFolder = gui.addFolder('Lenses')
lensFolder.add(lensMaterial, 'opacity', 0, 1.0, 0.01).name('Opacity')
lensFolder.add(lensMaterial, 'metalness', 0, 1.0, 0.01).name('Metalness')
lensFolder.add(lensMaterial, 'roughness', 0, 1.0, 0.01).name('Roughness')
lensFolder.add(lensMaterial, 'transmission', 0, 1.0, 0.01).name('Transmission')
lensFolder.add(lensMaterial, 'clearcoat', 0, 1.0, 0.01).name('Clearcoat')
lensFolder
    .add(lensMaterial, 'clearcoatRoughness', 0, 1.0, 0.01)
    .name('ClearcoatRoughness')
lensFolder.open()

const frameRefractionFolder = gui.addFolder('FrameRefraction')
frameRefractionFolder
    .add(frameRefraction, 'opacity', 0, 1.0, 0.01)
    .name('Opacity')
frameRefractionFolder
    .add(frameRefraction, 'metalness', 0, 1.0, 0.01)
    .name('Metalness')
frameRefractionFolder
    .add(frameRefraction, 'roughness', 0, 1.0, 0.01)
    .name('Roughness')
frameRefractionFolder
    .add(frameRefraction, 'transmission', 0, 1.0, 0.01)
    .name('Transmission')
frameRefractionFolder.open()

const frameMaterialFolder = gui.addFolder('FrameMaterial')
frameMaterialFolder.add(frameMaterial, 'opacity', 0, 1.0, 0.01).name('Opacity')
frameMaterialFolder
    .add(frameMaterial, 'metalness', 0, 1.0, 0.01)
    .name('Metalness')
frameMaterialFolder
    .add(frameMaterial, 'roughness', 0, 1.0, 0.01)
    .name('Roughness')
frameMaterialFolder.open()

const stats = new Stats()
document.body.appendChild(stats.dom)

const clock = new THREE.Clock()

function animate() {
    requestAnimationFrame(animate)

    controls.update()

    TWEEN.update()

    let delta = clock.getDelta()
    if (delta > 0.1) delta = 0.1
    world.step(delta)

    if (modelReady) {
        glasses.position.set(
            glassesBody.position.x,
            glassesBody.position.y,
            glassesBody.position.z
        )
        glasses.quaternion.set(
            glassesBody.quaternion.x,
            glassesBody.quaternion.y,
            glassesBody.quaternion.z,
            glassesBody.quaternion.w
        )
    }

    render()

    stats.update()
}

function render() {
    if (modelReady) {
        cubeCamera.position.copy(camera.position)
        camera.layers.disable(1)
        cubeCamera.update(renderer, scene)
        camera.layers.enable(1)
    }
    renderer.render(scene, camera)
    labelRenderer.render(scene, camera)
}

animate()