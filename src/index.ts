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
const player = new URL("../assets/keep2.png", import.meta.url).href;

let field: any;
let goalPostModel: any;
let hasPlaced = false;
let ballShooted = false;
let ballCollisionDetected = false;

const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);
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
// shootingPoint.position.set(-6, -6, 0);
shootingPoint.visible = false; // Initially invisible

function animateShootingPoint() {
  const animationDuration = 5000; // Time taken for the point to cover the whole goal post
  const startTime = Date.now();

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = (elapsedTime % animationDuration) / animationDuration;

    // Define the rectangular path
    const rectWidth = 12;
    const rectHeight = 5;

    let x = 15,
      y = 0;

    if (progress < 0.25) {
      // Move to the right
      x = rectWidth * progress * 4;
      y = 0;
    } else if (progress < 0.5) {
      // Move up
      x = rectWidth;
      y = rectHeight * (progress - 0.25) * 4;
    } else if (progress < 0.75) {
      // Move to the left
      x = rectWidth - rectWidth * (progress - 0.5) * 4;
      y = rectHeight;
    } else {
      // Move down
      x = 0;
      y = rectHeight - rectHeight * (progress - 0.75) * 4;
    }

    // Update the position of the shooting point
    shootingPoint.position.set(-10, y - 3, x - 2);

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
    gltf.scene.position.set(0, 3.51, -25);
    gltf.scene.rotation.set(0, -Math.PI / 2, 0);

    gltf.scene.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        // Adjust shininess and specular properties
        child.material.shininess = 1; // Experiment with different values
        child.material.specular = new THREE.Color(0xff0000); // Set the specular color to black
        child.material.depthBias = 0.02;

        // Enable flat shading for a less shiny appearance
        child.material.flatShading = true;

        // Optionally, adjust other material properties such as emissive color
        child.material.emissive = new THREE.Color(0xfff);
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
    // arrow.visible = true;
    // Using event.direction instead of event.velocityX and event.velocityY
    const direction = new THREE.Vector2(event.direction, 0).normalize();
    const speed = parseFloat(speedControlBar.value);

    // Update the arrow UI based on the calculated direction and speed
    // updateArrowUI(speed);

    // Shoot the ball in the calculated direction and speed
    shootBall(direction, speed);
  });

  animateBallAndGoalkeeper();
});

// let arrowUI: HTMLElement;

// arrowUI = document.getElementById("arrow-ui") || document.createElement("div");

//=========SCORE LOGIC =========

const blackBackground = document.createElement("div");
blackBackground.style.position = "absolute";
blackBackground.style.bottom = "10px";
blackBackground.style.left = "50%";
blackBackground.style.transform = "translateX(-50%)";
blackBackground.style.width = "200px";
blackBackground.style.padding = "10px";
blackBackground.style.backgroundColor = "rgba(0, 0, 0, 0.7)"; // Black with 70% transparency

// Append the black background to the document body
document.body.appendChild(blackBackground);

let score = 0;
const scoreUI = document.createElement("div");
scoreUI.id = "score-ui";
scoreUI.style.position = "absolute";
scoreUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
scoreUI.style.color = "#fff";
document.body.appendChild(scoreUI);

const missedUI = document.createElement("div");
missedUI.id = "missed-ui";
missedUI.style.position = "absolute";
missedUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
missedUI.style.color = "#ff0000";
document.body.appendChild(missedUI);

const scoredUI = document.createElement("div");
scoredUI.id = "scored-ui";
scoredUI.style.position = "absolute";
scoredUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
scoredUI.style.color = "#ff0000";
document.body.appendChild(scoredUI);

// Function to show missed UI
function showMissedUI() {
  missedUI.textContent = "Missed!";
  // Add any additional styling or effects as needed

  // Clear the missed UI after a delay
  setTimeout(() => {
    missedUI.textContent = "";
  }, 2000); // Adjust the delay as needed
}

// Function to show scored UI
function showScoredUI() {
  scoredUI.textContent = "Scored!";
  // Add any additional styling or effects as needed

  // Clear the missed UI after a delay
  setTimeout(() => {
    scoredUI.textContent = "";
  }, 2000); // Adjust the delay as needed
}

// Update the score UI function
function updateScoreUI() {
  scoreUI.textContent = `Score: ${score}`;
}

//======ADD LIVES ======

// Add lives UI
const livesContainer = document.createElement("div");
livesContainer.style.position = "absolute";
livesContainer.style.top = "10px";
livesContainer.style.right = "10px";
livesContainer.style.display = "flex";

const maxLives = 3;
let currentLives = maxLives;

for (let i = 0; i < maxLives; i++) {
  const heart = document.createElement("span");
  heart.className = "heart-icon"; // You may need to define a CSS class for the heart icon
  heart.innerHTML = "❤️"; // You can use a heart emoji or any other icon
  livesContainer.appendChild(heart);
}

document.body.appendChild(livesContainer);

