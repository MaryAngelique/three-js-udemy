import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'

const scene = new THREE.Scene()
scene.add(new THREE.AxesHelper(5))

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
camera.position.y = 1.5
camera.position.z = 2.5

const renderer = new THREE.WebGLRenderer()
renderer.shadowMap.enabled = true
// renderer.outputEncoding = THREE.sRGBEncoding
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.y = 1

const animationClips: { [key: string]: THREE.AnimationClip } = {}

let xbotMixer: THREE.AnimationMixer
let ybotMixer: THREE.AnimationMixer
let xbotLastAction: THREE.AnimationClip
let ybotLastAction: THREE.AnimationClip

const totalBots = 2
let botsLoaded = 0
let botsReady = false

const gltfLoader = new GLTFLoader()
gltfLoader.load(
    'models/xbot.glb',
    (gltf) => {
        xbotMixer = new THREE.AnimationMixer(gltf.scene)

        animationClips['xbotDefault'] = gltf.animations[0]
        xbotLastAction = animationClips['xbotDefault']
        xbotFolder.add(xbotButtons, 'default')

        gltf.scene.traverse(function (child) {
            if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh
                m.castShadow = true
            }
        })
        gltf.scene.position.x = -1

        const helper = new THREE.SkeletonHelper(gltf.scene)
        scene.add(helper)

        scene.add(gltf.scene)

        botsLoaded++

        loadAnimations()
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)

gltfLoader.load(
    'models/ybot.glb',
    function (gltf) {
        ybotMixer = new THREE.AnimationMixer(gltf.scene)

        animationClips['ybotDefault'] = gltf.animations[0]
        ybotLastAction = animationClips['ybotDefault']
        ybotFolder.add(ybotButtons, 'default')

        gltf.scene.traverse(function (child) {
            console.log(child.name + ' ' + child.type)
            if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh
                m.castShadow = true
            }
        })
        gltf.scene.position.x = 1

        const helper = new THREE.SkeletonHelper(gltf.scene)
        scene.add(helper)

        scene.add(gltf.scene)

        botsLoaded++

        loadAnimations()
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)

