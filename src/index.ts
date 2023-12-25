import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./index.css";

// Import Hammer.js
import Hammer from "hammerjs";

//=========VARIABLES=========
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

//=========ZAPPAR + THREEJS START CODE=========
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

//=========FOOTBALL CODE=========
const ballTexture = new THREE.TextureLoader().load(footImg);
const ball = new THREE.Mesh(
  new THREE.SphereBufferGeometry(0.6, 32, 32),
  new THREE.MeshBasicMaterial({ map: ballTexture })
);

ball.position.set(0, 1, -5);
ball.visible = false;

//===POINT===

const pointGeometry = new THREE.SphereBufferGeometry(0.2, 8, 8);
const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const shootingPoint = new THREE.Mesh(pointGeometry, pointMaterial);
// shootingPoint.position.set(-6, -6, 0);
shootingPoint.visible = false; // Initially invisible
function animateShootingPoint(model: any) {
  const animationDuration = 3000; // Time taken for the point to cover the whole goal post
  const startTime = Date.now();

  // Calculate the center of the goal-post model
  const goalPostCenter = new THREE.Vector3();
  const goalPostDimensions = new THREE.Box3().setFromObject(model);
  goalPostDimensions.getCenter(goalPostCenter);

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = (elapsedTime % animationDuration) / animationDuration;

    const angle = progress * Math.PI * 2; // Full circle in the given duration

    // Define the radius of the circular motion
    const radius =
      Math.min(
        goalPostDimensions.max.x - goalPostDimensions.min.x,
        goalPostDimensions.max.y - goalPostDimensions.min.y
      ) / 3;

    // Calculate the position of the shooting point in a circular motion
    const x = goalPostCenter.x + radius * Math.cos(angle);
    const y = goalPostCenter.y + radius * Math.sin(angle);

    // Update the position of the shooting point
    shootingPoint.position.set(0, y - 3.5, x);

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

//=========FIELD-MODEL=========
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

function getRandomValue(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

//=========FOOTBALL GOAL-POST MODEL=========
gltfLoader.load(
  model,
  (gltf) => {
    goalPostModel = gltf.scene;
    gltf.scene.scale.set(3, 3, 3);
    gltf.scene.position.set(0, 3.51, -25);
    gltf.scene.rotation.set(0, -Math.PI / 2, 0);

    gltf.scene.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        //To Adjust shininess and specular properties
        child.material.shininess = 1;
        child.material.specular = new THREE.Color(0xff0000);
        child.material.depthBias = 0.02;
        child.material.flatShading = true;
        child.material.emissive = new THREE.Color(0xfff);
      }
    });
    gltf.scene.add(shootingPoint);
    goalkeeper.visible = true;
    ball.visible = true;
    // Start animating the shooting point by adding goalPostModel
    animateShootingPoint(goalPostModel);
    trackerGroup.add(goalPostModel, goalkeeper, ball);
  },
  undefined,
  (error) => console.error(error)
);

//=========LIGHTING=========
const ambientLight2 = new THREE.AmbientLight(0x404040);
ambientLight2.position.set(0, 5, 0);
scene.add(ambientLight2);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 5, 0);
scene.add(directionalLight);

//=========GAME START LOGIC =========
const placementUI =
  document.getElementById("zappar-placement-ui") ||
  document.createElement("div");
placementUI.addEventListener("click", () => {
  placementUI.remove();
  hasPlaced = true;

  // Make the shooting point visible when placement is done
  shootingPoint.visible = true;

  // Set up Hammer.js for gesture recognition
  const hammer = new Hammer(document.body);

  // Enable swipe recognizer
  hammer.get("swipe").set({ direction: Hammer.DIRECTION_ALL });

  hammer.on("swipe", (event) => {
    // arrow.visible = true;
    // Using event.direction instead of event.velocityX and event.velocityY
    const direction = new THREE.Vector2(event.direction, 0).normalize();
    //@ts-ignore
    const speed = parseFloat(speedControlBar.value);

    // Update the arrow UI based on the calculated direction and speed
    // updateArrowUI(speed);

    // Shoot the ball in the calculated direction and speed
    shootBall(direction, speed);
  });

  animateBallAndGoalkeeper();
});

