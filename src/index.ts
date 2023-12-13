import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./index.css";

const footImg = new URL("../assets/football.png", import.meta.url).href;
const model = new URL("../assets/football_net.glb", import.meta.url).href;
const fieldModel = new URL("../assets/football_field.glb", import.meta.url)
  .href;
const player = new URL("../assets/player.png", import.meta.url).href;

let field: any;
let goalPostModel: any;

// Setup ThreeJS in the usual way
const renderer = new THREE.WebGLRenderer();
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
  new THREE.SphereBufferGeometry(0.7, 32, 32),
  new THREE.MeshBasicMaterial({ map: ballTexture })
);

ball.position.set(0, 3, -23); // Adjust the position along the z-axis
ball.visible = false; //

// Load the texture for the goalkeeper
const goalkeeperTexture = new THREE.TextureLoader().load(player);

// Create the goalkeeper mesh
const goalkeeperGeometry = new THREE.PlaneBufferGeometry(4, 4);
const goalkeeperMaterial = new THREE.MeshBasicMaterial({
  map: goalkeeperTexture,
  transparent: true,
});
const goalkeeper = new THREE.Mesh(goalkeeperGeometry, goalkeeperMaterial);
goalkeeper.position.set(0, 2, -25); // Adjust the initial position of the goalkeeper
goalkeeper.visible = false; // Set it invisible initially

const gltfLoader = new GLTFLoader(manager);

//goalField

gltfLoader.load(
  fieldModel,
  (gltf) => {
    field = gltf.scene;
    gltf.scene.scale.set(1, 1, 1);
    gltf.scene.position.set(0, -2, -5);
    camera.lookAt(gltf.scene.position);
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

//goalPost
gltfLoader.load(
  model,
  (gltf) => {
    goalPostModel = gltf.scene;
    gltf.scene.scale.set(3, 3, 3);
    gltf.scene.position.set(0, 3.5, -25);
    gltf.scene.rotation.set(0, -Math.PI / 2, 0);

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

    // Set up device orientation event listener
    // function handleOrientation(event: DeviceOrientationEvent) {
    //   if (goalPostModel) {
    //     const gamma = event.gamma || 0;

    //     // Adjust the movement speed based on the gamma value
    //     const movementSpeed = 0.05;
    //     const moveX = gamma * movementSpeed;

    //     goalPostModel.position.x = moveX;
    //   }
    // }

    // window.addEventListener("deviceorientation", handleOrientation);
    // Add the goalkeeper to the tracker group
    goalkeeper.visible = true;
    ball.visible = true;
    trackerGroup.add(goalPostModel, goalkeeper, ball);
  },
  undefined,
  (error) => console.error(error)
);

// Add ambient light for overall illumination
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
//     goalPostModel = gltf.scene;
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
//     //   if (goalPostModel) {
//     //     const gamma = event.gamma || 0;

//     //     // Adjust the movement speed based on the gamma value
//     //     const movementSpeed = 0.05;
//     //     const moveX = gamma * movementSpeed;

//     //     goalPostModel.position.x = moveX;
//     //   }
//     // }

//     // window.addEventListener("deviceorientation", handleOrientation);
//     trackerGroup.add(goalPostModel);
//   },
//   undefined,
//   (error) => console.error(error)
// );

// ball and keeper animation code
function animateBallAndGoalkeeper() {
  function updateAnimation() {
    const targetGoalkeeperPosition = new THREE.Vector3(
      getRandomValue(-6, 6),
      2,
      -25
    ); // Adjust the target position for the goalkeeper

    const animationDuration = 1000; // in milliseconds
    const startTime = Date.now();

    function animate() {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / animationDuration, 1);

      goalkeeper.position.lerpVectors(
        goalkeeper.position,
        targetGoalkeeperPosition,
        progress
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        updateAnimation(); // Start a new animation cycle
      }
    }

    animate();
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

  animateBallAndGoalkeeper();
});

//============BALL SWIPER LOGIC =========

let swipeStartPos: THREE.Vector2 | null = null;
let swipeEndPos: THREE.Vector2 | null = null;

// Set up touch event listeners
document.addEventListener("touchstart", handleTouchStart, false);
document.addEventListener("touchend", handleTouchEnd, false);

function handleTouchStart(event: TouchEvent) {
  // Store the starting position of the swipe
  swipeStartPos = new THREE.Vector2(
    event.touches[0].clientX,
    event.touches[0].clientY
  );
}

function handleTouchEnd(event: TouchEvent) {
  if (swipeStartPos) {
    // Store the ending position of the swipe
    swipeEndPos = new THREE.Vector2(
      event.changedTouches[0].clientX,
      event.changedTouches[0].clientY
    );

    // Calculate the direction and speed based on the difference between start and end positions
    const direction = new THREE.Vector2()
      .subVectors(swipeEndPos, swipeStartPos)
      .normalize();
    const speed = Math.min(swipeStartPos.distanceTo(swipeEndPos) * 0.01, 1.0);

    // Shoot the ball in the calculated direction and speed
    shootBall(direction, speed);

    // Reset swipe positions for the next swipe
    swipeStartPos = null;
    swipeEndPos = null;
  }
}

function shootBall(direction: THREE.Vector2, speed: number) {
  const initialBallPosition = new THREE.Vector3(0, 0, -2);
  const targetBallPosition = new THREE.Vector3(
    direction.x * 10, // Adjust the distance based on your needs
    direction.y * 10, // Adjust the distance based on your needs
    -2
  );

  const animationDuration = 1000; // in milliseconds
  const startTime = Date.now();

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / animationDuration, 1);

    ball.position.lerpVectors(
      initialBallPosition,
      targetBallPosition,
      progress
    );

    if (progress < 1) {
      requestAnimationFrame(updateAnimation);
    }
  }

  updateAnimation();
}

// camera.position.set(0, 0, 10);
// Set up our render loop
function render() {
  camera.updateFrame(renderer);
  if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, 0, -5);

  renderer.render(scene, camera);
}