function loadAnimations() {
    if (botsLoaded === totalBots) {
        //add an animation from another file
        gltfLoader.load(
            'models/actionClip@samba.glb',
            (gltf) => {
                console.log('loaded samba')
                animationClips['samba'] = gltf.animations[0]

                xbotFolder.add(xbotButtons, 'samba')
                ybotFolder.add(ybotButtons, 'samba')

                //add an animation from another file
                gltfLoader.load(
                    'models/actionClip@bellydance.glb',
                    (gltf) => {
                        console.log('loaded bellyDance')

                        animationClips['bellyDance'] = gltf.animations[0]

                        xbotFolder.add(xbotButtons, 'bellyDance')
                        ybotFolder.add(ybotButtons, 'bellyDance')

                        //add an animation from another file
                        gltfLoader.load(
                            'models/actionClip@goofyrunning.glb',
                            (gltf) => {
                                console.log('loaded goofyRunning')
                                ;(gltf as any).animations[0].tracks.shift() //delete the specific track that moves the object forward while running
                                animationClips['goofyRunning'] =
                                    gltf.animations[0]

                                xbotFolder.add(xbotButtons, 'goofyRunning')
                                ybotFolder.add(ybotButtons, 'goofyRunning')

                                //clone goofyrunning and create an animation clip using just one of the arms

                                animationClips['clonedRightArm'] =
                                    animationClips['goofyRunning'].clone()
                                let i =
                                    animationClips['clonedRightArm'].tracks
                                        .length
                                while (i--) {
                                    let trackName =
                                        animationClips['clonedRightArm'].tracks[
                                            i
                                        ].name
                                    if (
                                        !(
                                            trackName.startsWith(
                                                'mixamorigRightShoulder'
                                            ) ||
                                            trackName.startsWith(
                                                'mixamorigRightArm'
                                            ) ||
                                            trackName.startsWith(
                                                'mixamorigRightForeArm'
                                            ) ||
                                            trackName.startsWith(
                                                'mixamorigRightHand'
                                            )
                                        )
                                    ) {
                                        animationClips[
                                            'clonedRightArm'
                                        ].tracks.splice(i, 1)
                                    }
                                }
                                xbotFolder.add(xbotButtons, 'clonedRightArm')
                                ybotFolder.add(ybotButtons, 'clonedRightArm')

                                console.log(animationClips['clonedRightArm'])

                                botsReady = true
                            },
                            (xhr) => {
                                console.log(
                                    (xhr.loaded / xhr.total) * 100 + '% loaded'
                                )
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
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
            },
            (error) => {
                console.log(error)
            }
        )
    }
}

const phongMaterial = new THREE.MeshPhongMaterial()

const planeGeometry = new THREE.PlaneGeometry(25, 25)
const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial)
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

const xbotButtons = {
    default: function () {
        xbotMixer.clipAction(xbotLastAction).fadeOut(0.5)
        xbotMixer
            .clipAction(animationClips['xbotDefault'])
            .reset()
            .fadeIn(0.5)
            .play()
        xbotLastAction = animationClips['xbotDefault']
    },
    samba: function () {
        xbotMixer.clipAction(xbotLastAction).fadeOut(0.5)
        xbotMixer.clipAction(animationClips['samba']).reset().fadeIn(0.5).play()
        xbotLastAction = animationClips['samba']
    },
    bellyDance: function () {
        xbotMixer.clipAction(xbotLastAction).fadeOut(0.5)
        xbotMixer
            .clipAction(animationClips['bellyDance'])
            .reset()
            .fadeIn(0.5)
            .play()
        xbotLastAction = animationClips['bellyDance']
    },
    goofyRunning: function () {
        xbotMixer.clipAction(xbotLastAction).fadeOut(0.5)
        xbotMixer
            .clipAction(animationClips['goofyRunning'])
            .reset()
            .fadeIn(0.5)
            .play()
        xbotLastAction = animationClips['goofyRunning']
    },
    clonedRightArm: function () {
        xbotMixer.clipAction(xbotLastAction).fadeOut(0.5)
        xbotMixer
            .clipAction(animationClips['clonedRightArm'])
            .reset()
            .fadeIn(0.5)
            .play()
        xbotLastAction = animationClips['clonedRightArm']
    },
}

const ybotButtons = {
    default: function () {
        ybotMixer.clipAction(ybotLastAction).fadeOut(0.5)
        ybotMixer
            .clipAction(animationClips['ybotDefault'])
            .reset()
            .fadeIn(0.5)
            .play()
        ybotLastAction = animationClips['ybotDefault']
    },
    samba: function () {
        ybotMixer.clipAction(ybotLastAction).fadeOut(0.5)
        ybotMixer.clipAction(animationClips['samba']).reset().fadeIn(0.5).play()
        ybotLastAction = animationClips['samba']
    },
    bellyDance: function () {
        ybotMixer.clipAction(ybotLastAction).fadeOut(0.5)
        ybotMixer
            .clipAction(animationClips['bellyDance'])
            .reset()
            .fadeIn(0.5)
            .play()
        ybotLastAction = animationClips['bellyDance']
    },
    goofyRunning: function () {
        ybotMixer.clipAction(ybotLastAction).fadeOut(0.5)
        ybotMixer
            .clipAction(animationClips['goofyRunning'])
            .reset()
            .fadeIn(0.5)
            .play()
        ybotLastAction = animationClips['goofyRunning']
    },
    clonedRightArm: function () {
        ybotMixer.clipAction(ybotLastAction).fadeOut(0.5)
        ybotMixer
            .clipAction(animationClips['clonedRightArm'])
            .reset()
            .fadeIn(0.5)
            .play()
        ybotLastAction = animationClips['clonedRightArm']
    },
}

const gui = new GUI()
const xbotFolder = gui.addFolder('xbot')
xbotFolder.open()
const ybotFolder = gui.addFolder('ybot')
ybotFolder.open()

const stats = new Stats()
document.body.appendChild(stats.dom)

const clock = new THREE.Clock()
let delta = 0

function animate() {
    requestAnimationFrame(animate)

    controls.update()

    delta = clock.getDelta()
    if (botsReady) {
        xbotMixer.update(delta)
        ybotMixer.update(delta)
    }

    render()

    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()