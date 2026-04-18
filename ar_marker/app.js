let video = document.getElementById('video');
let canvasOutput = document.getElementById('canvasOutput');
let canvasContext = canvasOutput.getContext('2d');

let detector;

async function initWithRetry(retryCount = 0) {
    if (typeof AR !== 'undefined') {
        initDetector();
        return;
    }
    if (retryCount > 10) {
        document.getElementById('status').innerHTML = 'エラー: ライブラリの読み込みに失敗しました。外部ネットワークを確認してください。';
        return;
    }
    document.getElementById('status').innerHTML = 'ARライブラリの準備を待っています... (' + retryCount + ')';
    setTimeout(() => initWithRetry(retryCount + 1), 500);
}

window.onload = function() {
    initWithRetry();
    startCamera();
};

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }, 
            audio: false 
        });
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
            video.play();
            // カメラ準備完了後、ライブラリの準備が整うまで待機してから初期化
            await waitForAR();
            initDetector();
        };
    } catch (err) {
        console.error("Camera error: " + err);
        document.getElementById('status').innerHTML = 'カメラの起動に失敗しました: ' + err;
    }
}

function waitForAR() {
    return new Promise((resolve) => {
        const check = () => {
            if (typeof AR !== 'undefined') {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}

function initDetector() {
    // js-aruco のマーカー検出器を初期化
    detector = new AR.Detector();
    document.getElementById('status').innerHTML = 'マーカーを探索中...';
    tick();
}

function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // ビデオ映像をそのままキャンバスに描画
        canvasContext.drawImage(video, 0, 0, canvasOutput.width, canvasOutput.height);
        
        // 画像データを取得してマーカーを検出
        let imageData = canvasContext.getImageData(0, 0, canvasOutput.width, canvasOutput.height);
        let markers = detector.detect(imageData);
        
        drawMarkers(markers);
    }
    requestAnimationFrame(tick);
}

function drawMarkers(markers) {
    markers.forEach(marker => {
        // 1. 矩形を描画
        canvasContext.strokeStyle = "red";
        canvasContext.lineWidth = 3;
        canvasContext.beginPath();
        canvasContext.moveTo(marker.corners[0].x, marker.corners[0].y);
        for (let i = 1; i < 4; i++) {
            canvasContext.lineTo(marker.corners[i].x, marker.corners[i].y);
        }
        canvasContext.closePath();
        canvasContext.stroke();

        // 2. IDを表示
        canvasContext.fillStyle = "white";
        canvasContext.font = "bold 20px Arial";
        canvasContext.fillText("ID: " + marker.id, marker.corners[0].x, marker.corners[0].y - 10);

        // 3. 座標軸をシミュレート描画 (XYZ)
        // 中心の計算
        const center = {
            x: (marker.corners[0].x + marker.corners[2].x) / 2,
            y: (marker.corners[0].y + marker.corners[2].y) / 2
        };

        const axisLength = 50;

        // X軸 (赤)
        canvasContext.strokeStyle = "red";
        canvasContext.beginPath();
        canvasContext.moveTo(center.x, center.y);
        canvasContext.lineTo(marker.corners[0].x, marker.corners[0].y);
        canvasContext.stroke();

        // Y軸 (緑)
        canvasContext.strokeStyle = "green";
        canvasContext.beginPath();
        canvasContext.moveTo(center.x, center.y);
        canvasContext.lineTo(marker.corners[1].x, marker.corners[1].y);
        canvasContext.stroke();

        // Z軸 (青)
        canvasContext.strokeStyle = "blue";
        canvasContext.beginPath();
        canvasContext.moveTo(center.x, center.y);
        canvasContext.lineTo(center.x, center.y - axisLength);
        canvasContext.stroke();
    });

    if (markers.length > 0) {
        document.getElementById('status').innerHTML = markers.length + ' 個のマーカーを検出しました';
    } else {
        document.getElementById('status').innerHTML = 'マーカーを探しています...';
    }
}
