let camera;
let directionalLight, ambientLight, spotLight;
let scene, renderer, controls;
let fish_body, sphere, mixer, mesh, skeleton, starFish;
const clock = new THREE.Clock();
const fish = {speed: 1500};
let is_swimming = false;
let is_recording = false;
let clip;
let capturer;
const loader = new THREE.GLTFLoader();

let canvas = document.getElementById("canvas1");

// swimming path
const curve = new THREE.CatmullRomCurve3( [
    new THREE.Vector3(0 , 0, 0),
    new THREE.Vector3(0 , 0, 5),
    new THREE.Vector3( -10, 0, -5 ),
    new THREE.Vector3( -10, 0, -5 ),
    new THREE.Vector3( -5, 0, 5 ),
    new THREE.Vector3( 0, 0, 0 ),
    new THREE.Vector3( 5, 0, 5 ),
    new THREE.Vector3( 10, 0, -5 ),
    new THREE.Vector3( 15, 0, 5 ),
    new THREE.Vector3( 5, 0, 0 ),
], true );

var points = curve.getPoints(50);
var geometryLine = new THREE.BufferGeometry().setFromPoints( points );
var materialLine = new THREE.LineBasicMaterial( { color : 0xc8284, transparent: true, opacity: 1});
var PosIndex = 0;

// gui functions
var obj = {
    StartSwim:function(){
        mixer = new THREE.AnimationMixer(fish_body);

        var clipAction = mixer.clipAction(clip);
        clipAction.play();
        is_swimming = true},

    StopSwim:function(){is_swimming = false},

    Restart: function(){
        fish_body.position.set(0,0,-5);
        is_swimming = false;
        is_recording = false;
    },

    StartRecord: function(){
        capturer.start();
        is_recording = true;
    },

    StopRecord: function() {
        downloadGif();
    },

    ExportScene: function(){
        downloadScene();
    },

};


//CCapture
capturer = new CCapture(
    {   format: 'gif',
        workersPath: 'js/worker/',
        framerate: 60,
        verbose: false,
        display:false,
        name: "MyFish"}
);


// init scene and render

init();
render();


function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000 );

    camera.position.set(10,10, 5);
    const width  = window.innerWidth;
    const height = window.innerHeight;
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas} );
    renderer.setSize( width, height );
    document.body.appendChild( renderer.domElement );

    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    renderer.physicallyCorrectLights = true;
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    addObjects();
    addLight();

    camera.lookAt(scene.position);

}

function render() {
    requestAnimationFrame(render);
    update();
}

//download scene as gltf
function downloadScene(){
    const gltfExporter = new THREE.GLTFExporter();
    gltfExporter.parse(
        [scene],
        function(result){
            saveArrayBuffer(result, "scene.glb")
        },
        {binary: true,
                 animation: clip,
                trs: true}
    )
}

function saveArrayBuffer(buffer, fileName){
    save(new Blob([buffer]), fileName)
}

function save(blob, fileName){
    const link = document.createElement('a');
    document.body.appendChild(link);
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}

// download gif
function downloadGif(){
    capturer.stop();
    capturer.save();
    is_recording = false;
}