// Function to update the lives UI
function updateLivesUI() {
  // Remove a heart (life) from the UI
  const hearts = livesContainer.querySelectorAll(".heart-icon");
  if (currentLives > 0) {
    //@ts-ignore
    hearts[maxLives - currentLives].style.display = "none";
  }
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
// const arrowGeometry = new THREE.ConeGeometry(0.2, 1, 8);

// // Create an arrow material
// const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

// // Create the arrow mesh
// const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

// // Set initial position (same as ball's initial position)
// arrow.position.set(0, 1, -5);
// arrow.visible = false;
// // Add the arrow to the scene
// trackerGroup.add(arrow);

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

// function updateArrowUI(speed: number) {
//   const arrowLength = Math.min(speed * 100, 100);
//   const arrowRotation = Math.atan2(arrow.position.z, arrow.position.x);

//   arrow.scale.set(1, 1, arrowLength / 100);
//   arrow.rotation.set(0, arrowRotation, 0);
// }

// Add this variable at the beginning of your code
let speedControlBar: HTMLElement;

// Function to create and initialize the speed control bar
function createSpeedControlBar() {
  speedControlBar = document.createElement("input");
  speedControlBar.type = "range";
  speedControlBar.min = "0";
  speedControlBar.max = "1";
  speedControlBar.step = "0.01";
  speedControlBar.value = "0.5"; // Set the initial speed

  speedControlBar.style.position = "absolute";
  speedControlBar.style.bottom = "10px";
  speedControlBar.style.left = "50%";
  speedControlBar.style.transform = "translateX(-50%)";
  speedControlBar.style.width = "200px";

  // Add an event listener to update the speed when the user adjusts the slider
  speedControlBar.addEventListener("input", (event) => {
    const speed = parseFloat((event.target as HTMLInputElement).value);
    updateArrowUI(speed);
  });

  document.body.appendChild(speedControlBar);
}

// Create and initialize the speed control bar
createSpeedControlBar();

// ===FUNCTION TO HANDLE BALL SHOOTING ======

// Animation is complete, check for collision
function shootBall(direction: THREE.Vector2, speed: number) {
  const initialBallPosition = new THREE.Vector3(0, 1, -5);

  // Get the shooting point's position and rotation
  const shootingPointPosition = new THREE.Vector3();
  const shootingPointRotation = new THREE.Quaternion();
  shootingPoint.getWorldPosition(shootingPointPosition);
  shootingPoint.getWorldQuaternion(shootingPointRotation);

  // Set the targetBallPosition based on the shooting point's position and rotation
  const targetBallPosition = new THREE.Vector3().copy(initialBallPosition);
  targetBallPosition.applyQuaternion(shootingPointRotation);
  targetBallPosition.add(shootingPointPosition);

  const distance = initialBallPosition.distanceTo(targetBallPosition);
  const animationDuration = (distance / speed) * 30; // Adjust the duration based on speed
  const startTime = Date.now();

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / animationDuration, 1);
    const newPosition = new THREE.Vector3();
    newPosition.lerpVectors(initialBallPosition, targetBallPosition, progress);
    ball.position.copy(newPosition);
    if (!ballShooted) {
      if (progress < 1) {
        requestAnimationFrame(updateAnimation);
      } else {
        // Reset the ball position after a delay (3-4 seconds)
        handleMiss();
        setTimeout(() => {
          moveBallToInitialPosition();
        }, 600);
      }
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

// Function to handle misses
function handleMiss() {
  // Decrement the number of lives
  currentLives--;
  console.log(currentLives);
  // Update the lives UI
  updateLivesUI();

  // Show missed UI
  showMissedUI();

  if (currentLives <= 0) {
    // Game over logic, e.g., show a game over message, reset the score, etc.
    // For now, let's reset the lives after a delay
    setTimeout(() => {
      currentLives = maxLives;
      updateLivesUI();
    }, 2000);
  } else {
    // Reset the ball position after a delay
    setTimeout(() => {
      moveBallToInitialPosition();
    }, 600);
  }
}

function render() {
  camera.updateFrame(renderer);
  ballShooted = false;
  if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, -3, -20);

  if (goalPostModel && model && !ballCollisionDetected) {
    // Calculate distances every frame
    const playerDistance = ball.position.distanceTo(goalkeeper.position);
    const goalDistance = ball.position.distanceTo(goalPostModel.position);

    if (playerDistance < 1.9) {
      // Player catches the ball
      ballCollisionDetected = true;
      ballShooted = true;
      handleMiss();
    } else if (goalDistance < 5.5) {
      // Goal scored, update the score
      ballCollisionDetected = true;
      ballShooted = true;
      score++;
      showScoredUI();
      updateScoreUI();
      moveBallToInitialPosition(); // Reset the ball position after a delay
    }
  }

  renderer.render(scene, camera);
}

// Show the instructions modal when the page loads
window.addEventListener("load", () => {
  //@ts-ignore
  const instructionsModal = new bootstrap.Modal(
    document.getElementById("instructionsModal")
  );
  instructionsModal.show();
});

// Add an event listener to the "Start Game" button in the instructions modal
const startGameButton = document.getElementById("startGameButton");
//@ts-ignore
startGameButton.addEventListener("click", () => {
  //@ts-ignore
  const instructionsModal = new bootstrap.Modal(
    document.getElementById("instructionsModal")
  );
  instructionsModal.hide();

  // Trigger the placement UI click event programmatically
  const placementUI = document.getElementById("zappar-placement-ui");
  //@ts-ignore
  placementUI.click();
});
