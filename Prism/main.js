const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let displayMultiplier;

let keys = {};
let lastKeys = {};

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

window.onresize = () => {
    displayMultiplier = Math.floor(Math.min(
    window.innerWidth, window.innerHeight) / 128);

    canvas.width = 128 * displayMultiplier;
    canvas.height = 128 * displayMultiplier;
}

window.onresize();

function drawRect(ctx, x, y, w, h) {
    ctx.fillRect(x*displayMultiplier, y*displayMultiplier,
        w*displayMultiplier, h*displayMultiplier);
}

function drawPoly(ctx, offX, offY, points) {
    ctx.beginPath();
    ctx.moveTo(
        (points[0][0] + offX)*displayMultiplier,
        (points[0][1] + offY)*displayMultiplier);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(
            (points[i][0]+offX)*displayMultiplier,
            (points[i][1]+offY)*displayMultiplier);
    }
    ctx.closePath();
    ctx.fill();
}

function setColor(ctx, index) {
    ctx.fillStyle = COLORS[index];
    if (doGlow) {
        ctx.shadowBlur = displayMultiplier * 2;
        ctx.shadowColor = COLORS[index];
    } else {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'rgba(0,0,0,0)';
    }
}

function drawImage(ctx, image, x, y, w, h, u = 0, v = 0, uW = 0, vH = 0) {
    if (vH > 0) {
        ctx.drawImage(image, u, v, uW, vH, x * displayMultiplier, y * displayMultiplier, w * displayMultiplier, h * displayMultiplier);
        return;
    }
    ctx.drawImage(image, x * displayMultiplier, y * displayMultiplier, w * displayMultiplier, h * displayMultiplier);
}

function drawText(ctx, x, y, str, size, bold = false) {
    ctx.font = `${bold?'bold ':''}${size * displayMultiplier}px 'Trebuchet MS'`;
    ctx.fillText(str, x * displayMultiplier, y * displayMultiplier);
}

function getTextSize(ctx, str, size, bold = false) {
    ctx.font = `${bold?'bold ':''}${size}px 'Trebuchet MS'`;
    return ctx.measureText(str);
}

const level = [];

let levelWidth = 0;
let levelHeight = 0;

let levelXOffset = 0;
let levelYOffset = 0;

let levelScale = 1;

let playerX = 0;
let playerY = 0;

let moveCooldown = 0;

const levels = [
    '  wws / ww  b/ ww w /6 /  ww  /3w3 '
];

const boxes = []; // [x, y, type, rotation?, color?]

const levelDrawCalls = [];

/**
 * @returns {number} The number of characters to skip after this chunk is processed.
 * @param {number[]} array 
 * @param {number} count 
 * @param {string} letter 
 * @param {number} xPos 
 * @param {number} yPos 
 * @param {string} token 
 * @param {number} tokenIndex 
 */
function getTileFromChar(array, count, letter, xPos, yPos, token, tokenIndex) {
    function pushCount(tile, count) {
        for (let i = 0; i < count; i++) {
            array.push(tile);
        }
    }

    switch (letter) {
        case ' ':
            pushCount(0, count);
            return 1;
        case 'w':
            pushCount(1, count);
            return 1;
        case 's':
            playerX = xPos;
            playerY = yPos;
            pushCount(0, count);
            return 1;
        case 'e':
            pushCount(2, count);
            return 1;
        case 'b':
            boxes.push([xPos, yPos, 0]);
            pushCount(0, count);
            return 1;
        default:
            throw new Error(`Invalid RLE token! Segment: ${yPos}; Index:${tokenIndex}`);
    }
}

function isSolid(tileType) {
    switch (tileType) {
        case 0:
            return false;
        case 1:
            return true;
        case 2:
            return false;
        default:
            return false;
    }
}

function parseLevelToken(token, yPos) {
    const arr = [];

    let xPos = 0;
    for (let i = 0; i < token.length;) {
        const first = token.charAt(i);
        if (/\d/.test(first)) {
            const count = parseInt(first);
            i++;
            i += getTileFromChar(arr, count, token.charAt(i), xPos, yPos, token, i);
            xPos += count;
        } else {
            if (yPos === 0) {console.log(arr);}

            i += getTileFromChar(arr, 1, token.charAt(i), xPos, yPos, token, i);
            xPos++;
        }
    }

    return arr;
}

