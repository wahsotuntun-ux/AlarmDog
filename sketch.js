let stage = "ready";
let timerEnds = 0;
let quietStarted = 0;

// tummy rubbing progress.
let rubAmount = 0;
let rubTarget = 600;

// alarm controls.
let alarmInput;
let message;

let barkAudio;

// Walk settings.
let walkGoal = 3200;      // distance to the park
let walkSpeed = 4;
let jumpPower = 12;
let gravity = 0.6;
let groundY = 405;        // where the dog's paws touch the sidewalk
let dogScreenX = 150;     // the dog stays here while the world scrolls
let dogScale = 0.45;

// Walk progress.
let walkDistance = 0;
let walkingNow = false;
let jumpY = 0;
let jumpSpeed = 0;
let puddles = [];
let stunnedUntil = 0;
let splashTime = -10000;
let splashWorldX = 0;
let walkHits = 0;

function setup() {
  createCanvas(500, 500);
  textAlign(CENTER, CENTER);
  textFont("Arial");

  barkAudio = new Audio("bark.wav");
  barkAudio.loop = true;
  barkAudio.volume = 0.5;
  barkAudio.preload = "auto";


  // Clock alarm controls.
  createP("Set alarm using your device's local time:");

  alarmInput = createInput("07:00", "time");
  createButton("Set alarm").mousePressed(setAlarm);
}

function draw() {
  background("#fafbb1");

  // Begin the first alarm when the deadline arrives.
  if (
    stage === "timer" &&
    Date.now() >= timerEnds
  ) {
    stage = "pet";
    startBarking();
  }

  // Begin the walk after five quiet seconds.
  if (
    stage === "quiet" &&
    millis() - quietStarted >= 5000
  ) {
    startWalk();
  }

  if (stage === "walk") {
    updateWalk();
    drawWalkScene();
  } else {
    drawDog();
  }

  // Title.
  noStroke();
  fill(40);
  textSize(24);
  text("Pet Buddy", 250, 35);

  textSize(16);

  if (stage === "ready") {
    text("Set an alarm below", 250, 80);
  }

  if (stage === "timer") {
    // Calculate the remaining time.
    let remaining = max(
      0,
      ceil((timerEnds - Date.now()) / 1000)
    );

    let hoursLeft = floor(remaining / 3600);
    let minutesLeft = floor(remaining / 60) % 60;
    let secondsLeft = remaining % 60;

    text(
      "Alarm in: " +
      nf(hoursLeft, 2) + ":" +
      nf(minutesLeft, 2) + ":" +
      nf(secondsLeft, 2),
      250,
      80
    );
  }

  if (stage === "pet") {
    text("Rub my tummy!", 250, 80);

    // Progress bar background.
    fill("#d6d6bd");
    rect(150, 435, 200, 15, 7);

    // Progress increases with rubbing movement.
    fill("#397d6b");
    rect(
      150,
      435,
      200 * min(rubAmount / rubTarget, 1),
      15,
      7
    );

  }

  if (stage === "quiet") {
    let remaining = max(
      0,
      ceil((5000 - (millis() - quietStarted)) / 1000)
    );

    text(
      "Yipeee! Walk time in " + remaining + " seconds...",
      250,
      80
    );
  }

  if (stage === "walk") {
    fill(40);
    textSize(16);

    if (millis() < stunnedUntil) {
      text("Splash! Jump over the puddles!", 250, 70);
    } else {
      text("Hold → to walk. Press SPACE to jump!", 250, 70);
    }

    // Walk progress bar.
    fill("#ffffff");
    rect(150, 92, 200, 12, 6);

    fill("#397d6b");
    rect(
      150,
      92,
      200 * min(walkDistance / walkGoal, 1),
      12,
      6
    );
  }

  if (stage === "done") {
    text("What a great walk! Alarm finished", 250, 80);

    textSize(14);
    text("Puddle splashes: " + walkHits, 250, 105);
  }
}

// Reset before starting a new session.
function resetSession() {
  stopBarking();

  rubAmount = 0;

  resetWalk();
}

function resetWalk() {
  walkDistance = 0;
  walkingNow = false;
  jumpY = 0;
  jumpSpeed = 0;
  puddles = [];
  stunnedUntil = 0;
  splashTime = -10000;
  walkHits = 0;
}