//=========SCORE LOGIC =========

const blackBackground = document.createElement("div");
blackBackground.style.position = "absolute";
blackBackground.style.bottom = "10px";
blackBackground.style.left = "50%";
blackBackground.style.transform = "translateX(-50%)";
blackBackground.style.width = "200px";
blackBackground.style.padding = "10px";
blackBackground.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
document.body.appendChild(blackBackground);

//=========SCORE-UI=========
let score = 0;
const scoreUI = document.createElement("div");
scoreUI.id = "score-ui";
scoreUI.style.position = "absolute";
scoreUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
scoreUI.style.color = "#fff";
document.body.appendChild(scoreUI);

// Function to show scored UI
function showScoredUI() {
  scoreUI.textContent = "Scored!";
  setTimeout(() => {
    scoreUI.textContent = "";
  }, 2000);
}

//=========MISS-UI=========
const missedUI = document.createElement("div");
missedUI.id = "missed-ui";
missedUI.style.position = "absolute";
missedUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
missedUI.style.color = "#ff0000";
document.body.appendChild(missedUI);

// Function to show missed UI
function showMissedUI() {
  missedUI.textContent = "Missed!";
  setTimeout(() => {
    missedUI.textContent = "";
  }, 2000);
}

//======LIVES LOGIC======

// Update the score UI function
function updateScoreUI() {
  scoreUI.textContent = `Score: ${score}`;
}

// Set up the initial score UI
updateScoreUI();

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
  heart.className = "heart-icon";
  heart.innerHTML = "❤️";
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

//======CHARACTER & CONFETTI LOGIC ======
function showCartoonCharacter() {
  const cartoonCharacter = document.getElementById("cartoonCharacter");
  if (cartoonCharacter) cartoonCharacter.style.display = "block";
}

function hideCartoonCharacter() {
  const cartoonCharacter = document.getElementById("cartoonCharacter");
  if (cartoonCharacter) cartoonCharacter.style.display = "none";
}

function showConfetti() {
  const confetti = document.getElementById("confetti");
  if (confetti) confetti.style.display = "block";
}

function hideConfetti() {
  const confetti = document.getElementById("confetti");
  if (confetti) confetti.style.display = "none";
}

//======SPEED BAR LOGIC======
// Add this variable at the beginning of your code
let speedControlBar: HTMLElement;

// Function to create and initialize the speed control bar
function createSpeedControlBar() {
  speedControlBar = document.createElement("input");
  //@ts-ignore
  speedControlBar.type = "range";
  //@ts-ignore
  speedControlBar.min = "0";
  //@ts-ignore
  speedControlBar.max = "1";
  //@ts-ignore
  speedControlBar.step = "0.01";
  //@ts-ignore
  speedControlBar.value = "0.5"; // Set the initial speed

  speedControlBar.style.position = "absolute";
  speedControlBar.style.bottom = "10px";
  speedControlBar.style.left = "50%";
  speedControlBar.style.transform = "translateX(-50%)";
  speedControlBar.style.width = "200px";

  speedControlBar.addEventListener("input", (event) => {
    const speed = parseFloat((event.target as HTMLInputElement).value);
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
        // Reset the ball position after a delay (3-4 milli seconds)
        handleMiss();
        ball.visible = false;
        setTimeout(() => {
          moveBallToInitialPosition();
        }, 300);
      }
    }
  }

  updateAnimation();
}

