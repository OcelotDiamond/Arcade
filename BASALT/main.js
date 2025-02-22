const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let displayMult;

let keys = {};

let rocksDestroyed = 0;
let gemsDestroyed = 0;
let bombsDestroyed = 0;

let playTime = 0;

let maxDepth = 0;

function keyDown(event) {
    keys[event.key.toLowerCase()] = true;
}

function keyUp(event) {
    if (typeof(keys[event.key.toLowerCase()]) !== 'undefined') {
        delete keys[event.key.toLowerCase()];
    }
}

function onBlur(event) {
    keys = {};
}

window.onkeydown = keyDown;
window.onkeyup = keyUp;

window.onblur = onBlur;

function drawRect(ctx, x, y, w, h) {
    ctx.fillRect(x*displayMult, y*displayMult, w*displayMult, h*displayMult);
}

function drawPoly(ctx, offX, offY, points) {
    ctx.beginPath();
    ctx.moveTo(
        (points[0][0] + offX)*displayMult,
        (points[0][1] + offY)*displayMult);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(
            (points[i][0]+offX)*displayMult,
            (points[i][1]+offY)*displayMult);
    }
    ctx.closePath();
    ctx.fill();
}

function setColor(ctx, index) {
    ctx.fillStyle = COLORS[index];
    if (currentShader === 1) {
        ctx.shadowBlur = displayMult * 2;
        ctx.shadowColor = COLORS[index];
    } else {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'rgba(0,0,0,0)';
    }
}

function drawText(ctx, x, y, str, size, bold = false) {
    ctx.font = `${bold?'bold ':''}${size * displayMult}px 'Trebuchet MS'`;
    ctx.fillText(str, x * displayMult, y * displayMult);
}

function getTextSize(ctx, str, size, bold = false) { // Returns a TextMetrics obj
    ctx.font = `${bold?'bold ':''}${size}px 'Trebuchet MS'`;
    return ctx.measureText(str);
}

const sequence = [
    0, 0, 1, 1, 2, 3, 2, 3, 5, 4, 6
];

const maps = [
    [
        'rrr   ',
        'rgrrrr',
        'rrbrsr',
        'r srgr',
        '   rr '
    ], [
        'rrr   ',
        'rrrrrr',
        'ssbssr',
        'rrgrrr',
        '  gr r'
    ], [
        'rrrrr ',
        's b sr',
        'grr rr',
        'rs b s',
        '  rrrg'
    ], [
        '   rrr',
        'rrrrrb',
        'rsbsrr',
        'rgsgrr',
        ' rgrr '
    ], [
        'r   rr',
        'rrrr b',
        '  rrrs',
        'g  rrg',
        '  rrrr'
    ], [
        '  rrr ',
        'rrrsbr',
        ' sbss ',
        'rgssr ',
        '  rgrr'
    ], [
        '   rrr',
        'rrrssb',
        'rr br ',
        'rrsggr',
        'r rg r'
    ], [
        'rr  rr',
        'ssrrrs',
        ' rrb r',
        '  rrgr',
        'grr  r'
    ]
];

let COLORS;

window.onresize = () => {
    if (currentShader === 2) {
        displayMult = 1.5;

        canvas.width = 192;
        canvas.height = 192;

        const trueMult = Math.floor(Math.min(window.innerWidth, window.innerHeight) / 128);

        canvas.style.width = `${128 * trueMult}px`;
        canvas.style.height = `${128 * trueMult}px`;
        return;
    }

    displayMult = Math.floor(Math.min(window.innerWidth, window.innerHeight) / 128);

    canvas.width = 128 * displayMult;
    canvas.height = 128 * displayMult;
}

let highScore = parseInt(localStorage.getItem('BASALT.variables.highScore'));

if (isNaN(highScore) || highScore === null) {
    highScore = parseInt(localStorage.getItem('highScore'));

    if (isNaN(highScore) || highScore === null) {
        highScore = -1;
    } else {
        localStorage.setItem('BASALT.variables.highScore', highScore.toFixed(0));
        localStorage.removeItem('highScore');
    }
}

if (highScore > 10000) {
    localStorage.setItem('BASALT.variables.codeCompleted', 1);
}

const pWidth = 10;
const pHeight = 10;

const maxFallSpeed = 10;

let xPos = (128 - pWidth)/2;
let yPos = 0;

let dX = 0;
let dY = 10;

let isDead = false;
let deathTimer = 0;

let globalOpacity = 1;

let tiles = []; // For debugging, no gameplay use

const hitBombs = [];

const maxBombTime = 50; // Change later?