function startGameLevel(ctx, index) {
    level.length = 0;
    boxes.length = 0;

    const tokens = levels[index].split('/');

    levelHeight = tokens.length;

    for (let i = 0; i < tokens.length; i++) {
        level.push(...parseLevelToken(tokens[i], i));
        if (i === 0) {
            levelWidth = level.length;
        }
    }

    levelScale = Math.floor(128 / (Math.max(levelWidth, levelHeight) + 2));

    levelXOffset = 64 - levelWidth * levelScale * 0.5;
    levelYOffset = 64 - levelHeight * levelScale * 0.5;

    generateWallDrawCalls(levelDrawCalls);

    drawCycle(ctx, 0);
}

function getTile(x, y) {
    if (x < 0 || x >= levelWidth || y < 0 || y >= levelHeight) {
        return 1;
    }
    return level[y * levelWidth + x];
}

const debugCalls = [];

/**
 * @param {number[]} drawCalls Each call is stored in series as ...[x, y, width, height]
 */
function generateWallDrawCalls(drawCalls) {
    drawCalls.length = 0;
    debugCalls.length = 0;

    function doGreedyMeshing(array) {
        const mesh = [];
        for (let y = 0; y < levelHeight + 2; y++) {
            for (let x = 0; x < levelWidth + 2; x++) {
                if (array[y * (levelWidth  + 2) + x]) {
                    let dx = 0;
                    for (;x + dx < levelWidth + 2; dx++) {
                        if (!array[y * (levelWidth + 2) + x + dx]) {
                            break;
                        }
                    }

                    let dy = 0;
                    for (;y + dy < levelHeight + 2; dy++) {
                        let doBreak = false;
                        for (let testX = x; testX < x + dx; testX++) {
                            if (!array[(y + dy) * (levelWidth + 2) + testX]) {
                                doBreak = true;
                                break;
                            }
                        }
                        if (doBreak) {
                            break;
                        }
                    }

                    mesh.push(x, y, dx, dy);
                }
            }
        }

        return mesh;
    }

    const mapCoverage = [];

    const rightCoverData = [];
    const downCoverData = [];

    for (let y = -1; y <= levelHeight; y++) {
        for (let x = -1; x <= levelWidth; x++) {
            const isWall = getTile(x, y) === 1;

            mapCoverage.push(isWall);

            rightCoverData.push(x !== levelWidth && isWall && getTile(x + 1, y) === 1);
            downCoverData.push(y !== levelHeight && isWall && getTile(x, y + 1) === 1);
        }
    }

    const rightMesh = doGreedyMeshing(rightCoverData);
    const downMesh = doGreedyMeshing(downCoverData);

    for (let i = 0; i < rightMesh.length; i += 4) {
        rightMesh[i]--;
        rightMesh[i + 1]--;
        rightMesh[i + 2]++;
    }

    for (let i = 0; i < downMesh.length; i += 4) {
        downMesh[i]--;
        downMesh[i + 1]--;
        downMesh[i + 3]++;
    }

    drawCalls.push(...rightMesh);
    drawCalls.push(...downMesh);

    for (let i = 0; i < drawCalls.length - 4; i += 4) { // Mesh optimization
        for (let j = i + 4; j < drawCalls.length; j += 4) {
            const x1 = drawCalls[i];
            const y1 = drawCalls[i + 1];
            const w1 = drawCalls[i + 2];
            const h1 = drawCalls[i + 3];
            const x2 = drawCalls[j];
            const y2 = drawCalls[j + 1];
            const w2 = drawCalls[j + 2];
            const h2 = drawCalls[j + 3];
            if (x1 <= x2 && y1 <= y2 && x1 + w1 >= x2 + w2 && y1 + h1 >= y2 + h2) { // j is within i
                drawCalls.splice(j, 4);
                j -= 4;
                continue;
            }

            if (x1 >= x2 && y1 >= y2 && x1 + w1 <= x2 + w2 && y1 + h1 <= y2 + h2) { // i is within j
                drawCalls.splice(i, 4);
                j -= 4;
                i -= 4;
            }
        }
    }

    for (let i = 0; i < drawCalls.length; i += 4) {
        for (let y = drawCalls[i + 1] + 1; y < drawCalls[i + 1] + drawCalls[i + 3] + 1; y++) {
            for (let x = drawCalls[i] + 1; x < drawCalls[i] + drawCalls[i + 2] + 1; x++) {
                mapCoverage[y * (levelWidth + 2) + x] = false;
            }
        }
    }

    for (let y = 0; y < levelHeight + 2; y++) {
        for (let x = 0; x < levelWidth + 2; x++) {
            if (mapCoverage[y * (levelWidth + 2) + x]) {
                drawCalls.push(x - 1, y - 1, 1, 1);
            }
        }
    }
}

