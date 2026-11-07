let stage = "ready";
let timerEnds = 0;
let quietStarted = 0;

// Fetch settings.
let fetchTarget = 3;      // throws needed to stop the alarm
let homeX = 250;          // where the dog waits for the ball
let fetchFloorY = 470;    // where the dog's paws touch the floor
let fetchDogScale = 0.68;
let ballR = 13;
let ballGround = 466;     // ball's center when it rests on the floor

// Fetch progress.
let fetchState = "waiting";   // waiting, flying or returning
let fetchCount = 0;
let dogX = 250;
let dogFacing = 1;
let dogRunning = false;
let dogChasing = false;
let ball = { x: 350, y: 466, vx: 0, vy: 0 };
let draggingBall = false;
let lastBallX = 0;
let lastBallY = 0;
let throwVX = 0;
let throwVY = 0;

// alarm controls.
let alarmInput;
let message;
let alarmClockText = "";

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

// Bones to collect on the walk.
let bones = [];
let bonesCollected = 0;
let boostUntil = 0;

// Squirrels that distract the dog.
let squirrelSpots = [];
let squirrel = null;

// Dog animation.
let headTilt = 0;

// Scenery.
let stars = [];
let flowers = [];
let wakeTimeText = "";

function setup() {
  let canvas = createCanvas(500, 500);
  canvas.parent("app");

  textAlign(CENTER, CENTER);
  textFont("Fredoka, Arial, sans-serif");

  barkAudio = new Audio("bark.wav");
  barkAudio.loop = true;
  barkAudio.volume = 0.5;
  barkAudio.preload = "auto";

  // Stars for the bedroom window.
  for (let i = 0; i < 14; i++) {
    stars.push({
      x: random(34, 122),
      y: random(121, 209),
      phase: random(TWO_PI)
    });
  }

  // Flowers for the park.
  for (let i = 0; i < 14; i++) {
    flowers.push({
      x: random(15, 485),
      y: random(445, 490),
      c: random(["#ff8fab", "#ffd166", "#ffffff", "#c39bd3"])
    });
  }

  // Alarm card under the canvas.
  let card = createDiv().addClass("alarm-card").parent("app");

  createElement("label", "Wake me up at")
    .attribute("for", "alarm-time")
    .parent(card);

  let row = createDiv().addClass("alarm-row").parent(card);

  alarmInput = createInput("07:00", "time")
    .id("alarm-time")
    .parent(row);

  createButton("Set alarm")
    .addClass("alarm-btn")
    .parent(row)
    .mousePressed(setAlarm);

  message = createP("").addClass("alarm-status").parent(card);
}

function draw() {
  // Begin the first alarm when the deadline arrives.
  if (
    stage === "timer" &&
    Date.now() >= timerEnds
  ) {
    startFetch();
  }

  // Begin the walk after five quiet seconds.
  if (
    stage === "quiet" &&
    millis() - quietStarted >= 5000
  ) {
    startWalk();
  }

  let night = stage === "ready" || stage === "timer";

  if (stage === "walk") {
    updateWalk();
    drawWalkScene();
  } else if (stage === "done") {
    drawParkScene();
    drawDog();
  } else if (stage === "fetch") {
    updateFetch();
    drawBedroom(false);
    drawFetch();
  } else {
    drawBedroom(night);
    drawBasketBack();
    drawDog();
    drawBasketFront();

    if (night) {
      drawSleepZs();
    }
  }

  // Title.
  let ink = night ? color("#f3efe0") : color("#28332f");

  noStroke();
  fill(ink);
  textSize(26);
  textStyle(BOLD);
  text("Pet Buddy", 250, 35);
  textStyle(NORMAL);

  textSize(17);

  if (stage === "ready") {
    text("Set an alarm below. I'll nap until then.", 250, 80);
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

  if (stage === "fetch") {
    text("Let's play fetch!", 250, 78);

    // One ball icon per fetch, filled in when done.
    for (let i = 0; i < fetchTarget; i++) {
      let x = 250 + (i - (fetchTarget - 1) / 2) * 26;

      if (i < fetchCount) {
        drawTennisBall(x, 106, 8);
      } else {
        noFill();
        stroke("#c9b48f");
        strokeWeight(2);
        circle(x, 106, 16);
        noStroke();
      }
    }
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
    // Walk progress bar.
    fill("#ffffff");
    rect(150, 72, 200, 12, 6);

    fill("#397d6b");
    rect(
      150,
      72,
      200 * min(walkDistance / walkGoal, 1),
      12,
      6
    );

    // Bone counter.
    drawBone(382, 78, 0.6);
    fill("#28332f");
    textSize(16);
    text(bonesCollected, 408, 78);
  }

  if (stage === "done") {
    textSize(24);
    textStyle(BOLD);
    text("Good morning!", 250, 80);
    textStyle(NORMAL);
  }
}

// Reset before starting a new session.
function resetSession() {
  stopBarking();

  draggingBall = false;

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
  bones = [];
  bonesCollected = 0;
  boostUntil = 0;
  squirrelSpots = [];
  squirrel = null;
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
  let tomorrow = false;

  if (alarmDate.getTime() <= now.getTime()) {
    alarmDate.setDate(alarmDate.getDate() + 1);
    tomorrow = true;
  }

  resetSession();
  prepareBarkAudio();

  timerEnds = alarmDate.getTime();
  stage = "timer";

  alarmClockText =
    nf(selectedHour, 2) + ":" + nf(selectedMinute, 2);

  message.html(
    "Alarm set for " +
    alarmDate.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    }) +
    (tomorrow ? " tomorrow." : " today.")
  );
}