function doPlayerLogic() {
    let xKey = false;
    
    if (isDead) {
        deathTimer++;
        dY -= 0.01;
        dY = Math.max(dY, -1);
        
        yPos += dY;
        return;
    }
    
    if (keys.arrowleft || keys.a) {
        dX -= 0.3;
        dX = Math.max(dX, -2);
        xKey = true;
    }
    if (keys.arrowright || keys.d) {
        dX += 0.3;
        dX = Math.min(dX, 2);
        xKey = true;
    }
    if (!xKey) {
        dX /= 1.3
        if (0.05 > Math.abs(dX)) {
            dX = 0;
        } else {
            dX -= 0.05 * Math.sign(dX);
        }
    }
    dY += 0.1; // Gravity
    
    dY = Math.min(dY, maxFallSpeed); // Max fall speed
    
    // Break things
    if (dY > 0 && Math.floor((yPos+pHeight-mapHeight)/16+1) >= 0) {
        for (let i = Math.floor((xPos-16)/16); i <= Math.min(Math.floor((xPos-16+pWidth)/16), 5); i++) {
            const tileY = Math.floor((yPos+pHeight-mapHeight)/16+1);
            const tile = map[tileY][i];
            
            const centerBool = i !== Math.min(Math.floor((xPos-16+pWidth)/16), 5) && 
                (map[tileY][i+1] === 1 || map[tileY][i+1] === 2 || map[tileY][i+1] === 3) &&
                ((xPos+pWidth*0.5)/16)%1 < 0.5;
            
            if (tile !== 0 && tile !== 4 && dY > 0 && !centerBool) {
                if (tile === 1 || tile === 2 || tile === 3) {
                    let preexistingBomb = -1;
                    if (tile === 1) {
                        rocksDestroyed++;
                    }
                    if (tile === 3) {
                        gemsDestroyed++;
                    }
                    if (tile === 2) { // ISA BOMB *o*
                        for (let j = 0; j < hitBombs.length; j++) {
                            if (hitBombs[j][1] === tileY) {
                                preexistingBomb = j;
                            }
                        }
                        
                        if (preexistingBomb === -1) {
                            hitBombs.push([i, tileY, maxBombTime]);
                        } else {
                            explodeBomb(preexistingBomb)
                            hitBombs.splice(preexistingBomb, 1);
                        }
                    } else {
                        for (let j = 0; j < 5; j++) {
                            const xRandomFactor = 16*Math.random() - 8
                            particles.push([
                                i*16+24 + xRandomFactor,
                                tileY*16+mapHeight+43+16*Math.random(), // 43 = 51 - 8
                                0, 0,
                                Math.random() * Math.sign(xRandomFactor),
                                0.5 * (Math.random() - 0.5) + dY/16,
                                Math.random() * Math.PI * 2,
                                (Math.random() - 0.5) * 0.1,
                                Math.random() > 0.5 && map[tileY][i] === 3 ? 2 : 1,
                                false
                            ]);
                        }

                        updateBreakingAchievements();

                        map[tileY][i] = 0;
                    }
                    if (preexistingBomb === -1) {
                        if (keys.arrowup || keys.w) {
                            dY = -2.6;
                        } else {
                            dY = -1.5;
                        }
                    } else {
                        if (keys.arrowup || keys.w) {
                            dY = -4.5;
                        } else {
                            dY = -3.6;
                        }
                    }
                    yPos = tileY*16-16-pHeight+mapHeight;
                }
            }
        }
    }
    
    for (let x = Math.floor((xPos-16)/16); x <= Math.min(Math.floor((xPos-16+pWidth)/16), 5); x++) {
        for (let y = Math.floor((yPos-mapHeight)/16)+1; y <= Math.floor((yPos+pHeight-mapHeight)/16)+1; y++) {
            if (y < 0 || y >= mapMaxLength || x < 0 || x >= 6) {
                continue;
            }
            if (map[y][x] === 4) {
                const differenceX = (x*16 + 16 + 8) - (xPos + pWidth*0.5);
                const differenceY = (y*16 + mapHeight - 16 + 8) - (yPos + pHeight*0.5);
                const sqCombinedRadius = 0.25*pWidth*pWidth+5*pWidth+25; // (pWidth/2+5)^2
                if (differenceX*differenceX + differenceY*differenceY < sqCombinedRadius) { // Circle colliders
                    isDead = true;
                    let prevValue = localStorage.getItem('BASALT.data.time_played');
                    if (!prevValue) {
                        prevValue = 0;
                    } else {
                        prevValue = parseInt(prevValue);
                    }

                    localStorage.setItem('BASALT.data.time_played', prevValue + Date.now() - lastPlaytimeMarker);
                    for (let i = 0; i < 12; i++) {
                        const xRandomFactor = Math.random() * pWidth;
                        particles.push([
                            xPos + xRandomFactor,
                            yPos + Math.random() * pHeight + 64, // 43 = 51 - 8
                            0, 0,
                            Math.random() * Math.sign(xRandomFactor - pWidth * 0.5),
                            (Math.random() - 1) * 1.5,
                            Math.random() * Math.PI * 2,
                            (Math.random() - 0.5) * 0.1,
                            2, true
                        ]);
                    }
                    
                    dY = 0;
                    
                    playTime = Date.now() - playTime;
                    
                    for (let i = Math.floor((yPos - mapHeight- 64)/16); i >= 0; i--) {
                        for (let j = 0; j < 6; j++) {
                            map[i][j] = 0;
                        }
                    }

                    const currentScore = rocksDestroyed * 2 + gemsDestroyed * 50;
                    if (currentScore > highScore) {
                        highScore = currentScore;
                        if (highScore > 10000) {
                            localStorage.setItem('BASALT.variables.codeCompleted', 1);
                        }
                        localStorage.setItem('BASALT.variables.highScore', highScore.toFixed(0));
                    }

                    break;
                }
            }
        }
    }
    
    if (dY < 0) {
        for (let i = Math.floor((xPos-16)/16); i <= Math.min(Math.floor((xPos-16+pWidth)/16), 5); i++) {
            const tileY = Math.floor((yPos-mapHeight)/16+1)-1;
            if (tileY < 0) {
                break;
            }
            if ((map[tileY][i] === 1 || map[tileY][i] === 2 || map[tileY][i] === 3)
                && Math.floor(yPos/16) !== Math.floor((yPos+dY)/16)) {
                dY *= 0.25;
                yPos = (tileY) * 16 + 1.01 + mapHeight;
            }
        }
    }
    
    if (dX < 0 && Math.floor((xPos)/16-1) >= 0) {
        for (let y = Math.floor((yPos-mapHeight)/16)+1; y <= Math.floor((yPos+pHeight-mapHeight)/16)+1; y++) {
            if (y < 0 || y >= mapMaxLength) {
                continue;
            }
            const tileX = Math.floor((xPos)/16-1)-1;
            if ((map[y][tileX] === 1 || map[y][tileX] === 2 || map[y][tileX] === 3)
                && Math.floor(xPos/16) !== Math.floor((xPos+dX)/16)) {
                dX = 0;
                xPos = Math.floor(xPos/16)*16;
            }
        }
    } else if (dX > 0 && Math.floor((xPos+pWidth)/16-1) <= 5) {
        for (let y = Math.floor((yPos-mapHeight)/16)+1; y <= Math.floor((yPos+pHeight-mapHeight)/16)+1; y++) {
            if (y < 0 || y >= mapMaxLength) {
                continue;
            }
            const tileX = Math.floor((xPos+pWidth)/16-1)+1;
            if ((map[y][tileX] === 1 || map[y][tileX] === 2 || map[y][tileX] === 3)
                && Math.floor((xPos+pWidth)/16) !== Math.floor((xPos+pWidth+dX)/16)) {
                dX = 0;
                xPos = Math.ceil((xPos)/16)*16-pWidth-0.01; // -0.01 or else blocks break b/c of collision
            }
        }
    }
    
    xPos += dX;
    yPos += dY;
    
    if (maxDepth < yPos) {
        maxDepth = yPos;

        let depthAchievement = localStorage.getItem('BASALT.achievements.depth');

        if (!depthAchievement) {
            depthAchievement = 0;
        } else {
            depthAchievement = parseInt(depthAchievement);
        }

        const transformedDepth = Math.round(maxDepth / 10 - 48);

        if (transformedDepth > depthAchievement) {
            localStorage.setItem('BASALT.achievements.depth', transformedDepth);
        }
    }
    
    if (xPos > 128 - 16 - pWidth) {
        dX = 0;
        xPos = 128 - 16 - pWidth;
    } else if (xPos < 16) {
        dX = 0;
        xPos = 16;
    }
}

