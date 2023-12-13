import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./index.css";

// Import Hammer.js
import Hammer from "hammerjs";

const footImg = new URL("../assets/football.png", import.meta.url).href;
const model = new URL("../assets/football_net.glb", import.meta.url).href;
const fieldModel = new URL("../assets/football_field.glb", import.meta.url)
  .href;
const player = new URL("../assets/player.png", import.meta.url).href;

let field: any;
let goalPostModel: any;

const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);
let hasPlaced = false;

renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(render);

const camera = new ZapparThree.Camera();
const manager = new ZapparThree.LoadingManager();

ZapparThree.glContextSet(renderer.getContext());

const scene = new THREE.Scene();
scene.background = camera.backgroundTexture;

ZapparThree.permissionRequestUI().then((granted) => {
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

const tracker = new ZapparThree.InstantWorldTracker();
const trackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, tracker);
scene.add(trackerGroup);

const ballTexture = new THREE.TextureLoader().load(footImg);
const ball = new THREE.Mesh(
  new THREE.SphereBufferGeometry(0.6, 32, 32),
  new THREE.MeshBasicMaterial({ map: ballTexture })
);

ball.position.set(0, 1, -5);
ball.visible = false;

const goalkeeperTexture = new THREE.TextureLoader().load(player);

const goalkeeperGeometry = new THREE.PlaneBufferGeometry(4, 4);
const goalkeeperMaterial = new THREE.MeshBasicMaterial({
  map: goalkeeperTexture,
  transparent: true,
});

const goalkeeper = new THREE.Mesh(goalkeeperGeometry, goalkeeperMaterial);
goalkeeper.position.set(0, 2, -25);
goalkeeper.visible = false;

const gltfLoader = new GLTFLoader(manager);

gltfLoader.load(
  fieldModel,
  (gltf) => {
    field = gltf.scene;
    gltf.scene.scale.set(1, 1, 1);
    gltf.scene.position.set(0, -2, -5);
    camera.lookAt(gltf.scene.position);

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

gltfLoader.load(
  model,
  (gltf) => {
    goalPostModel = gltf.scene;
    gltf.scene.scale.set(3, 3, 3);
    gltf.scene.position.set(0, 3.5, -25);
    gltf.scene.rotation.set(0, -Math.PI / 2, 0);

    gltf.scene.traverse(function (child) {
      if ((child as THREE.Mesh).isMesh) {
        let m = child as THREE.Mesh;
        child.castShadow = true;
        child.receiveShadow = true;
        m.castShadow = true;
        m.frustumCulled = false;
      }
    });

    goalkeeper.visible = true;
    ball.visible = true;
    trackerGroup.add(goalPostModel, goalkeeper, ball);
  },
  undefined,
  (error) => console.error(error)
);

const ambientLight2 = new THREE.AmbientLight(0x404040);
ambientLight2.position.set(0, 5, 0);
scene.add(ambientLight2);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 5, 0);
scene.add(directionalLight);

function animateBallAndGoalkeeper() {
  function updateAnimation() {
    const targetGoalkeeperPosition = new THREE.Vector3(
      getRandomValue(-6, 6),
      2,
      -25
    );

    const animationDuration = 1000;
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
        updateAnimation();
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

  // Set up Hammer.js for gesture recognition
  const hammer = new Hammer(document.body);

  // Enable swipe recognizer
  hammer.get("swipe").set({ direction: Hammer.DIRECTION_ALL });

  hammer.on("swipe", (event) => {
    // Using event.direction instead of event.velocityX and event.velocityY
    const direction = new THREE.Vector2(event.direction, 0).normalize();
    const speed = Math.min(direction.length(), 1.0);

    // Update the arrow UI based on the calculated direction and speed
    updateArrowUI(direction, speed);

    // Shoot the ball in the calculated direction and speed
    shootBall(direction, speed);
  });

  animateBallAndGoalkeeper();
});

let arrowUI: HTMLElement;

arrowUI = document.getElementById("arrow-ui") || document.createElement("div");

//=========ADDING ARROW =========

// Create an arrow geometry
const arrowGeometry = new THREE.ConeGeometry(0.2, 1, 8);

// Create an arrow material
const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

// Create the arrow mesh
const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

// Set initial position (same as ball's initial position)
arrow.position.set(0, 1, -5);

// Add the arrow to the scene
scene.add(arrow);

// let swipeStartPos: THREE.Vector2 | null = null;
// let swipeEndPos: THREE.Vector2 | null = null;

// function handleTouchStart(event: TouchEvent) {
//   swipeStartPos = new THREE.Vector2(
//     event.touches[0].clientX,
//     event.touches[0].clientY
//   );
// }

// function handleTouchEnd(event: TouchEvent) {
//   if (swipeStartPos) {
//     swipeEndPos = new THREE.Vector2(
//       event.changedTouches[0].clientX,
//       event.changedTouches[0].clientY
//     );

//     const direction = new THREE.Vector2()
//       .subVectors(swipeEndPos, swipeStartPos)
//       .normalize();
//     const speed = Math.min(swipeStartPos.distanceTo(swipeEndPos) * 0.01, 1.0);

//     updateArrowUI(direction, speed);
//     shootBall(direction, speed);

//     swipeStartPos = null;
//     swipeEndPos = null;
//   }
// }

// function updateArrowUI(direction: THREE.Vector2, speed: number) {
//   const arrowLength = Math.min(speed * 100, 100);
//   const arrowRotation = Math.atan2(direction.y, direction.x);

//   arrowUI.style.transform = `rotate(${arrowRotation}rad) scaleY(${
//     arrowLength / 100
//   })`;
// }

function updateArrowUI() {
  // Set arrow's position to the ball's position
  arrow.position.copy(ball.position);

  // Calculate arrow rotation based on the ball's movement direction (for example, using goalkeeper's position)
  const direction = new THREE.Vector3();
  direction.subVectors(goalkeeper.position, ball.position).normalize();
  const arrowRotation = Math.atan2(direction.z, direction.x);

  // Set arrow's rotation
  arrow.rotation.set(0, arrowRotation, 0);
}

function shootBall(direction: THREE.Vector2, speed: number) {
  const initialBallPosition = new THREE.Vector3(0, 1, -5);
  const targetBallPosition = new THREE.Vector3(
    direction.x * 2,
    1,
    getRandomValue(-40, -25)
  );

  const animationDuration = 1000;
  const startTime = Date.now();

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / animationDuration, 1);

    const newPosition = new THREE.Vector3();
    newPosition.lerpVectors(initialBallPosition, targetBallPosition, progress);
    ball.position.copy(newPosition);

    if (progress < 1) {
      requestAnimationFrame(updateAnimation);
    } else {
      // Animation is complete, perform any post-animation actions here
    }
  }

  updateAnimation();
}

function render() {
  camera.updateFrame(renderer);
  if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, 0, -5);
  updateArrowUI();
  renderer.render(scene, camera);
}