// ---------- The dog ----------

function drawDog(showShadow = true) {
  let barking = stage === "fetch" || stage === "walk";
  let sleeping = stage === "ready" || stage === "timer";
  let happy = stage === "quiet" || stage === "done";

  push();

  // Slow breathing while asleep.
  if (sleeping) {
    let breath = sin(millis() / 700) * 0.02;

    translate(250, 408);
    scale(1 + breath * 0.5, 1 + breath);
    translate(-250, -408);
  }

  // Shadow.
  if (showShadow) {
    noStroke();
    fill(0, 0, 0, 25);
    ellipse(250, 408, 238, 28);
  }

  // Tail wags fast while barking and slowly when happy.
  let tailAngle = 0;

  if (barking) {
    tailAngle = sin(millis() / 90) * 0.5;
  } else if (happy) {
    tailAngle = sin(millis() / 160) * 0.35;
  }

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

  // The head tilts toward a nearby cursor.
  let targetTilt = 0;

  if (
    !sleeping &&
    stage !== "walk" &&
    stage !== "fetch" &&
    dist(mouseX, mouseY, 250, 230) < 140
  ) {
    targetTilt = map(mouseX, 110, 390, -0.14, 0.14, true);
  }

  headTilt = lerp(headTilt, targetTilt, 0.08);

  push();
  translate(250, 250);
  rotate(headTilt);
  translate(-250, -250);

  // Ears droop while asleep, perk up while barking,
  // and the left one twitches now and then.
  let earLift = 0;

  if (sleeping) {
    earLift = 8;
  } else if (barking) {
    earLift = -6 + sin(millis() / 100) * 3;
  }

  let twitch =
    !sleeping && millis() % 4200 < 180 ? -5 : 0;

  fluff(170, 226 + earLift + twitch, 65, 88);
  fluff(330, 226 + earLift, 65, 88);
  fluff(250, 222, 167, 126);

  drawEyes(sleeping, happy);

  // Rosy cheeks when happy.
  if (happy) {
    noStroke();
    fill(234, 166, 164, 140);
    ellipse(200, 252, 20, 11);
    ellipse(300, 252, 20, 11);
  }

  // Muzzle.
  noStroke();
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
  } else if (happy) {
    // Tongue out with a smile.
    fill("#eaa6a4");
    ellipse(250, 266, 10, 13);

    noFill();
    stroke("#253d37");
    strokeWeight(2);
    line(250, 249, 250, 256);
    arc(244, 256, 12, 10, 0, PI);
    arc(256, 256, 12, 10, 0, PI);
    noStroke();
  } else {
    stroke("#253d37");
    strokeWeight(2);

    line(250, 249, 250, 258);
    line(250, 258, 242, 255);
    line(250, 258, 258, 255);

    noStroke();
  }

  pop();

  // Blue collar and gold tag.
  noStroke();
  fill("#00b8e6");
  rect(209, 273, 82, 12, 5);

  fill("#eac37c");
  circle(250, 289, 16);

  pop();
}