function updateBreakingAchievements() { // This function is awful and should be fixed later
    let rocksAchievement = localStorage.getItem('BASALT.achievements.rocks');
    let gemsAchievement = localStorage.getItem('BASALT.achievements.gems');
    let bombsAchievement = localStorage.getItem('BASALT.achievements.bombs');
    let pointsAchievement = localStorage.getItem('BASALT.achievements.points');

    if (!rocksAchievement) {
        rocksAchievement = 0;
    } else {
        rocksAchievement = parseInt(rocksAchievement);
    }

    if (!gemsAchievement) {
        gemsAchievement = 0;
    } else {
        gemsAchievement = parseInt(gemsAchievement);
    }

    if (!bombsAchievement) {
        bombsAchievement = 0;
    } else {
        bombsAchievement = parseInt(bombsAchievement);
    }

    if (!pointsAchievement) {
        pointsAchievement = 0;
    } else {
        pointsAchievement = parseInt(pointsAchievement);
    }

    if (rocksDestroyed > rocksAchievement) {
        localStorage.setItem('BASALT.achievements.rocks', rocksDestroyed);
    }

    if (gemsDestroyed > gemsAchievement) {
        localStorage.setItem('BASALT.achievements.gems', gemsDestroyed);
    }

    if (bombsDestroyed > bombsAchievement) {
        localStorage.setItem('BASALT.achievements.bombs', bombsDestroyed);
    }

    if (rocksDestroyed * 20 + gemsDestroyed * 500 > pointsAchievement) {
        localStorage.setItem('BASALT.achievements.points', rocksDestroyed * 20 + gemsDestroyed * 500);
    }
}

let layerCounter = -2;
const map = [];
let mapHeight = 0; // Height of the top of the map data
const mapMaxLength = 128;

const preGenFloorCount = 16;

mapHeight = 0;

function genNextLayer() {
    const deleteCount = map.length + 5;
    for (let i = mapMaxLength; i < deleteCount; i++) {
        map.shift();
    }
    if (layerCounter < 0) {
        const mapNum = Math.floor(Math.random()*maps.length);
        const forwards = Math.random() < 0.5;
        for (let i = 0; i < 5; i++) {
            const subArray = [];
            for (let j=forwards?0:5;forwards?j<6:j>=0;forwards?j++:j--) { // To loop backwards if forwards is false
                switch (maps[mapNum][i].charAt(j)) {
                    case ' ':
                        subArray.push(0);
                        break;
                    case 'r':
                        subArray.push(1);
                        break;
                    case 'b':
                        subArray.push(2);
                        break;
                    case 's':
                        subArray.push(4);
                        break;
                    case 'g':
                        subArray.push(3);
                        break;
                    default:
                        throw new Error('Undefined tile!');
                }
            }
            map.push(subArray);
        }
    } else {
        for (let i = 0; i < 5; i++) {
            map.push([0,0,0,0,0,0]);
        }
    }
    if (layerCounter >= Math.round(Math.random())) {
        layerCounter = Math.round(-4 + Math.random());
    }
    layerCounter++;
    
    mapHeight += 16 * 5;
    
    for (let i = 0; i < hitBombs.length; i++) {
        if (hitBombs[i][1] < 5) {
            hitBombs.splice(i, 1);
            i--;
            continue;
        }
        
        hitBombs[i][1] -= 5;
    }
}

function explodeBomb(index) {
    const bombX = hitBombs[index][0];
    const bombY = hitBombs[index][1];
    
    bombsDestroyed++;
    
    for (let y = -2; y < 3; y++) {
        for (let x = Math.abs(y) - 2; x < 3 - Math.abs(y); x++) {
            if (bombY + y >= 0 && bombX + x >= 0) {
                const tileType = map[bombY + y][bombX + x];
                map[bombY + y][bombX + x] = 0;
                if (tileType === 1 || tileType === 3 || tileType === 4) {
                    for (let i = 0; i < (tileType !== 4 ? 3 : 2); i++) {
                        const particleX = (bombX + x)*16+24 + 16*Math.random() - 8;
                        const particleY = (bombY + y)*16+mapHeight+43+16*Math.random();
                        const differenceX = particleX - (bombX*16+24);
                        const differenceY = particleY - (bombY*16+mapHeight+51);
                        const magnitude = Math.sqrt(differenceX * differenceX + differenceY * differenceY);
                        const scaling = (2 - Math.random()) * 0.5;
                        particles.push([
                            particleX,
                            particleY,
                            0, 0,
                            differenceX/(magnitude * magnitude) * 32 * scaling, // Normalize and divide w/ scaling
                            differenceY/(magnitude * magnitude) * 32 * scaling + 0.5,
                            Math.random() * Math.PI * 2,
                            (Math.random() - 0.5) * 0.1,
                            Math.random() > 0.5 && tileType === 3 ? 2 : 1,
                            false
                        ]);
                    }
                    if (tileType === 1) {
                        rocksDestroyed++;
                    }
                    if (tileType === 3) {
                        gemsDestroyed++;
                    }
                }
            }
        }
    }

    updateBreakingAchievements();

    // idk why it's +51, I just plugged in random numbers until it looked right
    particles.push([bombX*16+24, bombY*16+mapHeight+51, 60, 1]);
}

