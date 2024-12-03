const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let scale = 20.0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

let segments = [];

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        offsetX += dx;
        offsetY += dy;
        redraw();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    const delta = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity;
    const previousScale = scale;
    scale = Math.min(Math.max(5, scale * delta), 50);

    document.getElementById('scale').value = scale.toFixed(1);
    document.getElementById('scaleValue').textContent = `Масштаб: ${scale.toFixed(1)}`;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = scale / previousScale;
    offsetX = mouseX - zoomFactor * (mouseX - offsetX);
    offsetY = mouseY - zoomFactor * (mouseY - offsetY);

    redraw();
});

function updateScale() {
    scale = parseFloat(document.getElementById('scale').value);
    document.getElementById('scaleValue').textContent = `Масштаб: ${scale.toFixed(1)}`;
    redraw();
}

function addSegment() {
    const segmentId = segments.length + 1;
    const segmentDiv = document.createElement('div');
    segmentDiv.innerHTML = `
        <div class="input-group">
            <label>Отрезок ${segmentId}:</label>
            <div>
                x1: <input type="number" class="x1" value="0">
                y1: <input type="number" class="y1" value="0">
                x2: <input type="number" class="x2" value="1">
                y2: <input type="number" class="y2" value="1">
                <button class="remove-segment">Удалить</button>
            </div>
        </div>
    `;
    document.getElementById('segments').appendChild(segmentDiv);

    // Сохраняем ссылку на элемент и данные
    const segmentData = { element: segmentDiv, data: { x1: 0, y1: 0, x2: 1, y2: 1 } };
    segments.push(segmentData);

    // Навешиваем обработчик на кнопку удаления
    segmentDiv.querySelector('.remove-segment').addEventListener('click', () => removeSegment(segmentData));

    redraw();
}

function removeSegment(segmentData) {
    // Удаляем элемент из DOM и из массива
    const index = segments.indexOf(segmentData);
    if (index !== -1) {
        segmentData.element.remove();
        segments.splice(index, 1);
    }
    updateSegmentNumbers();
    redraw();
}

function updateSegmentNumbers() {
    const segmentDivs = document.querySelectorAll('#segments .input-group');
    segmentDivs.forEach((div, index) => {
        div.querySelector('label').innerText = `Отрезок ${index + 1}:`;
    });
}

function getClipWindow() {
    return {
        xmin: parseInt(document.getElementById('clipXmin').value),
        ymin: parseInt(document.getElementById('clipYmin').value),
        xmax: parseInt(document.getElementById('clipXmax').value),
        ymax: parseInt(document.getElementById('clipYmax').value)
    };
}

// Генерация случайных координат отрезков
function generateRandomSegments() {
    const randomSegmentCount = 5;
    segments = [];
    document.getElementById('segments').innerHTML = '';

    for (let i = 0; i < randomSegmentCount; i++) {
        const x1 = Math.floor(Math.random() * 20 - 10);
        const y1 = Math.floor(Math.random() * 20 - 10);
        const x2 = Math.floor(Math.random() * 20 - 10);
        const y2 = Math.floor(Math.random() * 20 - 10);
        const segmentDiv = document.createElement('div');
        segmentDiv.innerHTML = `
            <div class="input-group">
                <label>Отрезок ${i + 1}:</label>
                <div>
                    x1: <input type="number" class="x1" value="${x1}">
                    y1: <input type="number" class="y1" value="${y1}">
                    x2: <input type="number" class="x2" value="${x2}">
                    y2: <input type="number" class="y2" value="${y2}">
                    <button class="remove-segment">Удалить</button>
                </div>
            </div>
        `;
        document.getElementById('segments').appendChild(segmentDiv);
        const segmentData = { element: segmentDiv, data: { x1, y1, x2, y2 } };
        segments.push(segmentData);

        // Навешиваем обработчик на кнопку удаления
        segmentDiv.querySelector('.remove-segment').addEventListener('click', () => removeSegment(segmentData));
    }
    redraw();
}
function generateRandomWindow() {
    // Устанавливаем диапазоны для случайных значений
    const minX = -10;
    const maxX = 10;
    const minY = -10;
    const maxY = 10;

    // Генерируем случайные минимальные и максимальные координаты для окна
    let xmin = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
    let xmax = Math.floor(Math.random() * (maxX - xmin + 1)) + xmin;
    let ymin = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    let ymax = Math.floor(Math.random() * (maxY - ymin + 1)) + ymin;

    // Обновляем значения в интерфейсе
    document.getElementById('clipXmin').value = xmin;
    document.getElementById('clipXmax').value = xmax;
    document.getElementById('clipYmin').value = ymin;
    document.getElementById('clipYmax').value = ymax;

    // Обновляем отображение окна
    redraw();
}