function drawEyes(sleeping, happy) {
  // A quick blink every few seconds.
  let blink = millis() % 3800 < 130;

  // Closed eyes while asleep or blinking.
  if (sleeping || blink) {
    noFill();
    stroke("#253d37");
    strokeWeight(2.5);
    arc(223, 224, 20, 12, 0, PI);
    arc(277, 224, 20, 12, 0, PI);
    noStroke();
    return;
  }

  // Happy curved eyes.
  if (happy) {
    noFill();
    stroke("#253d37");
    strokeWeight(3);
    arc(223, 228, 20, 18, PI, TWO_PI);
    arc(277, 228, 20, 18, PI, TWO_PI);
    noStroke();
    return;
  }

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

  let leftX = 223 + cos(leftAngle) * leftMovement;
  let leftY = 224 + sin(leftAngle) * leftMovement;
  let rightX = 277 + cos(rightAngle) * rightMovement;
  let rightY = 224 + sin(rightAngle) * rightMovement;

  // Pupils follow the cursor.
  noStroke();
  fill("#253d37");
  ellipse(leftX, leftY, 11, 14);
  ellipse(rightX, rightY, 11, 14);

  // Little shine in each eye.
  fill("#ffffff");
  circle(leftX - 2, leftY - 3, 3.5);
  circle(rightX - 2, rightY - 3, 3.5);
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

// ---------- Bedroom ----------

function drawBedroom(night) {
  // Wall.
  background(night ? "#2b3352" : "#fbe7c6");

  // Soft polka-dot wallpaper.
  noStroke();
  fill(255, 255, 255, night ? 14 : 90);

  let row = 0;

  for (let y = 20; y < 372; y += 40) {
    for (let x = row % 2 ? 40 : 20; x < width; x += 40) {
      circle(x, y, 6);
    }
    row++;
  }

  // Wooden floor.
  fill(night ? "#4a3b36" : "#c99a6b");
  rect(0, 380, width, 120);

  stroke(night ? "#3c2f2b" : "#b5865a");
  strokeWeight(2);

  for (let r = 0; r < 4; r++) {
    let y = 380 + r * 30;
    line(0, y + 30, width, y + 30);

    for (let x = (r % 2) * 60 + 30; x < width; x += 120) {
      line(x, y, x, y + 30);
    }
  }

  // Skirting board.
  noStroke();
  fill(night ? "#3a3048" : "#f6f0e4");
  rect(0, 372, width, 10);

  drawWindow(night);
  drawWallClock(night);
}

function drawWindow(night) {
  let x = 28;
  let y = 115;
  let w = 100;
  let h = 100;

  noStroke();

  if (night) {
    // Night sky with twinkling stars and a crescent moon.
    fill("#15193a");
    rect(x, y, w, h);

    for (let s of stars) {
      fill(255, 255, 230, 150 + sin(millis() / 400 + s.phase) * 105);
      circle(s.x, s.y, 3);
    }

    fill("#f6f0c8");
    circle(x + 68, y + 30, 26);
    fill("#15193a");
    circle(x + 75, y + 25, 22);
  } else {
    // Sunrise.
    let bands = ["#ffd6a5", "#ffc48a", "#ffb07a", "#ff9f80"];

    for (let i = 0; i < bands.length; i++) {
      fill(bands[i]);
      rect(x, y + i * h / 4, w, h / 4);
    }

    fill("#ffe58a");
    arc(x + w / 2, y + h, 54, 54, PI, TWO_PI);
  }

  // Frame.
  noFill();
  stroke(night ? "#e8e1cf" : "#ffffff");
  strokeWeight(6);
  rect(x, y, w, h, 3);

  strokeWeight(4);
  line(x + w / 2, y, x + w / 2, y + h);
  line(x, y + h / 2, x + w, y + h / 2);

  // Sill.
  noStroke();
  fill(night ? "#d8d0bd" : "#ffffff");
  rect(x - 8, y + h + 2, w + 16, 8, 3);

  // Curtains and rod.
  fill(night ? "#7a5c9e" : "#e98a7d");
  rect(x - 14, y - 10, 18, h + 12, 4);
  rect(x + w - 4, y - 10, 18, h + 12, 4);

  fill("#8a5a35");
  rect(x - 20, y - 14, w + 40, 5, 2);
}

function drawWallClock(night) {
  let now = new Date();
  let x = 372;
  let y = 118;

  // Shelf.
  noStroke();
  fill(night ? "#5b4a44" : "#a46b3f");
  rect(x - 8, y + 58, 116, 8, 3);

  // Clock body.
  fill("#1d2233");
  rect(x, y, 100, 56, 10);

  // Digits, with a blinking colon.
  let glow = night ? color("#ff7b7b") : color("#7ce0b5");
  let digitsY = stage === "timer" ? y + 24 : y + 28;

  fill(glow);
  textSize(26);
  textStyle(BOLD);
  text(nf(now.getHours(), 2), x + 30, digitsY);
  text(nf(now.getMinutes(), 2), x + 70, digitsY);

  if (now.getSeconds() % 2 === 0) {
    text(":", x + 50, digitsY - 2);
  }

  textStyle(NORMAL);

  // Show the alarm time under the clock.
  if (stage === "timer") {
    textSize(10);
    fill(night ? "#ffb3b3" : "#b8f0d8");
    text("ALARM " + alarmClockText, x + 50, y + 46);
  }
}

function drawBasketBack() {
  noStroke();
  fill("#8a5a35");
  ellipse(250, 395, 330, 70);

  // Cushion.
  fill("#c94f4f");
  ellipse(250, 392, 290, 48);
}

function drawBasketFront() {
  noStroke();
  fill("#a46b3f");
  rect(85, 398, 330, 34, 0, 0, 30, 30);

  // Woven lines.
  stroke("#8a5a35");
  strokeWeight(2);

  for (let x = 100; x < 410; x += 18) {
    line(x, 404, x, 426);
  }

  // Rim.
  noStroke();
  fill("#b97a4a");
  rect(85, 394, 330, 10, 5);
}

function drawSleepZs() {
  noStroke();

  for (let i = 0; i < 3; i++) {
    let t = (millis() / 2400 + i / 3) % 1;
    let alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;

    fill(243, 239, 224, 255 * alpha);
    textSize(14 + t * 14);
    text(
      "z",
      318 + t * 40 + sin(t * TWO_PI) * 6,
      190 - t * 70
    );
  }
}

// ---------- Park (finish screen) ----------

function drawParkScene() {
  background("#cdeefd");

  noStroke();
  fill("#ffe58a");
  circle(420, 150, 70);

  // Drifting clouds.
  fill(255, 255, 255, 220);
  drawCloud((millis() * 0.012) % 650 - 100, 140);
  drawCloud((millis() * 0.008 + 300) % 650 - 100, 190);

  // Hills, trees and grass.
  fill("#a8d58b");
  ellipse(80, 335, 360, 160);
  ellipse(430, 345, 380, 150);

  drawTree(60, 335);
  drawTree(445, 340);

  fill("#8cc66d");
  rect(0, 335, width, 165);

  // Flowers.
  for (let f of flowers) {
    fill(f.c);

    for (let i = 0; i < 5; i++) {
      let a = TWO_PI * i / 5;
      circle(f.x + cos(a) * 4, f.y + sin(a) * 4, 6);
    }

    fill("#f4b942");
    circle(f.x, f.y, 4);
  }
}

function drawCloud(x, y) {
  circle(x, y, 40);
  circle(x + 25, y - 10, 50);
  circle(x + 50, y, 40);
}

function finishAlarm() {
  stopBarking();
  stage = "done";

  wakeTimeText = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  message.html("Good morning! Set a new alarm whenever you like.");
}

// ---------- Fetch ----------

function startFetch() {
  stage = "fetch";

  fetchState = "waiting";
  fetchCount = 0;
  dogX = homeX;
  dogFacing = 1;
  dogRunning = false;
  draggingBall = false;

  ball = { x: homeX + 100, y: ballGround, vx: 0, vy: 0 };

  barkAudio.volume = 0.5;
  startBarking();
}

// Where the dog's mouth is on the canvas.
function mouthPos() {
  let bob = dogRunning ? abs(sin(millis() / 90)) * 8 : 0;

  return {
    x: dogX,
    y: fetchFloorY - bob + (264 - 408) * fetchDogScale
  };
}

// Run toward a spot on the floor.
function moveDogToward(targetX, step) {
  targetX = constrain(targetX, 75, 425);
  let dx = targetX - dogX;

  if (abs(dx) < 3) {
    dogX = targetX;
    return;
  }

  // Flip the dog so its tail trails behind.
  dogFacing = dx > 0 ? -1 : 1;
  dogX += constrain(dx, -6 * step, 6 * step);
  dogRunning = true;
}

function updateFetch() {
  // Adjust movement for different frame rates.
  let step = min(deltaTime, 50) / 16.67;
  dogRunning = false;

  // Measure how fast the ball is being moved, for the throw.
  if (draggingBall) {
    throwVX = lerp(throwVX, (ball.x - lastBallX) / step, 0.5);
    throwVY = lerp(throwVY, (ball.y - lastBallY) / step, 0.5);
    lastBallX = ball.x;
    lastBallY = ball.y;
    return;
  }

  if (fetchState === "flying") {
    // Ball physics: gravity, walls, bounces and rolling.
    ball.vy += 0.5 * step;
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;

    if (ball.x < ballR || ball.x > width - ballR) {
      ball.x = constrain(ball.x, ballR, width - ballR);
      ball.vx *= -0.7;
    }

    if (ball.y < ballR) {
      ball.y = ballR;
      ball.vy *= -0.5;
    }

    let onGround = false;

    if (ball.y >= ballGround) {
      ball.y = ballGround;
      onGround = true;

      if (ball.vy > 1.5) {
        ball.vy *= -0.55;
        ball.vx *= 0.9;
      } else {
        ball.vy = 0;
      }

      ball.vx *= pow(0.96, step);
    }

    // The dog chases once the ball goes far enough,
    // and keeps chasing even if it bounces back.
    if (abs(ball.x - homeX) > 150) {
      dogChasing = true;
    }

    if (dogChasing) {
      moveDogToward(ball.x, step);

      let mouth = mouthPos();

      // Grab it off the floor, or catch it in the air.
      if (
        (onGround && abs(dogX - ball.x) < 70) ||
        dist(mouth.x, mouth.y, ball.x, ball.y) < 30
      ) {
        fetchState = "returning";
      }
    } else {
      moveDogToward(homeX, step);

      // A weak throw: the ball stops near the dog, so throw again.
      if (
        onGround &&
        abs(ball.vx) < 0.3 &&
        dogX === homeX
      ) {
        fetchState = "waiting";
        dogFacing = 1;
      }
    }
  } else if (fetchState === "returning") {
    moveDogToward(homeX, step);

    // Drop the ball back at home.
    if (dogX === homeX) {
      fetchCount++;
      fetchState = "waiting";
      dogFacing = 1;

      ball = { x: homeX + 100, y: ballGround, vx: 0, vy: 0 };

      // The barking gets quieter with every fetch.
      barkAudio.volume = 0.5 * (1 - fetchCount / (fetchTarget + 1));

      if (fetchCount >= fetchTarget) {
        stopBarking();
        stage = "quiet";
        quietStarted = millis();
      }
    }
  }
}

function drawFetch() {
  // Ball shadow on the floor.
  let ballHeight = ballGround - ball.y;
  let shadowSize = map(ballHeight, 0, 300, 1, 0.4, true);

  if (fetchState !== "returning") {
    noStroke();
    fill(0, 0, 0, 35);
    ellipse(ball.x, ballGround + ballR - 1, 28 * shadowSize, 7 * shadowSize);
  }

  // The dog, bouncing while it runs.
  let bob = dogRunning ? abs(sin(millis() / 90)) * 8 : 0;

  push();
  translate(dogX, fetchFloorY - bob);
  scale(dogFacing * fetchDogScale, fetchDogScale);
  translate(-250, -408);
  drawDog();
  pop();

  // The ball: in the dog's mouth, or on its own.
  if (fetchState === "returning") {
    let mouth = mouthPos();
    drawTennisBall(mouth.x, mouth.y, 12);
    return;
  }

  // A soft pulse shows the ball is ready to throw.
  if (fetchState === "waiting" && !draggingBall) {
    let pulse = (millis() % 1200) / 1200;

    noFill();
    stroke(255, 255, 255, 220 * (1 - pulse));
    strokeWeight(3);
    circle(ball.x, ball.y, ballR * 2 + pulse * 26);
    noStroke();
  }

  drawTennisBall(ball.x, ball.y, ballR);
}

function drawTennisBall(x, y, r) {
  noStroke();
  fill("#d4e83a");
  circle(x, y, r * 2);

  // White seams.
  noFill();
  stroke(255, 255, 255, 230);
  strokeWeight(max(1.5, r * 0.16));
  arc(x - r * 0.9, y, r * 1.4, r * 1.6, -HALF_PI * 0.9, HALF_PI * 0.9);
  arc(x + r * 0.9, y, r * 1.4, r * 1.6, PI - HALF_PI * 0.9, PI + HALF_PI * 0.9);
  noStroke();
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

  // Place bones between the puddles: low ones are grabbed
  // by walking past, high ones need a jump.
  x = 650;

  while (x < walkGoal - 200) {
    let nearPuddle = puddles.some((p) => abs(p.x - x) < 80);

    if (!nearPuddle) {
      bones.push({
        x: x,
        h: random([60, 165, 190]),
        gotAt: -1
      });
    }

    x += random(170, 260);
  }

  // Two squirrels pop out along the way.
  squirrelSpots = [walkGoal * 0.35, walkGoal * 0.7];

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

  // A squirrel pops out at each spot along the route.
  if (
    !squirrel &&
    squirrelSpots.length > 0 &&
    walkDistance >= squirrelSpots[0]
  ) {
    squirrelSpots.shift();
    squirrel = {
      worldX: walkDistance + 250,
      state: "peek",
      started: millis()
    };
  }

  // A scared squirrel runs off to the right.
  if (squirrel && squirrel.state === "flee") {
    squirrel.worldX += 9 * step;

    if (toScreenX(squirrel.worldX) > width + 40) {
      squirrel = null;
    }
  }

  // The dog won't walk while a squirrel is watching.
  let distracted = squirrel && squirrel.state === "peek";

  // Hold the right arrow or D to walk.
  walkingNow =
    !stunned &&
    !distracted &&
    (keyIsDown(RIGHT_ARROW) || keyIsDown(68));

  if (walkingNow) {
    // A bone gives a short burst of speed.
    let speed = millis() < boostUntil ? walkSpeed * 1.7 : walkSpeed;
    walkDistance += speed * step;
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

  // Collect a bone when it touches the dog.
  let dogBottom = groundY - jumpY;
  let dogTop = dogBottom - 248 * dogScale;

  for (let b of bones) {
    let boneY = groundY - b.h;

    if (
      b.gotAt < 0 &&
      abs(b.x - walkDistance) < 35 &&
      boneY > dogTop &&
      boneY < dogBottom
    ) {
      b.gotAt = millis();
      bonesCollected++;
      boostUntil = millis() + 1500;
    }
  }

  // The barking calms down as the park gets closer,
  // but gets loud again when a squirrel shows up.
  let progress = min(walkDistance / walkGoal, 1);
  barkAudio.volume = distracted
    ? 0.6
    : 0.5 * (1 - progress * 0.7);

  // Reaching the park ends the alarm.
  if (walkDistance >= walkGoal) {
    finishAlarm();
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

  drawWalkBones();
  drawWalkingDog();
  drawWalkSquirrel();
  drawSplash();
}

function drawWalkBones() {
  for (let b of bones) {
    let bx = toScreenX(b.x);
    if (bx < -40 || bx > width + 40) continue;

    let by = groundY - b.h + sin(millis() / 300 + b.x) * 3;

    if (b.gotAt < 0) {
      drawBone(bx, by, 1);
    } else {
      // A quick ring where the bone was grabbed.
      let t = (millis() - b.gotAt) / 350;

      if (t < 1) {
        noFill();
        stroke(255, 255, 255, 255 * (1 - t));
        strokeWeight(3);
        circle(bx, by, 20 + t * 30);
        noStroke();
      }
    }
  }
}

function drawBone(x, y, s) {
  push();
  translate(x, y);
  scale(s);
  rotate(-0.3);

  stroke("#d9cdb3");
  strokeWeight(1.5);
  fill("#f7f1e3");
  circle(-14, -4, 10);
  circle(-14, 4, 10);
  circle(14, -4, 10);
  circle(14, 4, 10);

  noStroke();
  rect(-15, -4, 30, 8, 3);

  pop();
}

function drawWalkSquirrel() {
  if (!squirrel) return;

  let sx = toScreenX(squirrel.worldX);
  let groundLine = 366;
  let rise = 0;
  let hop = 0;

  if (squirrel.state === "peek") {
    // Pop up from behind the bush.
    rise = map(millis() - squirrel.started, 0, 300, 50, 0, true);
  } else {
    // Hop away.
    hop = -abs(sin(millis() / 70)) * 12;
  }

  drawSquirrel(sx, groundLine + rise + hop);

  // The bush stays where the squirrel was hiding.
  if (squirrel.state === "peek") {
    drawBush(sx + 4, groundLine + 12);
  }
}

function drawSquirrel(x, y) {
  push();
  translate(x, y);
  scale(1.5);
  noStroke();

  // Bushy tail that flicks.
  push();
  translate(10, -6);
  rotate(sin(millis() / 120) * 0.15);
  fill("#a0612d");
  ellipse(10, -18, 24, 40);
  ellipse(16, -36, 22, 24);
  fill("#c27a3c");
  ellipse(9, -20, 12, 28);
  pop();

  // Body and belly.
  fill("#b86f33");
  ellipse(0, -12, 26, 30);
  fill("#f2d3a8");
  ellipse(-5, -10, 11, 18);

  // Head, ear, eye and nose.
  fill("#b86f33");
  circle(-8, -30, 20);
  triangle(-6, -38, -2, -47, 1, -36);
  fill("#253d37");
  circle(-12, -32, 4);
  circle(-17, -29, 3);

  // Paws.
  fill("#a0612d");
  ellipse(-6, 2, 8, 5);
  ellipse(6, 2, 8, 5);

  pop();
}

function drawBush(x, y) {
  noStroke();
  fill("#4f8f4a");
  circle(x - 18, y + 2, 30);
  circle(x + 18, y + 2, 30);
  circle(x, y - 4, 34);

  fill("#5fa35a");
  circle(x - 8, y - 8, 14);
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
  // Small bounce while walking, and excited hops
  // while a squirrel is watching.
  let bob = 0;

  if (walkingNow) {
    bob = abs(sin(millis() / 110)) * 6;
  } else if (squirrel && squirrel.state === "peek") {
    bob = abs(sin(millis() / 80)) * 10;
  }

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

function mousePressed() {
  // Click the squirrel to scare it away.
  if (
    stage === "walk" &&
    squirrel &&
    squirrel.state === "peek" &&
    dist(mouseX, mouseY, toScreenX(squirrel.worldX), 335) < 45
  ) {
    squirrel.state = "flee";
  }

  // Pick up the ball while the dog is waiting.
  if (
    stage === "fetch" &&
    fetchState === "waiting" &&
    dist(mouseX, mouseY, ball.x, ball.y) <= 30
  ) {
    draggingBall = true;
    lastBallX = ball.x;
    lastBallY = ball.y;
    throwVX = 0;
    throwVY = 0;
  }
}

function mouseDragged() {
  // Carry the ball with the mouse.
  if (draggingBall) {
    ball.x = constrain(mouseX, ballR, width - ballR);
    ball.y = constrain(mouseY, ballR, ballGround);
  }

  return false;
}

function mouseReleased() {
  if (!draggingBall) return;

  draggingBall = false;

  // Throw the ball with the speed the mouse was moving.
  let throwSpeed = createVector(throwVX, throwVY);
  throwSpeed.limit(22);

  ball.vx = throwSpeed.x;
  ball.vy = throwSpeed.y;
  fetchState = "flying";
  dogChasing = false;
}

function prepareBarkAudio() {
  barkAudio.muted = true;
  barkAudio.currentTime = 0;

  barkAudio.play().catch(() => {
    message.html(
      "Audio could not start. Check bark.wav and try again."
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