function moveBoxes(x, y, dx, dy) {
    if (!isSolid(getTile(x + dx, y + dy))) {
        for (let i = 0; i < boxes.length; i++) {
            if (boxes[i][0] === x + dx && boxes[i][1] === y + dy) {
                if (moveBoxes(x + dx, y + dy, dx, dy)) {
                    boxes[i][0] += dx;
                    boxes[i][1] += dy;

                    return true;
                }
                return false;
            }
        }
        return true;
    }

    return false;
}

function update(time) {
    moveCooldown = Math.max(moveCooldown - time, 0);

    let dx = 0;
    let dy = 0;

    if (moveCooldown === 0) {
        if ((keys.w && !lastKeys.w) || (keys.arrowup && !lastKeys.arrowup)) {
            moveCooldown = 500;
            dy--;
        }
    
        if ((keys.s && !lastKeys.s) || (keys.arrowdown && !lastKeys.arrowdown)) {
            moveCooldown = 500;
            dy++;
        }
    
        if ((keys.a && !lastKeys.a) || (keys.arrowleft && !lastKeys.arrowleft)) {
            moveCooldown = 500;
            dx--;
        }
    
        if ((keys.d && !lastKeys.d) || (keys.arrowright && !lastKeys.arrowright)) {
            moveCooldown = 500;
            dx++;
        }
    }

    if (moveBoxes(playerX, playerY, dx, 0)) { // moveBoxes doubles as a general collision check
        playerX += dx;
    }
    if (moveBoxes(playerX, playerY, 0, dy)) {
        playerY += dy;
    }

    lastKeys = structuredClone(keys); // Duplicate keys into lastKeys
}

/**
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} time 
 */
function drawCycle(ctx, time) {
    window.requestAnimationFrame(time => {
        drawCycle(ctx, time);
    });

    update(time);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = '#3C3C46';
    drawRect(ctx, levelXOffset - levelScale, levelYOffset - levelScale, (levelWidth + 2) * levelScale, (levelHeight + 2) * levelScale);

    drawWalls(ctx, levelDrawCalls);

    ctx.fillStyle = '#1E1E25';
    //ctx.fillStyle = '#FF0000';
    drawRect(ctx, 0, 0, levelXOffset - levelScale * 0.5, 128);
    drawRect(ctx, 0, 0, 128, levelYOffset - levelScale * 0.75);

    drawRect(ctx, levelXOffset + (levelWidth + 0.5) * levelScale, 0, 128 - levelXOffset - (levelWidth + 0.5) * levelScale, 128);
    drawRect(ctx, 0, levelYOffset + (levelHeight + 0.25) * levelScale, 128, 128 - levelYOffset - (levelHeight + 0.25) * levelScale);

    drawDebug(ctx, debugCalls);

    for (let i = 0; i < level.length; i++) {
        const xCoord = i % levelWidth;
        const yCoord = Math.floor(i / levelWidth);
        if (level[i] === 2) {
            drawEnd(ctx, xCoord, yCoord);
        }
    }
    
    for (let i = 0; i < boxes.length; i++) {
        drawBox(ctx, boxes[i][0], boxes[i][1], i)
    }
    
    drawPlayer(ctx, playerX, playerY);
}