const particles = []; // Stored as [x, y, age, type, other data]

const particleDrawFunctions = [
    drawBrickBreak,
    drawBombShockwave
];

function drawParticles(ctx) {
    for (let i = 0; i < particles.length; i++) {
        const remove = particleDrawFunctions[particles[i][3]](particles[i], ctx);
        if (remove) {
            particles.splice(i, 1);
            i--;
        }
    }
}

// Stored as [x, y, age, type, dx, dy, rotation, dRotation, color, special]
function drawBrickBreak(particle, ctx) {
    let arr = [];
    if (particle[8] !== 2) {
        for (let i = 0; i < 4; i++) {
            arr.push([
                Math.cos(i*Math.PI*0.5 + particle[6]) * 3,
                Math.sin(i*Math.PI*0.5 + particle[6]) * 3
            ])
        }
    } else {
        for (let i = 0; i < 3; i++) {
            arr.push([
                Math.cos(i*Math.PI*2/3 + particle[6]) * 3,
                Math.sin(i*Math.PI*2/3 + particle[6]) * 3
            ])
        }
    }
    
    setColor(ctx, particle[9] ? 3 : particle[8]);
    drawPoly(ctx, particle[0], particle[1] - yPos, arr);
    
    if ((!isDead || particle[9]) && !paused) {
        particle[0] += particle[4];
        particle[1] += particle[5];
        particle[6] += particle[7];
        particle[5] += 0.1; // Gravity
        
        particle[2]++;
    }
    
    return particle[0] < 12 || particle[0] > 116 || particle[1] - 16 > mapMaxLength * 16 + mapHeight || particle[2] > 5e+3;
}

function drawBombShockwave(particle, ctx) { // This function is cursed and I hate it
    const timing = 1 - Math.pow(particle[2]/60, 3);
    let arr = [];
    for (let i = 0; i < 8; i++) {
        arr.push([
            Math.cos(i*Math.PI*0.25) * (7 + timing * 32),
            Math.sin(i*Math.PI*0.25) * (7 + timing * 32)
        ])
    }
    ctx.globalAlpha = (1 - timing) * globalOpacity;
    setColor(ctx, 1);
    drawPoly(ctx, particle[0], particle[1] - yPos, arr);
    ctx.globalAlpha = Math.max(0.5 - timing, 0) * globalOpacity;
    const shockwaveSpeed = 80;
    arr = [];
    let arr2 = [];
    for (let i = 0; i < 5; i++) {
        arr.push([
            Math.cos(i*Math.PI*0.25) * (16 + timing * shockwaveSpeed),
            Math.sin(i*Math.PI*0.25) * (16 + timing * shockwaveSpeed)
        ])
        arr2.push([
            Math.cos((5 - i)*Math.PI*0.25) * (12 + timing * shockwaveSpeed),
            Math.sin((5 - i)*Math.PI*0.25) * (12 + timing * shockwaveSpeed)
        ])
    }
    setColor(ctx, 2);
    drawPoly(ctx, particle[0], particle[1] - yPos, arr.concat(arr2));
    arr = [];
    arr2 = [];
    for (let i = 0; i < 5; i++) {
        arr.push([
            Math.cos((4 + i)*Math.PI*0.25) * (16 + timing * shockwaveSpeed),
            Math.sin((4 + i)*Math.PI*0.25) * (16 + timing * shockwaveSpeed)
        ])
        arr2.push([
            Math.cos((9 - i)*Math.PI*0.25) * (12 + timing * shockwaveSpeed),
            Math.sin((9 - i)*Math.PI*0.25) * (12 + timing * shockwaveSpeed)
        ])
    }
    setColor(ctx, 2);
    drawPoly(ctx, particle[0], particle[1] - yPos, arr.concat(arr2));
    arr = [];
    for (let i = 0; i < 8; i++) {
        arr.push([
            Math.cos(i*Math.PI*0.25) * timing * 24,
            Math.sin(i*Math.PI*0.25) * timing * 24
        ])
    }
    ctx.globalAlpha = 0.5 * (1 - timing) * globalOpacity;
    setColor(ctx, 1);
    drawPoly(ctx, particle[0], particle[1] - yPos, arr);
    ctx.globalAlpha = globalOpacity;
    if (!isDead && !paused) {
        particle[2]--;
    }
    
    return particle[2] < 0;
}

function addCommas(numericString) {
    return numericString.replace(/\B(?=(\d{3})+(?!\d))/g, ','); // Regex stolen from stackoverflow.com
}

