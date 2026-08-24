(() => {
  'use strict';

  const canvas = document.querySelector('#gameCanvas');
  const ctx = canvas.getContext('2d');
  const startOverlay = document.querySelector('#startOverlay');
  const pauseOverlay = document.querySelector('#pauseOverlay');
  const resultOverlay = document.querySelector('#resultOverlay');
  const startButton = document.querySelector('#startButton');
  const resumeButton = document.querySelector('#resumeButton');
  const restartButton = document.querySelector('#restartButton');
  const audioButton = document.querySelector('#audioButton');
  const crosshair = document.querySelector('#crosshair');
  const healthBar = document.querySelector('#healthBar');
  const healthText = document.querySelector('#healthText');
  const heatBar = document.querySelector('#heatBar');
  const heatText = document.querySelector('#heatText');
  const ammoText = document.querySelector('#ammoText');
  const reserveText = document.querySelector('#reserveText');
  const ammoState = document.querySelector('#ammoState');
  const ammoRow = document.querySelector('.ammo-row');
  const timerText = document.querySelector('#timerText');
  const waveText = document.querySelector('#waveText');
  const scoreText = document.querySelector('#scoreText');
  const comboText = document.querySelector('#comboText');
  const objectiveText = document.querySelector('#objectiveText');
  const dashStatus = document.querySelector('#dashStatus');
  const resultTitle = document.querySelector('#resultTitle');
  const resultLabel = document.querySelector('#resultLabel');
  const finalScore = document.querySelector('#finalScore');
  const finalKills = document.querySelector('#finalKills');
  const finalCombo = document.querySelector('#finalCombo');
  const moveZone = document.querySelector('#moveZone');
  const aimZone = document.querySelector('#aimZone');
  const moveStick = document.querySelector('#moveStick');
  const aimStick = document.querySelector('#aimStick');
  const dashButton = document.querySelector('#dashButton');

  const GAME_LENGTH = 90;
  const TAU = Math.PI * 2;
  const keys = new Set();
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
  const touchMove = { x: 0, y: 0 };
  const touchAim = { x: 0, y: 0, firing: false };
  let width = innerWidth;
  let height = innerHeight;
  let dpr = 1;
  let animationId;
  let lastTime = 0;
  let state = 'menu';
  let elapsed = 0;
  let spawnClock = 0;
  let shotClock = 0;
  let score = 0;
  let kills = 0;
  let combo = 1;
  let maxCombo = 1;
  let comboClock = 0;
  let shake = 0;
  let flash = 0;
  let audioContext;
  let audioEnabled = false;
  let musicBus;
  let musicTimer;
  let player;
  let bullets = [];
  let enemies = [];
  let particles = [];
  let pickups = [];
  let rain = [];
  let shells = [];
  let impactMarks = [];

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!rain.length) createRain();
  }

  function createRain() {
    rain = Array.from({ length: Math.min(180, Math.floor(width / 7)) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 500 + Math.random() * 650,
      length: 8 + Math.random() * 21,
      alpha: .08 + Math.random() * .19
    }));
  }

  function resetGame() {
    elapsed = 0; spawnClock = 0; shotClock = 0; score = 0; kills = 0;
    combo = 1; maxCombo = 1; comboClock = 0; shake = 0; flash = 0;
    bullets = []; enemies = []; particles = []; pickups = []; shells = []; impactMarks = [];
    player = {
      x: width / 2, y: height / 2, radius: 14, speed: 245,
      health: 100, heat: 0, angle: 0, dash: 0, dashCooldown: 0,
      invulnerable: 0, ammo: 12, reserve: 72, reload: 0, recoil: 0, moving: 0
    };
    updateHud();
  }

  function startGame() {
    resetGame();
    if (!audioEnabled) setAudio(true);
    state = 'playing';
    document.body.classList.add('game-running');
    startOverlay.classList.remove('visible');
    resultOverlay.classList.remove('visible');
    pauseOverlay.classList.remove('visible');
    lastTime = performance.now();
    tone(90, .12, 'sawtooth', .05);
  }

  function togglePause(forceResume = false) {
    if (state === 'playing' && !forceResume) {
      state = 'paused'; pauseOverlay.classList.add('visible');
    } else if (state === 'paused') {
      state = 'playing'; pauseOverlay.classList.remove('visible'); lastTime = performance.now();
    }
  }

  function endGame(victory) {
    state = victory ? 'victory' : 'dead';
    document.body.classList.remove('game-running');
    resultLabel.textContent = victory ? 'MIDNIGHT PROTOCOL COMPLETE' : 'PROTOCOL TERMINATED';
    resultTitle.innerHTML = victory ? 'CITY<br><span>SURVIVED</span>' : 'SIGNAL<br><span>LOST</span>';
    objectiveText.textContent = victory ? 'OBJECTIVE COMPLETE // SIGNAL SECURED' : 'OPERATIVE SIGNAL LOST';
    finalScore.textContent = String(score).padStart(6, '0');
    finalKills.textContent = String(kills).padStart(2, '0');
    finalCombo.textContent = `×${maxCombo}`;
    resultOverlay.classList.add('visible');
    tone(victory ? 180 : 55, .6, victory ? 'triangle' : 'sawtooth', .07);
  }

  function spawnEnemy() {
    const margin = 60;
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = -margin; y = Math.random() * height; }
    else if (edge === 1) { x = width + margin; y = Math.random() * height; }
    else if (edge === 2) { x = Math.random() * width; y = -margin; }
    else { x = Math.random() * width; y = height + margin; }
    const wave = 1 + Math.floor(elapsed / 15);
    const roll = Math.random();
    const type = wave >= 4 && roll > .82 ? 'brute' : wave >= 2 && roll > .58 ? 'runner' : 'drone';
    const stats = type === 'brute'
      ? { radius: 24, speed: 48 + wave * 3, health: 5, damage: 24, color: '#ef1b2d', points: 500 }
      : type === 'runner'
        ? { radius: 10, speed: 125 + wave * 5, health: 1, damage: 13, color: '#ff7a57', points: 180 }
        : { radius: 15, speed: 68 + wave * 4, health: 2, damage: 17, color: '#72d3e4', points: 250 };
    enemies.push({ x, y, type, hit: 0, pulse: Math.random() * TAU, ...stats });
  }

  function shoot() {
    if (player.reload > 0 || player.heat >= 100 || shotClock > 0) return;
    if (player.ammo <= 0) { reloadWeapon(); return; }
    const spread = .008 + player.recoil * .0035 + player.moving * .012;
    const angle = getAimAngle() + (Math.random() - .5) * spread;
    player.angle = angle;
    bullets.push({
      x: player.x + Math.cos(angle) * 21,
      y: player.y + Math.sin(angle) * 21,
      vx: Math.cos(angle) * 760,
      vy: Math.sin(angle) * 760,
      life: .75,
      radius: 3, trail: []
    });
    player.ammo -= 1;
    player.recoil = Math.min(5, player.recoil + .9);
    player.heat = Math.min(100, player.heat + 8.5);
    shotClock = .13;
    shake = Math.max(shake, 4 + player.recoil * .45);
    shells.push({x:player.x-Math.sin(angle)*7,y:player.y+Math.cos(angle)*7,vx:-Math.sin(angle)*90+(Math.random()-.5)*35,vy:Math.cos(angle)*90+(Math.random()-.5)*35,life:1.15,spin:Math.random()*TAU});
    for (let i = 0; i < 4; i++) particle(player.x + Math.cos(angle) * 22, player.y + Math.sin(angle) * 22, '#ff3948', 70, .24, angle + (Math.random() - .5));
    gunshot();
    if (player.ammo === 0 && player.reserve > 0) window.setTimeout(reloadWeapon, 180);
  }

  function reloadWeapon() {
    if (!player || player.reload > 0 || player.ammo >= 12 || player.reserve <= 0 || state !== 'playing') return;
    player.reload = 1.35; shotClock = 1.35; tone(310, .055, 'square', .012);
    window.setTimeout(() => tone(190, .07, 'square', .012), 620);
  }

  function dash() {
    if (!player || player.dashCooldown > 0 || state !== 'playing') return;
    let dx = Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + touchMove.x;
    let dy = Number(keys.has('KeyS')) - Number(keys.has('KeyW')) + touchMove.y;
    const length = Math.hypot(dx, dy) || 1;
    if (length === 1 && dx === 0 && dy === 0) { dx = Math.cos(player.angle); dy = Math.sin(player.angle); }
    player.dashX = dx / length; player.dashY = dy / length;
    player.dash = .18; player.dashCooldown = 2.25; player.invulnerable = .26;
    shake = 7; tone(54, .16, 'sawtooth', .04);
  }

  function getAimAngle() {
    if (touchAim.firing && Math.hypot(touchAim.x, touchAim.y) > .1) return Math.atan2(touchAim.y, touchAim.x);
    return Math.atan2(mouse.y - player.y, mouse.x - player.x);
  }

  function particle(x, y, color, speed = 120, life = .45, angle = Math.random() * TAU) {
    particles.push({ x, y, vx: Math.cos(angle) * speed * (.35 + Math.random()), vy: Math.sin(angle) * speed * (.35 + Math.random()), life, maxLife: life, color, size: 1 + Math.random() * 3 });
  }

  function hitEnemy(enemy) {
    enemy.health -= 1; enemy.hit = .12; shake = Math.max(shake, 2);
    impactMarks.push({x:enemy.x,y:enemy.y,life:2,maxLife:2,radius:2+Math.random()*3});
    for (let i = 0; i < 8; i++) particle(enemy.x, enemy.y, enemy.color, 160, .4);
    if (enemy.health <= 0) {
      enemy.dead = true; kills += 1; combo = Math.min(9, combo + 1); maxCombo = Math.max(maxCombo, combo); comboClock = 2.3;
      score += enemy.points * combo;
      if (Math.random() < .08 && player.health < 80) pickups.push({ x: enemy.x, y: enemy.y, radius: 7, life: 8 });
      for (let i = 0; i < 18; i++) particle(enemy.x, enemy.y, enemy.color, 230, .65);
      tone(enemy.type === 'brute' ? 62 : 92, .08, 'triangle', .025);
    }
  }

  function damagePlayer(amount) {
    if (player.invulnerable > 0) return;
    player.health = Math.max(0, player.health - amount);
    player.invulnerable = .65; shake = 13; flash = .22; combo = 1; comboClock = 0;
    tone(42, .22, 'sawtooth', .055);
    if (player.health <= 0) endGame(false);
  }

  function update(dt) {
    if (state !== 'playing') return;
    elapsed += dt;
    if (elapsed >= GAME_LENGTH) { elapsed = GAME_LENGTH; endGame(true); return; }
    shotClock = Math.max(0, shotClock - dt);
    const wasReloading = player.reload > 0;
    player.reload = Math.max(0, player.reload - dt);
    if (wasReloading && player.reload === 0) {
      const loaded = Math.min(12 - player.ammo, player.reserve);
      player.ammo += loaded; player.reserve -= loaded; tone(420, .06, 'square', .012);
    }
    player.recoil = Math.max(0, player.recoil - dt * 4.2);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.heat = Math.max(0, player.heat - dt * (player.heat >= 100 ? 16 : 24));
    comboClock -= dt;
    if (comboClock <= 0 && combo > 1) combo = Math.max(1, combo - 1);
    if (combo <= 1) comboClock = 0;

    let moveX = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + touchMove.x;
    let moveY = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + touchMove.y;
    const moveLength = Math.hypot(moveX, moveY);
    player.moving = Math.min(1, moveLength);
    if (moveLength > 1) { moveX /= moveLength; moveY /= moveLength; }
    if (player.dash > 0) {
      player.dash -= dt; moveX = player.dashX * 3.4; moveY = player.dashY * 3.4;
      particle(player.x, player.y, '#62c6d7', 35, .3, Math.random() * TAU);
    }
    player.x = Math.max(24, Math.min(width - 24, player.x + moveX * player.speed * dt));
    player.y = Math.max(82, Math.min(height - 24, player.y + moveY * player.speed * dt));
    player.angle = getAimAngle();
    if (mouse.down || touchAim.firing) shoot();

    const wave = 1 + Math.floor(elapsed / 15);
    const spawnDelay = Math.max(.17, .82 - wave * .075);
    spawnClock -= dt;
    if (spawnClock <= 0 && enemies.length < 70) { spawnEnemy(); spawnClock = spawnDelay * (.7 + Math.random() * .65); }

    bullets.forEach((bullet) => { bullet.trail.push({x:bullet.x,y:bullet.y,life:.09}); if(bullet.trail.length>4)bullet.trail.shift(); bullet.trail.forEach(point=>point.life-=dt); bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt; });
    bullets = bullets.filter((bullet) => bullet.life > 0 && bullet.x > -20 && bullet.x < width + 20 && bullet.y > -20 && bullet.y < height + 20);

    enemies.forEach((enemy, enemyIndex) => {
      enemy.hit = Math.max(0, enemy.hit - dt); enemy.pulse += dt * 3;
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      let steerX=Math.cos(angle),steerY=Math.sin(angle);
      enemies.forEach((other,otherIndex)=>{if(enemyIndex===otherIndex)return;const dx=enemy.x-other.x,dy=enemy.y-other.y,d=Math.hypot(dx,dy);if(d>0&&d<enemy.radius+other.radius+18){steerX+=dx/d*.72;steerY+=dy/d*.72}});
      const steerLength=Math.hypot(steerX,steerY)||1;
      enemy.x += steerX/steerLength * enemy.speed * dt; enemy.y += steerY/steerLength * enemy.speed * dt;
      if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + enemy.radius) {
        damagePlayer(enemy.damage); enemy.dead = true;
        for (let i = 0; i < 12; i++) particle(enemy.x, enemy.y, enemy.color, 190, .5);
      }
    });

    bullets.forEach((bullet) => {
      enemies.forEach((enemy) => {
        if (!bullet.dead && !enemy.dead && Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < bullet.radius + enemy.radius) {
          bullet.dead = true; hitEnemy(enemy);
        }
      });
    });
    bullets = bullets.filter((bullet) => !bullet.dead);
    enemies = enemies.filter((enemy) => !enemy.dead);

    pickups.forEach((pickup) => {
      pickup.life -= dt; pickup.pulse = (pickup.pulse || 0) + dt;
      if (Math.hypot(player.x - pickup.x, player.y - pickup.y) < player.radius + 15) {
        player.health = Math.min(100, player.health + 22); pickup.dead = true; tone(260, .2, 'sine', .035);
      }
    });
    pickups = pickups.filter((pickup) => pickup.life > 0 && !pickup.dead);
    particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt; });
    particles = particles.filter((p) => p.life > 0);
    shells.forEach((shell)=>{shell.x+=shell.vx*dt;shell.y+=shell.vy*dt;shell.vx*=.95;shell.vy*=.95;shell.spin+=dt*12;shell.life-=dt});
    shells=shells.filter((shell)=>shell.life>0);
    impactMarks.forEach((mark)=>mark.life-=dt); impactMarks=impactMarks.filter((mark)=>mark.life>0);
    rain.forEach((drop) => { drop.y += drop.speed * dt; drop.x -= drop.speed * .14 * dt; if (drop.y > height + 30) { drop.y = -30; drop.x = Math.random() * width; } });
    shake = Math.max(0, shake - dt * 24); flash = Math.max(0, flash - dt);
    updateHud();
  }

  function updateHud() {
    if (!player) return;
    healthBar.style.width = `${player.health}%`;
    healthText.textContent = Math.ceil(player.health);
    heatBar.style.width = `${player.heat}%`;
    heatText.textContent = `${Math.ceil(player.heat)}%`;
    ammoText.textContent = String(player.ammo).padStart(2,'0');
    reserveText.textContent = String(player.reserve).padStart(2,'0');
    ammoState.textContent = player.reload > 0 ? `RELOAD ${player.reload.toFixed(1)}` : player.ammo === 0 ? 'EMPTY' : 'READY';
    ammoRow.classList.toggle('reloading', player.reload > 0);
    const remaining = Math.max(0, Math.ceil(GAME_LENGTH - elapsed));
    timerText.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
    waveText.textContent = `WAVE ${String(1 + Math.floor(elapsed / 15)).padStart(2, '0')}`;
    scoreText.textContent = String(score).padStart(6, '0');
    comboText.textContent = `×${combo}`;
    const dashRatio = Math.min(1, 1 - player.dashCooldown / 2.25);
    dashStatus.classList.toggle('cooling', player.dashCooldown > 0);
    dashStatus.querySelector('i').style.transform = `scaleX(${dashRatio})`;
  }

  function drawGrid() {
    ctx.fillStyle = '#05090b'; ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width*.52,height*.46,0,width*.52,height*.46,width*.72);
    glow.addColorStop(0,'rgba(27,65,72,.34)');glow.addColorStop(.52,'rgba(8,18,22,.13)');glow.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    ctx.fillStyle='rgba(2,4,5,.72)';ctx.fillRect(0,0,width*.13,height);ctx.fillRect(width*.87,0,width*.13,height);
    ctx.strokeStyle='rgba(118,171,180,.08)';ctx.lineWidth=1;
    const size=72,offsetX=(elapsed*2)%size,offsetY=(elapsed*7)%size;
    for(let x=-size+offsetX;x<width+size;x+=size){ctx.beginPath();ctx.moveTo(width/2+(x-width/2)*.42,0);ctx.lineTo(x,height);ctx.stroke()}
    for(let y=-size+offsetY;y<height+size;y+=size){const perspective=.28+.72*y/height;ctx.beginPath();ctx.moveTo(width*(.5-.5*perspective),y);ctx.lineTo(width*(.5+.5*perspective),y);ctx.stroke()}
    ctx.strokeStyle='rgba(239,27,45,.18)';ctx.setLineDash([22,34]);ctx.beginPath();ctx.moveTo(width*.5,82);ctx.lineTo(width*.5,height);ctx.stroke();ctx.setLineDash([]);
    for(let i=0;i<7;i++){const x=(i*237+91)%width,y=(i*149+elapsed*12)%height;const reflection=ctx.createLinearGradient(x,y,x,y+90);reflection.addColorStop(0,i%2?'rgba(97,190,208,.11)':'rgba(239,27,45,.1)');reflection.addColorStop(1,'transparent');ctx.fillStyle=reflection;ctx.fillRect(x-18,y,36,90)}
  }

  function drawPlayer() {
    const walk = Math.sin(elapsed * 13) * player.moving;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 20) % 2) ctx.globalAlpha = .32;

    // 바닥 그림자
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.ellipse(-4, 8, 25, 14, 0, 0, TAU); ctx.fill();

    if (player.dash > 0) {
      ctx.strokeStyle = 'rgba(97,190,208,.32)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-15, -9); ctx.lineTo(-48, -9); ctx.moveTo(-15, 9); ctx.lineTo(-48, 9); ctx.stroke();
    }

    ctx.shadowColor = '#61bed0'; ctx.shadowBlur = player.dash > 0 ? 30 : 5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // 걷는 다리와 부츠
    ctx.strokeStyle = '#111719'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-18 - walk * 3, -8); ctx.moveTo(-8, 5); ctx.lineTo(-18 + walk * 3, 9); ctx.stroke();
    ctx.strokeStyle = '#39464a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-17 - walk * 3, -8); ctx.lineTo(-22 - walk * 3, -8); ctx.moveTo(-17 + walk * 3, 9); ctx.lineTo(-22 + walk * 3, 9); ctx.stroke();

    // 코트와 몸통
    const coat = ctx.createLinearGradient(-13, -12, 12, 12);
    coat.addColorStop(0, '#263236'); coat.addColorStop(1, '#0c1113');
    ctx.fillStyle = coat; ctx.strokeStyle = '#60777d'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(10, -11); ctx.lineTo(13, 0); ctx.lineTo(9, 11); ctx.lineTo(-12, 9); ctx.lineTo(-15, 0); ctx.lineTo(-12, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(239,27,45,.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();

    // 머리와 머리카락
    ctx.fillStyle = '#c89b80'; ctx.strokeStyle = '#15191a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(5, 0, 7, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111415';
    ctx.beginPath(); ctx.arc(3, 0, 6.6, Math.PI * .55, Math.PI * 1.45); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill();

    // 총을 잡은 양팔
    ctx.strokeStyle = '#29383c'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(15, -5); ctx.lineTo(21, -3); ctx.moveTo(4, 9); ctx.lineTo(14, 6); ctx.lineTo(20, 3); ctx.stroke();
    ctx.fillStyle = '#c89b80';
    ctx.beginPath(); ctx.arc(21, -3, 2.8, 0, TAU); ctx.arc(20, 3, 2.8, 0, TAU); ctx.fill();

    // 권총
    ctx.shadowBlur = 0; ctx.fillStyle = '#080b0c'; ctx.strokeStyle = '#9ba6a7'; ctx.lineWidth = 1;
    ctx.fillRect(18, -3, 17, 6); ctx.strokeRect(18, -3, 17, 6);
    ctx.fillStyle = '#171d1f'; ctx.fillRect(20, 2, 6, 8);
    ctx.fillStyle = '#ef1b2d'; ctx.fillRect(31, -1, 6, 2);

    ctx.restore();
  }

  function drawEnemy(enemy) {
    ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(Math.atan2(player.y - enemy.y, player.x - enemy.x));
    ctx.shadowColor = enemy.color; ctx.shadowBlur = enemy.hit > 0 ? 22 : 8; ctx.strokeStyle = enemy.color; ctx.lineWidth = enemy.hit > 0 ? 3 : 1.2; ctx.fillStyle = enemy.hit > 0 ? '#fff' : '#091012';
    if (enemy.type === 'brute') { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const x = Math.cos(a) * enemy.radius; const y = Math.sin(a) * enemy.radius; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
    else if (enemy.type === 'runner') { ctx.beginPath(); ctx.moveTo(enemy.radius + 5, 0); ctx.lineTo(-enemy.radius, -enemy.radius); ctx.lineTo(-enemy.radius * .4, 0); ctx.lineTo(-enemy.radius, enemy.radius); ctx.closePath(); }
    else { ctx.beginPath(); ctx.rect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = enemy.color; ctx.globalAlpha = .7 + Math.sin(enemy.pulse) * .25; ctx.fillRect(1, -2, enemy.radius * .8, 4);
    ctx.restore();
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawGrid();
    rain.forEach((drop) => { ctx.strokeStyle = `rgba(127,199,211,${drop.alpha})`; ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x - drop.length * .14, drop.y + drop.length); ctx.stroke(); });
    pickups.forEach((pickup) => { const pulse = 1 + Math.sin(pickup.pulse * 6) * .18; ctx.save(); ctx.translate(pickup.x, pickup.y); ctx.rotate(pickup.pulse); ctx.strokeStyle = '#74e4c3'; ctx.shadowColor = '#74e4c3'; ctx.shadowBlur = 13; ctx.strokeRect(-7 * pulse, -7 * pulse, 14 * pulse, 14 * pulse); ctx.restore(); });
    impactMarks.forEach((mark)=>{ctx.globalAlpha=Math.min(1,mark.life/mark.maxLife);ctx.strokeStyle='#b6c1c1';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mark.x,mark.y,mark.radius,0,TAU);ctx.stroke();ctx.globalAlpha=1});
    bullets.forEach((bullet) => { bullet.trail.forEach((point,index)=>{ctx.globalAlpha=(index+1)/bullet.trail.length*.28;ctx.fillStyle='#ffd5b1';ctx.fillRect(point.x,point.y,2,2)});ctx.globalAlpha=1;ctx.strokeStyle = '#ffd6bd'; ctx.shadowColor = '#ef1b2d'; ctx.shadowBlur = 12; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bullet.x, bullet.y); ctx.lineTo(bullet.x - bullet.vx * .022, bullet.y - bullet.vy * .022); ctx.stroke(); });
    shells.forEach((shell)=>{ctx.save();ctx.translate(shell.x,shell.y);ctx.rotate(shell.spin);ctx.globalAlpha=Math.min(1,shell.life*2);ctx.fillStyle='#c0a05c';ctx.fillRect(-2,-1,5,2);ctx.restore()});
    enemies.forEach(drawEnemy);
    particles.forEach((p) => { ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); ctx.globalAlpha = 1; });
    if (player) drawPlayer();
    ctx.restore();
    if (flash > 0) { ctx.fillStyle = `rgba(239,27,45,${flash * .55})`; ctx.fillRect(0, 0, width, height); }
  }

  function frame(time) {
    const dt = Math.min(.034, (time - lastTime) / 1000 || 0);
    lastTime = time;
    update(dt); draw();
    animationId = requestAnimationFrame(frame);
  }

  function tone(frequency, duration, type = 'sine', volume = .03) {
    if (!audioEnabled) return;
    ensureAudio();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  }

  function ensureAudio() {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function gunshot() {
    if (!audioEnabled) return;
    ensureAudio();
    const now=audioContext.currentTime,buffer=audioContext.createBuffer(1,Math.floor(audioContext.sampleRate*.11),audioContext.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2.7);
    const noise=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();noise.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(1100,now);gain.gain.setValueAtTime(.11,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.11);noise.connect(filter).connect(gain).connect(audioContext.destination);noise.start(now);
    tone(76+Math.random()*9,.12,'sawtooth',.035);
  }

  function noirPulse() {
    if(!audioEnabled||!musicBus)return;
    const now=audioContext.currentTime,root=[43.65,49,55,41.2][Math.floor(elapsed/12)%4];
    [[root,0,.035,4.6],[root*1.5,.65,.012,2.6],[root*2,2.35,.008,1.8]].forEach(([frequency,delay,volume,duration])=>{
      const osc=audioContext.createOscillator(),gain=audioContext.createGain(),filter=audioContext.createBiquadFilter();osc.type='triangle';osc.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=480;gain.gain.setValueAtTime(.0001,now+delay);gain.gain.exponentialRampToValueAtTime(volume,now+delay+.18);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);osc.connect(filter).connect(gain).connect(musicBus);osc.start(now+delay);osc.stop(now+delay+duration+.1)
    });
  }

  function setAudio(enabled) {
    audioEnabled=enabled;audioButton.setAttribute('aria-pressed',String(enabled));audioButton.textContent=`Audio // ${enabled?'on':'off'}`;
    if(enabled){ensureAudio();musicBus||=audioContext.createGain();if(!musicBus._connected){musicBus.gain.value=.75;musicBus.connect(audioContext.destination);musicBus._connected=true}musicBus.gain.setTargetAtTime(.75,audioContext.currentTime,.12);clearInterval(musicTimer);noirPulse();musicTimer=setInterval(noirPulse,4100)}
    else{clearInterval(musicTimer);if(musicBus)musicBus.gain.setTargetAtTime(.0001,audioContext.currentTime,.12)}
  }

  function bindStick(zone, stick, target, isAim) {
    let pointerId = null;
    const updateStick = (event) => {
      const rect = zone.getBoundingClientRect();
      let x = event.clientX - (rect.left + rect.width / 2);
      let y = event.clientY - (rect.top + rect.height / 2);
      const max = rect.width * .32; const length = Math.hypot(x, y);
      if (length > max) { x = x / length * max; y = y / length * max; }
      stick.style.transform = `translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
      target.x = x / max; target.y = y / max; if (isAim) target.firing = length > 8;
    };
    zone.addEventListener('pointerdown', (event) => { pointerId = event.pointerId; zone.setPointerCapture(pointerId); updateStick(event); });
    zone.addEventListener('pointermove', (event) => { if (event.pointerId === pointerId) updateStick(event); });
    const release = (event) => { if (event.pointerId !== pointerId) return; pointerId = null; target.x = 0; target.y = 0; if (isAim) target.firing = false; stick.style.transform = 'translate(-50%,-50%)'; };
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (event.code === 'Space') { event.preventDefault(); dash(); }
    if (event.code === 'KeyR') reloadWeapon();
    if (event.code === 'Escape') togglePause();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  canvas.addEventListener('pointermove', (event) => { mouse.x = event.clientX; mouse.y = event.clientY; crosshair.style.left = `${event.clientX}px`; crosshair.style.top = `${event.clientY}px`; });
  canvas.addEventListener('pointerdown', (event) => { if (event.pointerType === 'mouse') mouse.down = true; });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  window.addEventListener('blur', () => { if (state === 'playing') togglePause(); });
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  resumeButton.addEventListener('click', () => togglePause(true));
  dashButton.addEventListener('pointerdown', (event) => { event.preventDefault(); dash(); });
  audioButton.addEventListener('click', () => { setAudio(!audioEnabled); tone(140, .12, 'sine', .04); });
  bindStick(moveZone, moveStick, touchMove, false);
  bindStick(aimZone, aimStick, touchAim, true);
  resize(); resetGame();
  cancelAnimationFrame(animationId); animationId = requestAnimationFrame(frame);
})();