// Set the next occurrence of the chosen clock time.
function setAlarm() {
  let selectedTime = alarmInput.value();

  if (!selectedTime) {
    message.html("Choose an alarm time first.");
    return;
  }

  let timeParts = selectedTime.split(":");
  let selectedHour = Number(timeParts[0]);
  let selectedMinute = Number(timeParts[1]);

  let now = new Date();
  let alarmDate = new Date(now);

  alarmDate.setHours(
    selectedHour,
    selectedMinute,
    0,
    0
  );

  // Schedule tomorrow if today's time has passed.
  if (alarmDate.getTime() <= now.getTime()) {
    alarmDate.setDate(alarmDate.getDate() + 1);
  }

  resetSession();
  prepareBarkAudio();

  timerEnds = alarmDate.getTime();
  stage = "timer";

  message.html("Alarm set for " + alarmDate.toLocaleString());
}

function drawDog(showShadow = true) {
  let barking = stage === "pet" || stage === "walk";

  // Shadow.
  if (showShadow) {
    noStroke();
    fill("#e8dfd2");
    ellipse(250, 408, 238, 28);
  }
  // Tail wags while barking.
  let tailAngle = barking
    ? sin(millis() / 90) * 0.5
    : 0;

  push();

// Attach the tail to the right side of the body.
  translate(315, 355);
  rotate(tailAngle);

  // Curved fluffy tail.
  noFill();
  stroke("#dedbd4");
  strokeWeight(23);
  arc(20, -20, 65, 65, -PI / 2, PI / 2);

  stroke("#ffffff");
  strokeWeight(19);
  arc(20, -20, 65, 65, -PI / 2, PI / 2);

// Fluffy tip.
  fluff(20, -52, 30, 30);

  pop();


  // Body and paws.
  fluff(250, 319, 172, 174);
  fluff(176, 394, 72, 42);
  fluff(324, 394, 72, 42);

  // Only show the tummy target during the first alarm.
  if (stage === "pet") {
    fill("#e1f1e6");
    stroke("#397d6b");
    strokeWeight(2);
    ellipse(250, 325, 100, 100);

    noStroke();
    fill("#397d6b");
    textSize(14);
    text("Rub here", 250, 325);
  }

  // Ears and head.
  fluff(170, 226, 65, 88);
  fluff(330, 226, 65, 88);
  fluff(250, 222, 167, 126);

  // Eye whites and outlines.
  fill("#ffffff");
  stroke("#253d37");
  strokeWeight(1.5);

  ellipse(223, 224, 23, 27);
  ellipse(277, 224, 23, 27);

  // Direction from each eye to the cursor.
  let leftAngle = atan2(mouseY - 224, mouseX - 223);
  let rightAngle = atan2(mouseY - 224, mouseX - 277);

  // Limit pupil movement.
  let leftMovement = min(
    5,
    dist(mouseX, mouseY, 223, 224) / 15
  );

  let rightMovement = min(
    5,
    dist(mouseX, mouseY, 277, 224) / 15
  );

  // Pupils follow the cursor.
  noStroke();
  fill("#253d37");

  ellipse(
    223 + cos(leftAngle) * leftMovement,
    224 + sin(leftAngle) * leftMovement,
    11,
    14
  );

  ellipse(
    277 + cos(rightAngle) * rightMovement,
    224 + sin(rightAngle) * rightMovement,
    11,
    14
  );

  // Muzzle.
  fill("#f6eee4");
  ellipse(250, 248, 63, 40);

  // Nose.
  fill("#253d37");
  ellipse(250, 242, 18, 12);

  // Mouth.
  if (barking) {
    ellipse(250, 260, 22, 20);

    fill("#eaa6a4");
    ellipse(250, 265, 12, 9);
  } else {
    stroke("#253d37");
    strokeWeight(2);

    line(250, 249, 250, 258);
    line(250, 258, 242, 255);
    line(250, 258, 258, 255);

    noStroke();
  }

  // Blue collar and gold tag.
  noStroke();
  fill("#00b8e6");
  rect(209, 273, 82, 12, 5);

  fill("#eac37c");
  circle(250, 289, 16);
}