function drawDeathScreen(ctx, timer) {
    const second = 60;
    if (timer > second * 4) {
        const width = getTextSize(ctx, 'Game Over', 14, true).width;
        setColor(ctx, 3);
        drawText(ctx, 64 - width * 0.5, 12, 'Game Over', 14, true);
    }
    if (timer > second * 5) { // Game timer
        let timeText;
        if (timer < second * 5.5) {
            timeText = '00:00:000';
        } else {
            const time = playTime * Math.min((timer - second * 5.5)/second, 1);
            timeText = `${`${Math.floor(time/1000/60)}`.padStart(2, '0')}`; // Minutes
            timeText += `:${`${Math.floor(time/1000)%60}`.padStart(2, '0')}`; // Seconds
            timeText += `:${`${Math.floor(time%1000)}`.padStart(3, '0')}`; // ms
        }
        const timeWidth = getTextSize(ctx, timeText, 6, true).width;
        drawText(ctx, 64 - timeWidth * 0.5, 20, timeText, 6, true);
        
        let distanceText;
        if (timer < second * 5.5) {
            distanceText = '0m';
        } else {
            const distance = Math.round((maxDepth - 480) * Math.min((timer - second * 5.5)/second, 1) / 10);
            distanceText = addCommas(distance.toFixed(0)) + 'm';
        }
        const distanceWidth = getTextSize(ctx, distanceText, 6, true).width;
        drawText(ctx, 64 - distanceWidth * 0.5, 27, distanceText, 6, true);
    }
    
    if (timer > second * 7) {
        const blockArr = [];
        for (let i = 0; i < 4; i++) {
            const angle = (i*0.5 + 2/3) * Math.PI; // Ik ur not supposed to do this but it looks nicer this way imo
            blockArr.push([Math.cos(angle) * 10, Math.sin(angle) * 10]);
        }
        
        const triangleArr = [];
        for (let i = 0; i < 4; i++) {
            const angle = (i*2/3 + 0.4) * Math.PI; // No clue why it's 0.4, just tried random things until it was ok-ish
            triangleArr.push([Math.cos(angle) * 2.5, Math.sin(angle) * 2.5]);
        }
        
        setColor(ctx, 1);
        drawPoly(ctx, 32, 42, blockArr);
        drawPoly(ctx, 32, 64, blockArr);
        
        setColor(ctx, 2);
        for (let i = 0; i < 3; i++) {
            const angle = (i*2/3 + 7/30) * Math.PI; // 7/30 was also generated randomly; I no longer understand math
            drawPoly(ctx, Math.cos(angle) * 3.5 + 32.25, Math.sin(angle) * 3.5 + 63.75, triangleArr);
        }

        setColor(ctx, 3);

        let textSize = 8;
        
        let rockString = `${rocksDestroyed}`;
        let gemString = `${gemsDestroyed}`;

        const rockWidth = getTextSize(ctx, rockString, textSize, true).width;
        const gemWidth = getTextSize(ctx, gemString, textSize, true).width;
        
        if (Math.max(rockWidth, gemWidth) > 40) {
            textSize = Math.floor(40/Math.max(rockWidth, gemWidth)*textSize);
        }
        
        const textDistanceScale = textSize * 0.125;
        
        if (timer > second * 7.5) {
            let fsText = addCommas((rocksDestroyed * 20 + gemsDestroyed * 500).toFixed(0));
            
            if (timer < second * 8) {
                rockString = '0';
                gemString = '0';
                fsText = '0';
            } else if (timer < second * 9) {
                rockString = Math.floor(rocksDestroyed * Math.min((timer - second * 8)/second, 1));
                gemString = Math.floor(gemsDestroyed * Math.min((timer - second * 8)/second, 1));
                
                fsText = addCommas((rockString * 20 + gemString * 500).toFixed(0));
                
                rockString = `${rockString}`
                gemString = `${gemString}`
            } else if (timer >= second * 9.5) {
                if (highScore >= 0) {
                    const hsTextWidth = getTextSize(ctx, 'High Score', 4, true).width;
                    drawText(ctx, 64 - hsTextWidth * 0.5, 98, 'High Score', 4, true);
            
                    const hsString = addCommas((highScore * 10).toFixed());
            
                    const highScoreWidth = getTextSize(ctx, hsString, 6, true).width;
                    drawText(ctx, 64 - highScoreWidth * 0.5, 106, hsString, 6, true);
                }
            }
            
            const rockStringWidth = getTextSize(ctx, rockString, textSize, true).width;
            const gemStringWidth = getTextSize(ctx, gemString, textSize, true).width;
            
            drawText(ctx,
                43 + Math.max(0, gemWidth - rockWidth) + (rockWidth - rockStringWidth) * textDistanceScale,
                43.5 - (8 - textSize)*0.5,
                rockString, textSize, true);
            drawText(ctx,
                43 + Math.max(0, rockWidth - gemWidth) + (gemWidth - gemStringWidth) * textDistanceScale,
                65.5 - (8 - textSize)*0.5,
                gemString, textSize, true);
            
            const xArr = [
                [ 3, 2], [ 2, 3], [ 0, 1],
                [-2, 3], [-3, 2], [-1, 0],
                [-3,-2], [-2,-3], [ 0,-1],
                [ 2,-3], [ 3,-2], [ 1, 0],
            ];
            
            drawPoly(ctx, 49 + Math.max(rockWidth, gemWidth) * textDistanceScale, 41, xArr);
            drawPoly(ctx, 49 + Math.max(rockWidth, gemWidth) * textDistanceScale, 63, xArr);
            
            drawText(ctx, 55 + Math.max(rockWidth, gemWidth) * textDistanceScale, 43.5, '20', 8, true);
            drawText(ctx, 55 + Math.max(rockWidth, gemWidth) * textDistanceScale, 65.5, '500', 8, true);
            
            const fsWidth = getTextSize(ctx, 'Final Score', 6, true).width;
            drawText(ctx, 64 - fsWidth * 0.5, 80, 'Final Score', 6, true);
            
            const fsCounterWidth = getTextSize(ctx, fsText, 8, true).width;
            drawText(ctx, 64 - fsCounterWidth * 0.5, 89, fsText, 8, true);
        }
        
        if (timer > second * 10) {
            const restartWidth = getTextSize(ctx, 'Press \u{2B9F} or S to Restart', 8, true).width;
            drawText(ctx, 64 - restartWidth * 0.5, 120, 'Press \u{2B9F} or S to Restart', 8, true);
        }
    }
}

const keyCodes = [
    'arrowup',
    'arrowdown',
    'arrowleft',
    'arrowright',
    'a', 'b', 'enter'
];