function cohenSutherland(x1, y1, x2, y2, clip) {
    const INSIDE = 0;
    const LEFT = 1;
    const RIGHT = 2;
    const BOTTOM = 4;
    const TOP = 8;

    function computeCode(x, y) {
        let code = INSIDE;
        if (x < clip.xmin) code |= LEFT;
        else if (x > clip.xmax) code |= RIGHT;
        if (y < clip.ymin) code |= BOTTOM;
        else if (y > clip.ymax) code |= TOP;
        return code;
    }

    let code1 = computeCode(x1, y1);
    let code2 = computeCode(x2, y2);

    while (true) {
        if (!(code1 | code2)) {
            return { accept: true, x1, y1, x2, y2 };
        }

        if (code1 & code2) {
            return { accept: false };
        }

        const code = code1 ? code1 : code2;
        let x, y;

        if (code & TOP) {
            x = x1 + (x2 - x1) * (clip.ymax - y1) / (y2 - y1);
            y = clip.ymax;
        } else if (code & BOTTOM) {
            x = x1 + (x2 - x1) * (clip.ymin - y1) / (y2 - y1);
            y = clip.ymin;
        } else if (code & RIGHT) {
            y = y1 + (y2 - y1) * (clip.xmax - x1) / (x2 - x1);
            x = clip.xmax;
        } else if (code & LEFT) {
            y = y1 + (y2 - y1) * (clip.xmin - x1) / (x2 - x1);
            x = clip.xmin;
        }

        if (code === code1) {
            x1 = x;
            y1 = y;
            code1 = computeCode(x1, y1);
        } else {
            x2 = x;
            y2 = y;
            code2 = computeCode(x2, y2);
        }
    }
}

function mapToCanvas(x, y) {
    const centerX = canvas.width / 2 + offsetX;
    const centerY = canvas.height / 2 + offsetY;
    return {
        x: centerX + x * scale,
        y: centerY - y * scale
    };
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2 + offsetX;
    const centerY = canvas.height / 2 + offsetY;

    let labelStep = 1;

    if (scale >= 20) {
        labelStep = 1;
    } else if (scale >= 10) {
        labelStep = 2;
    } else {
        labelStep = 5;
    }

    const gridStep = scale;

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const startX = -Math.ceil(centerX / gridStep);
    const endX = Math.ceil((canvas.width - centerX) / gridStep);
    for (let i = startX; i <= endX; i++) {
        const x = centerX + i * gridStep;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }

    const startY = -Math.ceil(centerY / gridStep);
    const endY = Math.ceil((canvas.height - centerY) / gridStep);
    for (let i = startY; i <= endY; i++) {
        const y = centerY + i * gridStep;
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    ctx.font = `${Math.max(10, scale / 2)}px Arial`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = startX; i <= endX; i++) {
        if (i === 0) continue;
        const x = centerX + i * gridStep;
        if (i % labelStep === 0) {
            ctx.fillText(i, x, centerY + 5);
        }
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = startY; i <= endY; i++) {
        if (i === 0) continue;
        const y = centerY + i * gridStep;
        if (i % labelStep === 0) {
            ctx.fillText(-i, centerX - 5, y);
        }
    }
}

function clipSegments() {
    const clipWindow = getClipWindow();
    drawGrid();

    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    const p1 = mapToCanvas(clipWindow.xmin, clipWindow.ymin);
    const p2 = mapToCanvas(clipWindow.xmax, clipWindow.ymax);
    ctx.strokeRect(p1.x, p2.y, p2.x - p1.x, p1.y - p2.y);

    segments.forEach((segment) => {
        const inputs = segment.element.getElementsByTagName('input');
        const x1 = parseInt(inputs[0].value);
        const y1 = parseInt(inputs[1].value);
        const x2 = parseInt(inputs[2].value);
        const y2 = parseInt(inputs[3].value);

        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        const start = mapToCanvas(x1, y1);
        const end = mapToCanvas(x2, y2);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        const clipped = cohenSutherland(x1, y1, x2, y2, clipWindow);

        if (clipped.accept) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            const clippedStart = mapToCanvas(clipped.x1, clipped.y1);
            const clippedEnd = mapToCanvas(clipped.x2, clipped.y2);
            ctx.beginPath();
            ctx.moveTo(clippedStart.x, clippedStart.y);
            ctx.lineTo(clippedEnd.x, clippedEnd.y);
            ctx.stroke();
        }
    });
}

function redraw() {
    drawGrid();
    clipSegments();
}

function resetCanvas() {
    segments = [];
    document.getElementById('segments').innerHTML = '';
    offsetX = 0;
    offsetY = 0;
    scale = 20;
    document.getElementById('scale').value = scale;
    document.getElementById('scaleValue').textContent = `Масштаб: ${scale.toFixed(1)}`;
    redraw();
}

addSegment();
resetCanvas();

redraw();