// Draw a fluffy shape.
function fluff(cx, cy, w, h) {
  fill("#ffffff");
  stroke("#dedbd4");
  strokeWeight(2);

  ellipse(cx, cy, w, h);

  for (let i = 0; i < 12; i++) {
    let angle = TWO_PI * i / 12;

    ellipse(
      cx + cos(angle) * w * 0.39,
      cy + sin(angle) * h * 0.39,
      w * 0.28,
      h * 0.28
    );
  }

  noStroke();
  fill("#ffffff");
  ellipse(cx, cy, w * 0.9, h * 0.9);
}

// ---------- Walk the dog ----------

function startWalk() {
  stage = "walk";
  resetWalk();

  // Unfocus the buttons so SPACE doesn't click them.
  if (document.activeElement) {
    document.activeElement.blur();
  }

  // Place puddles along the route.
  let x = 500;

  while (x < walkGoal - 250) {
    puddles.push({ x: x });
    x += random(350, 550);
  }

  barkAudio.volume = 0.5;
  startBarking();
}

// Convert a position on the route to a canvas position.
function toScreenX(worldX) {
  return worldX - walkDistance + dogScreenX;
}

function updateWalk() {
  // Adjust movement for different frame rates.
  let step = min(deltaTime, 50) / 16.67;
  let stunned = millis() < stunnedUntil;

  // Hold the right arrow or D to walk.
  walkingNow =
    !stunned &&
    (keyIsDown(RIGHT_ARROW) || keyIsDown(68));

  if (walkingNow) {
    walkDistance += walkSpeed * step;
  }

  // Jump physics.
  if (jumpY > 0 || jumpSpeed > 0) {
    jumpY += jumpSpeed * step;
    jumpSpeed -= gravity * step;

    if (jumpY <= 0) {
      jumpY = 0;
      jumpSpeed = 0;
    }
  }

  // Landing in a puddle splashes and pushes the dog back.
  if (!stunned && jumpY < 20) {
    for (let p of puddles) {
      if (abs(p.x - walkDistance) < 45) {
        walkHits++;
        splashTime = millis();
        splashWorldX = p.x;
        stunnedUntil = millis() + 700;
        walkDistance = max(0, walkDistance - 110);
        break;
      }
    }
  }

  // The barking calms down as the park gets closer.
  let progress = min(walkDistance / walkGoal, 1);
  barkAudio.volume = 0.5 * (1 - progress * 0.7);

  // Reaching the park ends the alarm.
  if (walkDistance >= walkGoal) {
    stopBarking();
    stage = "done";
  }
}

function drawWalkScene() {
  // Sky.
  background("#cdeefd");

  noStroke();
  fill("#ffe58a");
  circle(430, 150, 60);

  // Far hills move slowly.
  fill("#a8d58b");
  let hillOffset = (walkDistance * 0.2) % 300;

  for (let x = -hillOffset - 150; x < width + 300; x += 300) {
    ellipse(x, 340, 340, 160);
  }

  // Grass.
  fill("#8cc66d");
  rect(0, 330, width, 40);

  // Trees move at half speed.
  let treeOffset = (walkDistance * 0.5) % 220;

  for (let x = -treeOffset; x < width + 220; x += 220) {
    drawTree(x + 60, 340);
  }

  // Sidewalk.
  noStroke();
  fill("#e6dccb");
  rect(0, 370, width, 60);

  stroke("#cfc3ae");
  strokeWeight(2);
  let tileOffset = walkDistance % 60;

  for (let x = -tileOffset; x < width; x += 60) {
    line(x, 370, x, 430);
  }

  // Road.
  noStroke();
  fill("#6b6f73");
  rect(0, 430, width, 70);

  fill("#f4f1e6");
  let lineOffset = walkDistance % 80;

  for (let x = -lineOffset; x < width; x += 80) {
    rect(x, 462, 40, 6, 3);
  }

  // Park gate at the finish.
  let finishX = toScreenX(walkGoal);

  if (finishX < width + 60) {
    drawParkGate(finishX);
  }

  // Puddles.
  for (let p of puddles) {
    let px = toScreenX(p.x);

    if (px > -60 && px < width + 60) {
      drawPuddle(px);
    }
  }

  drawWalkingDog();
  drawSplash();
}