const palettes = [
    ['#10121c', '#fa0c1c', '#f5f4e6', '#f5f4e6', 'Mantle'],
    ['#26854c', '#5ab552', '#9de64e', '#9de64e', 'Verdant'],
    ['#94493a', '#e98537', '#f3a833', '#f3a833', 'Sands'],
    ['#081820', '#88c070', '#e0f8d0', '#e0f8d0', 'Luminance'],
    ['#45283c', '#66313d', '#ac3232', '#ac3232', 'Sanguine'],
    ['#8e6bff', '#fe89d9', '#f3bbe7', '#f3bbe7', 'Sugar Rush'],
    ['#8d697a', '#ffaa5e', '#ffd4a3', '#ffd4a3', 'Splendor'],
    ['#1d1017', '#3b1725', '#73172d', '#73172d', 'Aberration'],
    ['#ded9da', '#e61523', '#ded9da', '#e61523', 'Labyrinth'],
    ['#3e2731', '#e43b44', '#ead4aa', '#ead4aa', 'Cozy'],
    ['#68386c', '#f77622', '#fee761', '#fee761', 'Spirit'],
    ['#262b44', '#5a6988', '#c0cbdc', '#c0cbdc', 'Superstructure'],
    ['#252446', '#1e579c', '#0098db', '#0098db', 'Deep Blue'],
    ['#212123', '#868188', '#f2f0e5', '#f488ae', 'Yaya!'],
    ['#d03791', '#fe6c90', '#ffffff', '#ffffff', 'Cherry'],
    ['#202020', '#393939', '#cd894a', '#c0cbdc', 'Affluence']
];

let currentCodeIndex = 0;
let tipFadeTimer = 0;

let codeCompleted = parseInt(localStorage.getItem('BASALT.variables.codeCompleted'));

let currentPalette = 0;
let currentShader = 0;

if (!isNaN(codeCompleted) && codeCompleted !== null) {
    currentCodeIndex = sequence.length;
    tipFadeTimer = 60;

    let savedPaletteIndex = parseInt(localStorage.getItem('BASALT.variables.paletteIndex'));
    if (!isNaN(savedPaletteIndex) && savedPaletteIndex !== null) {
        currentPalette = savedPaletteIndex % palettes.length;
        currentShader = Math.floor(savedPaletteIndex / palettes.length);
    }
}

let keyState = false;

let lKeyDown = false;
let rKeyDown = false;
let uKeyDown = false;

let titleBarPos = 0;

function setPalette(index) {
    COLORS = palettes[index];
    document.documentElement.style.setProperty('--background', COLORS[0]);

    localStorage.setItem('BASALT.variables.paletteIndex', index + currentShader * palettes.length);
}

function titleScreen(ctx) {
    if (restartTimer < 65) {
        window.requestAnimationFrame(() => {
            titleScreen(ctx);
        });
    } else {
        window.requestAnimationFrame(() => {
            initNewGame(ctx);
        });
    }

    setPalette(currentPalette);
    
    const keyList = Object.keys(keys);
    
    if ((keys.w || keys.arrowup) && !uKeyDown) {
        uKeyDown = true;
        if (currentCodeIndex === sequence.length) {
            currentShader = currentShader + 1 > 2 ? 0 : currentShader + 1;
            window.onresize();
            localStorage.setItem('BASALT.variables.paletteIndex', currentPalette + currentShader * palettes.length);
        }
    } else if (!(keys.w || keys.arrowup) && uKeyDown) {
        uKeyDown = false;
    }
    
    if ((keys.a || keys.arrowleft) && !lKeyDown) {
        lKeyDown = true;
        if (currentCodeIndex === sequence.length) {
            currentPalette -= 1;
            if (currentPalette < 0) {
                currentPalette += palettes.length;
            }
            
            setPalette(currentPalette);
        }
    } else if (!(keys.a || keys.arrowleft) && lKeyDown) {
        lKeyDown = false;
    }
    
    if ((keys.d || keys.arrowright) && !rKeyDown) {
        rKeyDown = true;
        if (currentCodeIndex === sequence.length) {
            currentPalette = (currentPalette + 1) % palettes.length;
            
            setPalette(currentPalette);
        }
    } else if (!(keys.d || keys.arrowright) && rKeyDown) {
        rKeyDown = false;
    }
    
    if (!keyState && keyList.length > 0 && currentCodeIndex < sequence.length) {
        if (keyList.length === 1 && keys[keyCodes[sequence[currentCodeIndex]]]) {
            currentCodeIndex++;
            if (currentCodeIndex === sequence.length) {
                localStorage.setItem('BASALT.variables.codeCompleted', 1);
            }
        } else {
            currentCodeIndex = 0;
        }
        keyState = true;
    }
    
    if (keyList.length === 0) {
        keyState = false;
    } else if (keyList.length > 1 && currentCodeIndex < sequence.length) {
        currentCodeIndex = 0;
    }
    
    ctx.clearRect(0, 0, 128*displayMult, 128*displayMult);
    
    setColor(ctx, 3);
    
    if (currentCodeIndex === sequence.length) {
        tipFadeTimer = Math.min(tipFadeTimer + 1, 60);
        ctx.globalAlpha = globalOpacity * (tipFadeTimer / 60);
        
        const glowWidth = getTextSize(ctx, 'Press \u{2B9D}/W to swap shaders', 4, true).width;
        drawText(ctx, 64 - glowWidth * 0.5, 100, 'Press \u{2B9D}/W to swap shaders', 4, true);

        const palletteWidth = getTextSize(ctx,
            'Press \u{2B9C}\u{200A}/\u{200A}A and \u{2B9E}\u{200A}/\u{200A}D to cycle palettes', 4, true).width;
        drawText(ctx, 64 - palletteWidth * 0.5, 112,
            'Press \u{2B9C}\u{200A}/\u{200A}A and \u{2B9E}\u{200A}/\u{200A}D to cycle palettes', 4, true);

        const palletteNameWidth = getTextSize(ctx, COLORS[4], 4, true).width;
        drawText(ctx, 64 - palletteNameWidth * 0.5, 118, COLORS[4], 4, true);

        ctx.globalAlpha = globalOpacity;
    }
    
    ctx.globalAlpha = globalOpacity;
    
    const titleWidth = getTextSize(ctx, '\u{300A} BASALT \u{300B}', 14, true).width;
    drawText(ctx, 64 - titleWidth * 0.5, 48, '\u{300A} BASALT \u{300B}', 14, true);
    
    const subtitleWidth = getTextSize(ctx, 'Press \u{2B9F}/\u{200A}S to Dive', 10, true).width;
    drawText(ctx, 64 - subtitleWidth * 0.5, 64, 'Press \u{2B9F}/\u{200A}S to Dive', 10, true);

    if (highScore >= 0) {
        const hsTextWidth = getTextSize(ctx, 'High Score', 6, true).width;
        drawText(ctx, 64 - hsTextWidth * 0.5, 76, 'High Score', 6, true);

        const hsString = addCommas((highScore * 10).toFixed());

        const highScoreWidth = getTextSize(ctx, hsString, 6, true).width;
        drawText(ctx, 64 - highScoreWidth * 0.5, 84, hsString, 6, true);
    }
    
    setColor(ctx, 0);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    drawRect(ctx, 0, 0, 15, 128);
    drawRect(ctx, 113, 0, 15, 128);
    ctx.globalAlpha = globalOpacity;
    
    const offsetY = -(titleBarPos % 16);

    setColor(ctx, 1);
    
    for (let i = 0; i < 10; i++) {
        const thickness = 11;
        drawPoly(ctx, 0, i * 16 + offsetY - 16, [
            [ 0,  0],
            [ 0,  0 + thickness],
            [15, 15 + thickness],
            [15, 15]
        ]);
        
        drawPoly(ctx, 113, i * 16 + offsetY - 16, [
            [15,  0],
            [15,  0 + thickness],
            [ 0, 15 + thickness],
            [ 0, 15]
        ]);
    }
    
    titleBarPos += 0.15;
    
    if ((keys.arrowdown || keys.s || restartTimer > 0) && currentCodeIndex !== 3 && currentCodeIndex !== 4) {
        globalOpacity = Math.max(globalOpacity - 1/60, 0);
        restartTimer++;
    }
}

