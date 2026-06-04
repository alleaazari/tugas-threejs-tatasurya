// ngambil library dari CDN yang disuruh di PDF tugas dipake buat load three js sama orbit controls nya referensi dari: https://esm.sh/three@0.160.0
import * as THREE from 'https://esm.sh/three@0.160.0'
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js'

// bikin wadah 3D nya (scene, kamera, render)
// kodenya liat dokumentasi di https://threejs.org/docs sama course https://threejs-journey.com
const scene=new THREE.Scene();
scene.background = new THREE.Color(0x050508)
scene.fog=new THREE.Fog(0x050508, 5, 40)

let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000)
camera.position.set(0, 3, 5) // mundurin posisi kameranya dikit biar ga dekat kali

let renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias:true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)

// nyalain shadow biar dapet nilai poin 4
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// wajib di true biar tombol VR nya jalan pas di klik seperti di refrensi https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
renderer.xr.enabled = true 

// atur lighting biar keliatan bentuknya
// referensi baca dari: https://threejs.org/docs (bagian Lights)
let ambientLight=new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)

// pake directional light sesuai rubrik dosen biar bisa bikin bayangan di lantai
const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
directionalLight.position.set(5, 10, 5)
directionalLight.castShadow = true 
scene.add(directionalLight)

// alas yg di bawah objek objeknya
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50,50),
    new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.9 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.5
floor.receiveShadow = true // biar bayangannya nempel disini
scene.add(floor)

// teksture untuk gambar
// url gambar ambil dari contoh resmi biar ga d blokir CORS browser
// referensi ngambil dari: https://threejs.org/examples 
const textureLoader = new THREE.TextureLoader()
let lavaTex = textureLoader.load('https://threejs.org/examples/textures/lava/lavatile.jpg')
let earthTex = textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg')
let moonTex = textureLoader.load('https://threejs.org/examples/textures/planets/moon_1024.jpg')

// membuat 5 bentuk yg terdapat dri refrensi: https://threejs.org/docs sama https://threejs-journey.com
// note: speed (kecepatan) dipelanin banget biar gampang pas di klik
const explorationData = [
    { name: 'Matahari', geometry: new THREE.SphereGeometry(0.8, 32, 32), distance: 0, speed: 0, tex: lavaTex, color: 0xffffee, emissive: 0xffaa00, rough: 0.5, metal: 0.1, info: 'Pusat tata surya.' },
    { name: 'Bumi', geometry: new THREE.SphereGeometry(0.35, 32, 32), distance: 2.5, speed: 0.002, tex: earthTex, color: 0x4455ff, emissive: 0x000000, rough: 0.6, metal: 0.2, info: 'Planet tempat manusia tinggal.' },
    { name: 'Sabuk Asteroid', geometry: new THREE.TorusGeometry(0.5, 0.08, 16, 60), distance: 3.5, speed: 0.001, tex: null, color: 0xe3bb76, emissive: 0x000000, rough: 0.9, metal: 0.1, info: 'Cincin batuan luar angkasa bentuk donat.' },
    { name: 'Satelit Pengintai', geometry: new THREE.BoxGeometry(0.25, 0.25, 0.25), distance: 1.5, speed: 0.003, tex: null, color: 0x888888, emissive: 0x000000, rough: 0.2, metal: 0.8, info: 'Satelit buatan manusia bentuk kotak.' },
    { name: 'Roket Apollo', geometry: new THREE.CylinderGeometry(0.1, 0.1, 0.4, 32), distance: 4.5, speed: 0.0015, tex: null, color: 0xdddddd, emissive: 0x000000, rough: 0.3, metal: 0.5, info: 'Roket silinder sedang menjelajah.' },
    { name: 'Komet Halley', geometry: new THREE.ConeGeometry(0.15, 0.5, 32), distance: 5.5, speed: 0.004, tex: moonTex, color: 0xff5533, emissive: 0x000000, rough: 0.9, metal: 0.1, info: 'Komet merah berekor bentuk kerucut.' }
]

let objects = [];

explorationData.forEach(data => {
    let material=new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: data.rough, 
        metalness: data.metal  
    })

    if(data.tex) material.map = data.tex 

    // khusus matahari kasih efek nyala terang
    if(data.name === 'Matahari') {
        material.emissiveMap = data.tex
        material.emissive.setHex(data.emissive)
    }

    let mesh = new THREE.Mesh(data.geometry, material)
    
    // matahari ga usah bikin bayangan karena dia yg nerangin
    if(data.name !== 'Matahari') {
        mesh.castShadow = true 
        mesh.receiveShadow = true
    }
    
    // nyimpen data ke objek buat nanti di panggil pake raycaster
    mesh.userData = {
        name: data.name, detail: data.info, distance: data.distance, speed: data.speed, angle: Math.random() * Math.PI * 2
    }

    scene.add(mesh)
    objects.push(mesh)
})

// untuk mengkontrol kamera pake mouse kodenya dari refrensi https://threejs.org/examples 
let controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2 // dibatasin biar kamera ga nembus bawah tanah
controls.target.set(0, 1.5, -5)

// bagian ini deteksi klik sama hover pakai Raycaster
// referensi ngikutin tutorial dari https://threejs.org/docs sama course https://threejs-journey.com
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let selectedObject = null
let hoveredObject = null

// nyari koordinat kursor mouse kita di layar
window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

