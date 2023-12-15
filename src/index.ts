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

//===POINT===

// Create a point geometry
const pointGeometry = new THREE.SphereBufferGeometry(0.2, 8, 8);

// Create a point material
const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

// Create the point mesh
const shootingPoint = new THREE.Mesh(pointGeometry, pointMaterial);
shootingPoint.visible = false; // Initially invisible

function animateShootingPoint() {
  const animationDuration = 5000; // Time taken for the point to cover the whole goal post
  const startTime = Date.now();

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = (elapsedTime % animationDuration) / animationDuration;

    // Update the position of the shooting point
    const angle = 2 * Math.PI * progress;
    const radius = 3; // Adjust the radius based on your goal post size
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    shootingPoint.position.set(x, y, 0);

    requestAnimationFrame(updateAnimation);
  }

  updateAnimation();
}

//===GOALKEEPER===

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
    gltf.scene.add(shootingPoint);
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

  // Make the shooting point visible when placement is done
  shootingPoint.visible = true;

  // Start animating the shooting point
  animateShootingPoint();

  // Set up Hammer.js for gesture recognition
  const hammer = new Hammer(document.body);

  // Enable swipe recognizer
  hammer.get("swipe").set({ direction: Hammer.DIRECTION_ALL });

  hammer.on("swipe", (event) => {
    arrow.visible = true;
    // Using event.direction instead of event.velocityX and event.velocityY
    const direction = new THREE.Vector2(event.direction, 0).normalize();
    const speed = Math.min(direction.length(), 1.0);

    // Update the arrow UI based on the calculated direction and speed
    updateArrowUI();

    // Shoot the ball in the calculated direction and speed
    shootBall(direction, speed);
  });

  animateBallAndGoalkeeper();
});

// let arrowUI: HTMLElement;

// arrowUI = document.getElementById("arrow-ui") || document.createElement("div");

//=========SCORE LOGIC =========

let score = 0;
const scoreUI = document.createElement("div");
scoreUI.id = "score-ui";
document.body.appendChild(scoreUI);

// Add this variable at the beginning of your code
const missedUI = document.createElement("div");
missedUI.id = "missed-ui";
document.body.appendChild(missedUI);

// Function to show missed UI
function showMissedUI() {
  missedUI.textContent = "Missed!";
  // Add any additional styling or effects as needed

  // Clear the missed UI after a delay
  setTimeout(() => {
    missedUI.textContent = "";
  }, 2000); // Adjust the delay as needed
}

// Update the score UI function
function updateScoreUI() {
  scoreUI.textContent = `Score: ${score}`;
}

// Modify the collision detection logic
// function checkCollision() {
//   // Check if the ball and goalkeeper have the same position
//   const playerDistance = ball.position.distanceTo(goalkeeper.position);
//   if (playerDistance < 1.5) {
//     // Player catches the ball
//     return "catch";
//   }

//   // Check if the ball and goalpost have the same position
//   const goalDistance = ball.position.distanceTo(goalPostModel.position);
//   if (goalDistance < 3) {
//     // Goal scored
//     return "goal";
//   }

//   // No collision
//   return "none";
// }

//=========ADDING ARROW =========

// Create an arrow geometry
const arrowGeometry = new THREE.ConeGeometry(0.2, 1, 8);

// Create an arrow material
const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

// Create the arrow mesh
const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

// Set initial position (same as ball's initial position)
arrow.position.set(0, 1, -5);
// arrow.visible = false;
// Add the arrow to the scene
trackerGroup.add(arrow);

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

// function updateArrowUI(direction: THREE.Vector2, _speed: number) {
//   // Convert ball position (Vector3) to a new Vector2
//   const ballPosition2D = new THREE.Vector2(ball.position.x, ball.position.z);

//   // Set arrow's position to the ball's position
//   arrow.position.set(ballPosition2D.x, 0, ballPosition2D.y);

//   // Calculate arrow rotation based on the ball's movement direction (for example, using goalkeeper's position)
//   const direction2D = new THREE.Vector2()
//     .subVectors(
//       new THREE.Vector2(goalkeeper.position.x, goalkeeper.position.z),
//       ballPosition2D
//     )
//     .normalize();

//   const arrowRotation = Math.atan2(direction2D.y, direction2D.x);

//   // Set arrow's rotation
//   arrow.rotation.set(0, arrowRotation, 0);
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
// ===FUNCTION TO HANDLE BALL SHOOTING ======

// Animation is complete, check for collision

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
      // if (playerDistance < 1.5) {
      //   // Player catches the ball
      //   showMissedUI();
      // } else if (goalDistance < 3) {
      //   // Goal scored, update the score
      //   score++;
      //   updateScoreUI();
      // }

      // Reset the ball position after a delay (3-4 seconds)
      setTimeout(() => {
        moveBallToInitialPosition();
      }, 1000);

      // Continue with any post-animation actions here
    }
  }

  updateAnimation();
}

function moveBallToInitialPosition() {
  const initialBallPosition = new THREE.Vector3(0, 1, -5);

  const animationDuration = 1000;
  const startTime = Date.now();

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / animationDuration, 1);

    const newPosition = new THREE.Vector3();
    newPosition.lerpVectors(ball.position, initialBallPosition, progress);
    ball.position.copy(newPosition);

    if (progress < 1) {
      requestAnimationFrame(updateAnimation);
    } else {
      // Animation is complete
    }
  }

  updateAnimation();
}

// Set up the initial score UI
updateScoreUI();

camera.position.z = 5;

function render() {
  camera.updateFrame(renderer);
  if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, 0, -5);

  // Check for collision
  if (goalPostModel && model) {
    // Calculate distances every frame
    const playerDistance = ball.position.distanceTo(goalkeeper.position);
    const goalDistance = ball.position.distanceTo(goalPostModel.position);
    console.log("distances", playerDistance, goalDistance);
    if (playerDistance < 1.5) {
      // Player catches the ball
      showMissedUI();
      moveBallToInitialPosition(); // Reset the ball position after a delay
    } else if (goalDistance < 3) {
      // Goal scored, update the score
      score++;
      updateScoreUI();
      moveBallToInitialPosition(); // Reset the ball position after a delay
    }
  }
  updateArrowUI();
  renderer.render(scene, camera);
}