const tileDrawFunctions = [
    (a, b, c) => {}, // Air
    drawTile,
    drawBomb,
    drawGem,
    drawSpike
];

let restartTimer = 0;
let sKeyDown = false;
let paused = false;

let playTimeUpdateCounter = 10;
let lastPlaytimeMarker = 0;

let timeAtPauseStart = 0;

function update(ctx, time) {
    const now = Date.now();
    ctx.globalAlpha = globalOpacity;
    
    if (Date.now() - time < 14 && restartTimer === 0) { // Prevents higher framerates from breaking things
        window.requestAnimationFrame(() => {
            update(ctx, time);
        });
        return;
    }

    if ((keys.s || keys.arrowdown) && !sKeyDown) {
        sKeyDown = true;
        if (isDead || globalOpacity !== 1) {
            paused = false;
        } else {
            paused = !paused;
            if (paused) {
                timeAtPauseStart = Date.now();
            } else {
                const change = Date.now() - timeAtPauseStart;
                playTime += change;
                lastPlaytimeMarker += change;
            }
        }
    } else if (!(keys.s || keys.arrowdown) && sKeyDown) {
        sKeyDown = false;
    }
    
    if (restartTimer < 65) {
        window.requestAnimationFrame(() => {
            update(ctx, now);
        });
    } else {
        window.requestAnimationFrame(() => {
            initNewGame(ctx);
        });
    }
    
    for (let i = 0; i < hitBombs.length; i++) {
        if (!isDead && !paused) {
            hitBombs[i][2]--;
        }
        
        if (hitBombs[i][2] <= 0) {
            explodeBomb(i)
            hitBombs.splice(i, 1);
            i--;
        }
    }
    
    if (!paused) {
        if (!isDead) {
            if (playTimeUpdateCounter <= 0) {
                playTimeUpdateCounter = 10;

                let prevValue = localStorage.getItem('BASALT.data.time_played');
                if (!prevValue) {
                    prevValue = 0;
                } else {
                    prevValue = parseInt(prevValue);
                }

                localStorage.setItem('BASALT.data.time_played', prevValue + Date.now() - lastPlaytimeMarker);
                
                lastPlaytimeMarker = Date.now();
            } else {
                playTimeUpdateCounter--;
            }
        }
        doPlayerLogic();
    }
    
    ctx.clearRect(0, 0, 128*displayMult, 128*displayMult);
    
    if (yPos + pHeight/2 + 128 > mapHeight + mapMaxLength * 16) {
        genNextLayer();
    }
    
    for (let i = 0; i < map.length; i++) {
        if (mapHeight + i*16 + 16 >= yPos + pHeight*0.5 - 64 
        && mapHeight + i*16 - 16 <= yPos + pHeight*0.5 + 64) {
            for (let x = 0; x < 6; x++) {
                tileDrawFunctions[map[i][x]](ctx, x, mapHeight + i*16 - 16 - (yPos + pHeight*0.5 - 64), x, i);
            }
        }
    }
    
    drawParticles(ctx)

    if (!isDead) {
        globalOpacity = Math.min(globalOpacity + 1/15, 1);
        drawPlayer(ctx);
    } else {
        drawDeathScreen(ctx, deathTimer);
        if (keys.arrowdown || keys.s || restartTimer > 0) {
            globalOpacity = Math.max(globalOpacity - 1/60, 0);
            restartTimer++;
        }
    }
    
    setColor(ctx, 0);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    drawRect(ctx, 0, 0, 15, 128);
    drawRect(ctx, 113, 0, 15, 128);
    ctx.globalAlpha = globalOpacity;
    
    const offsetY = -(yPos % 16);
    setColor(ctx, 1);
    
    // Draw side bars
    for (let i = 0; i < 10; i++) {
        const thickness = 11;
        drawPoly(ctx, 0, i * 16 + offsetY - 16, [
            [ 0,  0],
            [ 0,  0 + thickness],
            [15, 15 + thickness],
            [15, 15]
        ]);
        
        drawPoly(ctx, 113, i * 16 + offsetY - 16, [
            [15,  0],
            [15,  0 + thickness],
            [ 0, 15 + thickness],
            [ 0, 15]
        ]);
    }

    if (paused) {
        ctx.globalAlpha = globalOpacity * 0.5;
        setColor(ctx, 0);
        drawRect(ctx, 0, 0, 128, 128);
        ctx.globalAlpha = globalOpacity;

        setColor(ctx, 3);

        const pauseTextWidth = getTextSize(ctx, 'Paused', 10, true).width;
        drawText(ctx, 64 - pauseTextWidth * 0.5, 59, 'Paused', 10, true);

        const scoreString = addCommas((rocksDestroyed * 20 + gemsDestroyed * 500).toFixed());

        const scoreTextWidth = getTextSize(ctx, 'Score', 6, true).width;
        drawText(ctx, 64 - scoreTextWidth * 0.5, 72, 'Score', 6, true);

        const scoreWidth = getTextSize(ctx, scoreString, 8, true).width;
        drawText(ctx, 64 - scoreWidth * 0.5, 80, scoreString, 8, true);
    }
    
    ctx.fillStyle = '#0dead0';

    for (let i = 0; i < tiles.length; i++) {
        drawRect(ctx,
            tiles[i][0]*16+16, mapHeight + tiles[i][1]*16 - 16 - (yPos + pHeight*0.5 - 64), 16, 16);
    }
}