function drawTree(x, baseY) {
  noStroke();
  fill("#8a5a35");
  rect(x - 6, baseY - 45, 12, 45);

  fill("#5fa35a");
  circle(x, baseY - 70, 60);
  circle(x - 22, baseY - 55, 40);
  circle(x + 22, baseY - 55, 40);
}

function drawPuddle(x) {
  noStroke();
  fill("#7cc4ea");
  ellipse(x, groundY, 80, 22);

  fill("#b9e3f7");
  ellipse(x - 12, groundY - 3, 30, 7);
}

function drawParkGate(x) {
  noStroke();
  fill("#77502e");
  rect(x - 44, 300, 8, 105);
  rect(x + 36, 300, 8, 105);

  fill("#397d6b");
  rect(x - 52, 285, 104, 30, 6);

  fill("#ffffff");
  textSize(16);
  text("PARK", x, 300);
}

function drawWalkingDog() {
  // Small bounce while walking.
  let bob = walkingNow
    ? abs(sin(millis() / 110)) * 6
    : 0;

  let feetY = groundY - jumpY - bob;

  // Ground shadow shrinks while jumping.
  let shadowSize = map(jumpY, 0, 120, 1, 0.5, true);
  noStroke();
  fill(0, 0, 0, 30);
  ellipse(dogScreenX, groundY, 90 * shadowSize, 14 * shadowSize);

  // Leash from the collar to the owner's hand.
  let collarY = feetY + (279 - 408) * dogScale;

  noFill();
  stroke("#c0392b");
  strokeWeight(3);
  bezier(
    dogScreenX, collarY,
    dogScreenX - 40, collarY - 40,
    dogScreenX - 90, 190,
    dogScreenX - 120, 160
  );

  noStroke();
  fill("#f2c9a0");
  circle(dogScreenX - 120, 160, 18);

  // The dog itself, scaled down onto the sidewalk.
  push();
  translate(dogScreenX, feetY);
  scale(dogScale);
  translate(-250, -408);
  drawDog(false);
  pop();
}

function drawSplash() {
  let t = (millis() - splashTime) / 600;

  if (t < 0 || t > 1) return;

  let sx = toScreenX(splashWorldX);

  noStroke();
  fill(124, 196, 234, 255 * (1 - t));

  for (let i = 0; i < 7; i++) {
    let angle = map(i, 0, 6, PI * 0.15, PI * 0.85);

    circle(
      sx + cos(angle) * 50 * t,
      groundY - sin(angle) * 60 * t + 40 * t * t,
      8
    );
  }
}

function keyPressed() {
  if (stage !== "walk") return;

  // SPACE, up arrow or W jumps.
  if (
    (key === " " || keyCode === UP_ARROW || keyCode === 87) &&
    jumpY === 0 &&
    millis() >= stunnedUntil
  ) {
    jumpSpeed = jumpPower;
  }

  // Stop the arrows and SPACE from scrolling the page.
  if (
    [UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW, 32]
      .includes(keyCode)
  ) {
    return false;
  }
}

function mouseDragged() {
  if (stage === "pet") {
    // Both mouse positions must be inside the tummy.
    let insideNow =
      dist(mouseX, mouseY, 250, 325) <= 50;

    let insideBefore =
      dist(pmouseX, pmouseY, 250, 325) <= 50;

    if (insideNow && insideBefore) {
      rubAmount += dist(
        mouseX,
        mouseY,
        pmouseX,
        pmouseY
      );

      // Stop the first barking stage.
      if (rubAmount >= rubTarget) {
        stopBarking();
        stage = "quiet";
        quietStarted = millis();
      }
    }
  }

  return false;
}

function prepareBarkAudio() {
  barkAudio.muted = true;
  barkAudio.currentTime = 0;

  barkAudio.play().catch(() => {
    message.html(
      "Audio could not start. Check bark.mp3 and try again."
    );
  });
}

  //loop audio
function startBarking() {
  barkAudio.muted = false;
  barkAudio.currentTime = 0;

  barkAudio.play().catch(() => {
    message.html(
      "Audio could not play. Check the file and browser sound settings."
    );
  });
}

  // Stop the recording immediately.
function stopBarking() {
  barkAudio.pause();
  barkAudio.currentTime = 0;
}
