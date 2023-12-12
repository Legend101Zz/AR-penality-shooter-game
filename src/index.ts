import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./index.css";

const footImg = new URL("../assets/football.png", import.meta.url).href;
const model = new URL("../assets/football_net.glb", import.meta.url).href;
const fieldModel = new URL("../assets/mini_stadium.glb", import.meta.url).href;
let field: any;

let gloveModel: any;

// Setup ThreeJS in the usual way
const renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: true });
document.body.appendChild(renderer.domElement);
let hasPlaced = false;

renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(render);

// Setup a Zappar camera instead of one of ThreeJS's cameras
const camera = new ZapparThree.Camera();

const manager = new ZapparThree.LoadingManager();

// The Zappar library needs your WebGL context, so pass it
ZapparThree.glContextSet(renderer.getContext());

// Create a ThreeJS Scene and set its background to be the camera background texture
const scene = new THREE.Scene();
scene.background = camera.backgroundTexture;

// Request the necessary permission from the user
ZapparThree.permissionRequestUI().then((granted) => {
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

// Set up our instant tracker group
const tracker = new ZapparThree.InstantWorldTracker();
const trackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, tracker);
scene.add(trackerGroup);

// Add some content (ball with football texture placed at a specific distance along the z-axis)
const ballTexture = new THREE.TextureLoader().load(footImg);
const ball = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ map: ballTexture })
);

ball.position.set(0, 0, -2); // Adjust the position along the z-axis
trackerGroup.add(ball);

const gltfLoader = new GLTFLoader(manager);

//goalField

gltfLoader.load(
  fieldModel,
  (gltf) => {
    field = gltf.scene;
    gltf.scene.scale.set(2, 2, 2);
    gltf.scene.position.set(-45, -5, 15);
    gltf.scene.rotation.set(-Math.PI / 9, 0, 0);

    // Add the scene to the tracker group
    gltf.scene.traverse(function (child) {
      if ((child as THREE.Mesh).isMesh) {
        let m = child as THREE.Mesh;
        child.castShadow = true;
        child.receiveShadow = true;
        m.castShadow = true;
        m.frustumCulled = false;
      }
    });

    trackerGroup.add(field);
  },
  undefined,
  (error) => console.error(error)
);

const ambientLight2 = new THREE.AmbientLight(0x404040); // Soft white ambient light
ambientLight2.position.set(0, 5, 0);
scene.add(ambientLight2);

// Add directional light for better visibility
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 5, 0); // Adjust the position of the light
scene.add(directionalLight);

//goalPost
// gltfLoader.load(
//   model,
//   (gltf) => {
//     gloveModel = gltf.scene;
//     gltf.scene.scale.set(3, 3, 3);
//     gltf.scene.position.set(0, -0.7, -25);
//     gltf.scene.rotation.set(0, -Math.PI / 2, 0);

//     // Add the scene to the tracker group
//     gltf.scene.traverse(function (child) {
//       if ((child as THREE.Mesh).isMesh) {
//         let m = child as THREE.Mesh;
//         child.castShadow = true;
//         child.receiveShadow = true;
//         m.castShadow = true;
//         m.frustumCulled = false;
//       }
//     });

//     // Set up device orientation event listener
//     // function handleOrientation(event: DeviceOrientationEvent) {
//     //   if (gloveModel) {
//     //     const gamma = event.gamma || 0;

//     //     // Adjust the movement speed based on the gamma value
//     //     const movementSpeed = 0.05;
//     //     const moveX = gamma * movementSpeed;

//     //     gloveModel.position.x = moveX;
//     //   }
//     // }

//     // window.addEventListener("deviceorientation", handleOrientation);
//     trackerGroup.add(gloveModel);
//   },
//   undefined,
//   (error) => console.error(error)
// );

// ball animation code
function animateBall() {
  const initialPosition = new THREE.Vector3(0, 0, -20);
  const targetPosition = new THREE.Vector3(
    getRandomValue(-5, 5),
    getRandomValue(-2, 2),
    -2
  ); // Adjust the target position

  const animationDuration = 1000; // in milliseconds
  const startTime = Date.now();

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / animationDuration, 1);

    ball.position.lerpVectors(initialPosition, targetPosition, progress);

    if (progress < 1) {
      requestAnimationFrame(updateAnimation);
    }
  }

  updateAnimation();
}

function getRandomValue(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const placementUI =
  document.getElementById("zappar-placement-ui") ||
  document.createElement("div");
placementUI.addEventListener("click", () => {
  placementUI.remove();
  hasPlaced = true;

  animateBall();
});

// Set up our render loop
function render() {
  camera.updateFrame(renderer);
  if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, 0, -5);

  renderer.render(scene, camera);
}