function initNewGame(ctx) {
    playTime = Date.now();
    lastPlaytimeMarker = playTime;

    if (!localStorage.getItem('BASALT.data.first_played')) {
        localStorage.setItem('BASALT.data.first_played', Date.now());
    }
    
    playTimeUpdateCounter = 30;
    
    restartTimer = 0;
    
    xPos = (128 - pWidth)/2;
    yPos = 0;
    
    dX = 0;
    dY = maxFallSpeed;
    
    isDead = false;
    paused = false;
    deathTimer = 0;
    
    globalOpacity = 0;
    
    let len = map.length;
    
    for (let i = 0; i < len; i++) {
        map.pop();
    }
    
    len = hitBombs.length;
    
    for (let i = 0; i < len; i++) {
        hitBombs.pop();
    }
    
    layerCounter = -2;
    
    for (let i = 0; i < mapMaxLength - preGenFloorCount*5; i++) {
        map.push([0,0,0,0,0,0]);
    }
    
    for (let i = 0; i < preGenFloorCount; i++) {
        genNextLayer();
    }
    
    mapHeight = 0;
    
    rocksDestroyed = 0;
    gemsDestroyed = 0;
    bombsDestroyed = 0;
    
    maxDepth = 0;
    
    len = particles.length;
    
    for (let i = 0; i < len; i++) {
        particles.pop();
    }

    update(ctx, 0);
}

window.onresize();
titleScreen(ctx);

function drawPlayer(ctx) {
    setColor(ctx, 3);
    drawRect(ctx, xPos, (128-pHeight)/2, pWidth, pHeight);
}

function drawTile(ctx, x, vo, tx, ty) {
    const cX = x*16 + 16;
    const cY = vo;
    setColor(ctx, 1);
    drawRect(ctx, cX, cY, 16, 16 + 1 / displayMult);
}

function drawBomb(ctx, x, vo, tx, ty) {
    const cX = x*16 + 24;
    const cY = vo + 8;
    let arr = [];
    for (let i = 0; i < 8; i++) {
        arr.push([
            Math.cos(i*Math.PI*0.25) * 7,
            Math.sin(i*Math.PI*0.25) * 7
        ])
    }
    let percent = 5/7;
    for (let i = 0; i < hitBombs.length; i++) {
        if (hitBombs[i][1] === ty) {
            percent *= hitBombs[i][2] / maxBombTime; // To make center appear smaller when hit
        }
    }
    setColor(ctx, 1);
    drawPoly(ctx, cX, cY, arr);
    for (let i = 0; i < 8; i++) {
        arr[i][0] *= percent;
        arr[i][1] *= percent;
    }
    setColor(ctx, 2);
    drawPoly(ctx, cX, cY, arr);
}

function drawGem(ctx, x, vo, tx, ty) {
    const flipped = ((Math.sin(tx) + Math.sqrt(ty + mapHeight / 16)) * 100) % 1 < 0.5;
    const cX = x*16 + 16;
    const cY = vo;
    setColor(ctx, 1);
    drawRect(ctx, cX, cY, 16, 16 + 1 / displayMult);
    setColor(ctx, 2);
    let arr = [];
    for (let i = 0; i < 3; i++) {
        arr.push([
            Math.cos(i*Math.PI*2/3 + Math.PI/2) * 3,
            Math.sin(i*Math.PI*2/3 + Math.PI/2) * 3
        ])
    }
    for (let i = 0; i < 3; i++) {
        drawPoly(ctx,
            Math.cos(i*Math.PI*2/3 + (flipped ? Math.PI : 0)) * 4 + cX + 8,
            Math.sin(i*Math.PI*2/3 + (flipped ? Math.PI : 0)) * 4 + cY + 8,
            arr);
    }
}

function drawSpike(ctx, x, vo, tx, ty) {
    const cX = x*16 + 24;
    const cY = vo + 8;
    let arr = [[7, 0], [0, 3], [-7, 0], [0, -3]];
    setColor(ctx, 1);
    drawPoly(ctx, cX, cY, arr);
    for (let i = 0; i < 4; i++) {
        const interchange = arr[i][0];
        arr[i][0] = arr[i][1];
        arr[i][1] = interchange;
    }
    drawPoly(ctx, cX, cY, arr);
}