function drawPlayer(ctx, x, y) {
    ctx.fillStyle = '#FFFFFF';
    drawRect(ctx,
        x * levelScale + levelXOffset + levelScale * 0.125,
        y * levelScale + levelYOffset + levelScale * 0.125,
        levelScale * 0.75,
        levelScale * 0.75);
}

function drawEnd(ctx, x, y) {
    ctx.fillStyle = '#10121C';
    drawRect(ctx,
        (x + 3/32) * levelScale + levelXOffset,
        (y - 0.5) * levelScale + levelYOffset,
        levelScale * 13/16,
        levelScale * 0.5);
}

function drawWalls(ctx, drawCalls) {
    ctx.fillStyle = '#C2C2C6';
    for (let i = 0; i < drawCalls.length; i+=4) {
        drawRect(ctx,
            drawCalls[i]   * levelScale + levelXOffset,
            (drawCalls[i+1]) * levelScale + levelYOffset,
            drawCalls[i+2] * levelScale,
            (drawCalls[i+3] + 0.3) * levelScale);
    }

    ctx.fillStyle = '#787887';
    for (let i = 0; i < drawCalls.length; i+=4) {
        drawRect(ctx,
            (drawCalls[i]   + 0.1) * levelScale + levelXOffset,
            (drawCalls[i+1] + 0.2/3) * levelScale + levelYOffset,
            (drawCalls[i+2] - 0.2) * levelScale,
            (drawCalls[i+3] - 1.6/3) * levelScale);
    }

    ctx.fillStyle = '#1E1E25';
    for (let i = 0; i < drawCalls.length; i+=4) {
        drawRect(ctx,
            (drawCalls[i]   + 0.2) * levelScale + levelXOffset,
            (drawCalls[i+1] + 0.4/3) * levelScale + levelYOffset,
            (drawCalls[i+2] - 0.4) * levelScale,
            (drawCalls[i+3] - 2/3) * levelScale);
    }
}

function drawDebug(ctx, drawCalls) {
    ctx.fillStyle = '#FF0000';
    for (let i = 0; i < drawCalls.length; i+=4) {
        drawRect(ctx,
            drawCalls[i]   * levelScale + levelXOffset,
            drawCalls[i+1] * levelScale + levelYOffset,
            drawCalls[i+2] * levelScale,
            drawCalls[i+3] * levelScale);
    }
}

function drawBox(ctx, x, y, index) {
    ctx.fillStyle = '#C2C2C6';
    drawRect(ctx,
        (x + 0.1) * levelScale + levelXOffset,
        (y + 0.1) * levelScale + levelYOffset,
        levelScale * 0.8,
        levelScale * 0.8);
    ctx.fillStyle = '#787887';
    drawRect(ctx,
        (x + 0.2) * levelScale + levelXOffset,
        (y + 0.2) * levelScale + levelYOffset,
        levelScale * 0.6,
        levelScale * 0.6);

    const thickness = levelScale * 0.1;
    const shadowThickness = levelScale * 0.15;
    const size = levelScale * 0.22;

    const arr = [
        [thickness-size, size],
        [-size, size],
        [-size, size-thickness],
        [size-thickness, -size],
        [size, -size],
        [size, thickness-size]
    ];

    ctx.fillStyle = '#C2C2C6';
    drawPoly(ctx, (x + 0.5) * levelScale + levelXOffset, (y + 0.5) * levelScale + levelYOffset, arr);

    ctx.fillStyle = '#787887';
    drawPoly(ctx, (x + 0.5) * levelScale + levelXOffset, (y + 0.5) * levelScale + levelYOffset, [
        [-size, shadowThickness-size],
        [-size, -size],
        [shadowThickness-size, -size],
        [size, size-shadowThickness],
        [size, size],
        [size-shadowThickness, size]
    ]);

    for (let i = 0; i < arr.length; i++) {
        const x = arr[i][0];
        arr[i][0] = arr[i][1];
        arr[i][1] = -x;
    }

    ctx.fillStyle = '#C2C2C6';
    drawPoly(ctx, (x + 0.5) * levelScale + levelXOffset, (y + 0.5) * levelScale + levelYOffset, arr);
}

startGameLevel(ctx, 0);