// logika kalau di klik mouse
window.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera)
    let intersects = raycaster.intersectObjects(objects)
    
    let clickedObj = intersects.length > 0 ? intersects[0].object : null

    // klo ngeklik luar area/kosong, balikin ukurannya ke normal 
    if(selectedObject) {
        if(selectedObject.userData.name !== 'Matahari') {
            selectedObject.material.emissive.setHex(0x000000)
        }
        
        // kalau ngeklik objek yang udah terpilih, batalin pilihannya (deselect)
        if(selectedObject === clickedObj) {
            selectedObject = null
            document.getElementById('info').innerHTML = `<h2>Eksplorasi Tata Surya</h2><p style="color: #aaa; margin-top: 4px;">Arahkan mouse untuk HOVER | Klik objek untuk DETAIL</p>`
            return 
        }

        selectedObject = null
        document.getElementById('info').innerHTML = `<h2>Eksplorasi Tata Surya</h2><p style="color: #aaa; margin-top: 4px;">Arahkan mouse untuk HOVER | Klik objek untuk DETAIL</p>`
    }

    // kalau pas kena target objeknya yang baru
    if(clickedObj) {
        selectedObject = clickedObj
        
        // kasih efek nyala dikit buat nandain
        if(selectedObject.userData.name !== 'Matahari') selectedObject.material.emissive.setHex(0x333333)

        // nampilin teks info ke div html
        document.getElementById('info').innerHTML = `<h2 style="color: #F5A623;">🚀 ${selectedObject.userData.name}</h2><p style="margin-top: 4px; font-weight: bold; color: #7EB89A;">Status: Terpilih</p><p style="margin-top: 6px; color: #ddd; font-size: 13px;">${selectedObject.userData.detail}</p>`
    }
})

// animasi pergerakan planet loop tiap frame pake setAnimationLoop seperti yg dibilang di docs https://threejs.org/docs
renderer.setAnimationLoop(() => {
    
    // cek hover mouse buat ngasih efek cursor tangan
    raycaster.setFromCamera(mouse, camera)
    let hoverIntersects = raycaster.intersectObjects(objects)

    if(hoveredObject && hoveredObject !== selectedObject && hoveredObject.userData.name !== 'Matahari') {
        hoveredObject.material.emissive.setHex(0x000000)
        hoveredObject = null
    }
    
    document.body.style.cursor = 'default' // kursor awal panah biasa

    if(hoverIntersects.length > 0) {
        document.body.style.cursor = 'pointer' // ubah jadi jari teliunjuk pas nyentuh objek
        
        let currentHover = hoverIntersects[0].object
        if(currentHover !== selectedObject && currentHover.userData.name !== 'Matahari') {
            hoveredObject = currentHover
            hoveredObject.material.emissive.setHex(0x222222) 
        }
    }

    // utnuk ngecek lg di mode VR apa ngga
    let isVR = renderer.xr.isPresenting 
    let scaleMultiplier = isVR ? 1.0 : 1.8 // ngakalin ukuran: pas di luar vr dibikin 1.8x lebih gede biar gampang diklik pas masuk vr dibalikin normal (1.0x) biar ga kebesaran di depan muka

    // muterin posisi ngelilingin matahari pake rumus sin cos
    objects.forEach(obj => {
        obj.rotation.y += 0.002 // rotasi agak di perlambat 
        obj.rotation.x += 0.001 

        // ngatur scale ukurannya ngikutin kita lg di vr apa di laptop biasa
        if(obj === selectedObject) {
            obj.scale.setScalar(scaleMultiplier * 1.3) // kalo lg diklik jadi lebih besar dikit
        } else {
            obj.scale.setScalar(scaleMultiplier)
        }

        if(obj.userData.distance > 0) {
            obj.userData.angle += obj.userData.speed
            obj.position.x = Math.cos(obj.userData.angle) * obj.userData.distance
            obj.position.y = 1.5 
            obj.position.z = -5 + Math.sin(obj.userData.angle) * obj.userData.distance
        } else {
            obj.position.set(0, 1.5, -5) 
        }
    })

    controls.update() 
    renderer.render(scene, camera)
})

// biar tampilan canvasnya ga gepeng/nyempit pas layar di resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

// ini untuk tombol "masuk vr" baca cara pakai API nya di: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
let vrBtn = document.getElementById('vrBtn')

async function checkVR() {
    if(!('xr' in navigator)) { vrBtn.innerText = 'WebXR ga didukung browser'; vrBtn.disabled = true; return }
    let isSupported = await navigator.xr.isSessionSupported('immersive-vr')
    if(!isSupported) { vrBtn.innerText = 'Device VR ga ketemu'; vrBtn.disabled = true; return }
    vrBtn.disabled = false
    vrBtn.innerText = 'Masuk VR'
}

vrBtn.addEventListener('click', async () => {
    try {
        let session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] })
        await renderer.xr.setSession(session)
        vrBtn.innerText = 'Lagi VR-an'
        session.addEventListener('end', () => { vrBtn.innerText = 'Masuk VR' })
    } catch(err) { console.error(err) }
})

checkVR()

// referensi :
// https://threejs.org/docs

// https://threejs.org/examples

// https://esm.sh/three@0.160.0

// https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API

// https://docs.github.com/en/pages — cara deploy ke GitHubPages

// https://threejs-journey.com — course interaktif Three.js(Bruno Simon)