// add fish, objects and lights
function addFish(){
    fish_body = new THREE.Object3D;
    loader.load("model/Fish1.0.glb",function(gltf) {
        mesh = gltf.scene;
        fish_body.add(mesh);
        fish_body.position.set(0, 0, 0);
        fish_body.scale.set(0.25, 0.25, 0.25);
        fish_body.traverse(child => {
            if (child.isMesh){
                child.castShadow = true;
            }
        });
       scene.add(fish_body);
        skeleton = new THREE.SkeletonHelper(mesh);
        skeleton.visible = false;
        scene.add(skeleton);


        const zAxis = new THREE.Vector3(0, 0, 1);

        const qInitial = new THREE.Quaternion().setFromAxisAngle(zAxis, -Math.PI / 20);
        const qFinal = new THREE.Quaternion().setFromAxisAngle(zAxis, Math.PI / 20);
        const quaternionKF = new THREE.QuaternionKeyframeTrack(skeleton.bones[3].name + '.quaternion', [0, 1, 2], [qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w, qInitial.x, qInitial.y, qInitial.z, qInitial.w]
        );
        clip = new THREE.AnimationClip("Swim",2, [quaternionKF]);

    });

}
function addObjects() {
    addFish();

    //sphere -- water
    var geometrySphere = new THREE.SphereGeometry(60, 60, 60);

    var cubeTexture = new THREE.ImageUtils.loadTexture(
        'texture/water.jpg');
    var materialSphere = new THREE.MeshBasicMaterial({
        map: cubeTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    sphere = new THREE.Mesh(geometrySphere, materialSphere);
    sphere.receiveShadow = true;
    sphere.castShadow = false;
    sphere.position.set(0, 0, 0);

    console.log("sphere", sphere);
    scene.add(sphere);

    const groundGeometry = new THREE.CircleGeometry(50,50);

    var normMap = new THREE.ImageUtils.loadTexture(
        'texture/Stylized_Sand_001_normal.jpg');

    var colorMap = new THREE.ImageUtils.loadTexture(
        'texture/Stylized_Sand_001_basecolor.jpg');

    var aoMap = new THREE.ImageUtils.loadTexture(
        'texture/Stylized_Sand_001_ambientOcclusion.jpg');

    var bmpMap = new THREE.ImageUtils.loadTexture(
        'texture/Stylized_Sand_001_height.png');
    const groundMaterial = new THREE.MeshStandardMaterial( {
        map: colorMap,
        normalMap: normMap,
        aoMap: aoMap,
        bumpMap: bmpMap,
        side: THREE.DoubleSide,
        normalScale: THREE.Vector2(1,0),
        roughness: 0.9
    } );
    ground = new THREE.Mesh( groundGeometry, groundMaterial );
    ground.receiveShadow = true;
    ground.castShadow = false;
    ground.rotation.x = Math.PI /2;
    ground.position.set(0,-15,0);
    scene.add(ground);

    loader.load("model/coralandplant.glb",function(gltf) {
        var coral = gltf.scene;
        coral.position.set(-15, -15, -5);
        coral.scale.set(0.5,0.5,0.5);
        coral.traverse(child => {
            if (child.isMesh) {
                child.receiveShadow = true;
            }
        });
        scene.add(coral);
    });

    loader.load("model/starfish.glb",function(gltf) {
        starFish = gltf.scene;
        starFish.position.set(0, -15, 0);
        starFish.traverse(child => {
            if (child.isMesh) {
                child.receiveShadow = true;
            }
        });
        scene.add(starFish);
    });

    var gui = new dat.GUI();
    gui.domElement.id = "gui";

    gui.add(obj,"StartSwim");
    gui.add(obj,"StopSwim");
    gui.add(obj,"Restart");
    gui.add(obj,"StartRecord");
    gui.add(obj,"StopRecord");
    gui.add(obj,"ExportScene");
    var cam = gui.addFolder('Camera');
    cam.add(camera.position, 'y', -10, 50).listen();
    cam.add(camera.position, 'x',-10, 50).listen();
    cam.add(camera.position, 'z', -10, 50).listen();

    var fish_setup = gui.addFolder('Fish position');
    fish_setup.add(fish_body.position,"x",0,50).listen();
    fish_setup.add(fish_body.position,"y",0,50).listen();
    fish_setup.add(fish_body.position,"y",0,50).listen();
    fish_setup.add(fish, "speed",0,2000);
}


function addLight(){
    ambientLight = new THREE.AmbientLight( 0xffffff );
    scene.add( ambientLight );

    spotLight = new THREE.SpotLight( 0xffffff,2);
    spotLight.position.set(0, 30 ,0);
    scene.add( spotLight );

    directionalLight = new THREE.DirectionalLight( 0xffffff,1);
    directionalLight.position.set( 5, 40, 0);

    directionalLight.castShadow = true;
    directionalLight.target = fish_body;
    scene.add( directionalLight );

}

function update() {
    var delta = clock.getDelta();
    if (mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);

    if (is_recording === true) {
        console.log("som tu");
        capturer.capture(canvas);
    }

    if (is_swimming) {
        PosIndex = PosIndex + 0.1;
        if (PosIndex > fish.speed) {
            PosIndex = 0;
        }
        var camPos = curve.getPoint(PosIndex / fish.speed);
        var camRot = curve.getTangent(PosIndex / fish.speed);
        fish_body.position.x = camPos.x;
        fish_body.position.y = camPos.y;
        fish_body.position.z = camPos.z;
        fish_body.rotation.x = camRot.x;
        fish_body.rotation.y = camRot.y;
        fish_body.rotation.z = camRot.z;
        fish_body.lookAt(curve.getPoint((PosIndex + 1) / fish.speed));
    }

    controls.update();

}