function moveBallToInitialPosition() {
  ball.visible = true;
  const initialBallPosition = new THREE.Vector3(0, 1, -5);

  const animationDuration = 500;
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

// ===AGG FUNCTION TO HANDLE MISS ======

function handleMiss() {
  // Decrement the number of lives
  currentLives--;
  console.log(currentLives);
  // Update the lives UI
  updateLivesUI();

  // Show missed UI
  showMissedUI();

  if (currentLives <= 0) {
    displayGameOverModal(score);
  } else {
    // Reset the ball position after a delay
    setTimeout(() => {
      moveBallToInitialPosition();
    }, 300);
  }
}

// === AGG FUNCTION TO HANDLE SCORE ======
function handleScore() {
  // Increment the score
  score++;
  updateScoreUI();
  showScoredUI();
  // Show cartoon character and confetti
  showCartoonCharacter();
  showConfetti();

  // Additional logic or animations if needed

  // Reset the ball position after a delay
  setTimeout(() => {
    moveBallToInitialPosition();
    hideCartoonCharacter();
    hideConfetti();
  }, 2000);
}

// ===RENDER LOOP ======
function render() {
  camera.updateFrame(renderer);
  ballShooted = false;
  if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, -3, -20);

  if (goalPostModel && model && !ballCollisionDetected) {
    // Calculate distances every frame
    // const playerDistance = ball.position.distanceTo(goalkeeper.position);
    // const goalDistance = ball.position.distanceTo(goalPostModel.position);

    const goalkeeperBoundingBox = new THREE.Box3().setFromObject(goalkeeper);
    const goalPostBoundingBox = new THREE.Box3().setFromObject(goalPostModel);

    // if (playerDistance < 2.9) {
    //   // Player catches the ball
    //   ballCollisionDetected = true;
    //   ballShooted = true;
    //   handleMiss();
    // } else if (goalDistance < 4.5) {
    //   ballCollisionDetected = true;
    //   ballShooted = true;
    //   handleScore();
    // }
    if (goalkeeperBoundingBox.containsPoint(ball.position)) {
      // Player catches the ball
      ballCollisionDetected = true;
      ballShooted = true;
      handleMiss();
    } else if (goalPostBoundingBox.containsPoint(ball.position)) {
      // Ball is inside the goal post
      ballCollisionDetected = true;
      ballShooted = true;
      handleScore();
    }
  }

  renderer.render(scene, camera);
}

// === Show the instructions modal when the page loads======

window.addEventListener("load", () => {
  //@ts-ignore
  const instructionsModal = new bootstrap.Modal(
    document.getElementById("startGameModal")
  );
  instructionsModal.show();
});

// Add an event listener to the "Start Game" button in the instructions modal
const startGameButton = document.getElementById("startGameButton");
//@ts-ignore
const gameOverModal = new bootstrap.Modal(
  document.getElementById("gameOverModal"),
  {
    backdrop: false, // Prevent clicking outside the modal to close it
    keyboard: false, // Prevent using the keyboard to close it
  }
);

//@ts-ignore
document.querySelector("#playEnded").addEventListener("click", (e) => {
  //hide the start modal
  gameOverModal.hide();
  // show the hiddenStart elements

  window.location.reload();
});

//@ts-ignore
startGameButton.addEventListener("click", () => {
  //@ts-ignore
  const instructionsModal = new bootstrap.Modal(
    document.getElementById("startGameModal")
  );
  instructionsModal.hide();

  // Trigger the placement UI click event programmatically
  const placementUI = document.getElementById("zappar-placement-ui");
  //@ts-ignore
  placementUI.click();
});

function displayGameOverModal(finalScore: number) {
  renderer.domElement.remove();

  // Log an error if the modal element is not found
  if (!gameOverModal) {
    console.error("Game Over Modal element not found");
    return;
  }
  speedControlBar.style.visibility = "hidden";
  missedUI.style.visibility = "hidden";
  scoreUI.style.visibility = "hidden";
  livesContainer.style.visibility = "hidden";
  gameOverModal.show();
}
