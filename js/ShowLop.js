//グローバル変数
var mkr = [];       //マーカの座標
var sphere = [];    //マーカのMesh
var iMkrNum = 12;   //マーカ最大数
var iGoastMkrNum = 10;//ゴーストマーカ数
var iDataCount=200; //フレーム最大数
var faveZ;//重心の高さの平均
var faveHipZ;//腰の高さの平均
var iF = 0;
var iFrameOffset;//右接地から左接地のオフセット
var iHeight;//身長
var iLinkFrom = [2,4,6,8,3,5,7,9,2,4];//リンクFrom
var iLinkTo = [4,6,8,10,5,7,9,11,3,5];//リンクTo
var iLinkSide = [0,0,0,0,1,1,1,1,2,2];//0:左　1:右　2:左->右
var cylinder = [];  //リンクのMesh
//var strLOPPath = "./data/LOP2.csv";
//var strGaitPath = "./data/LOP2_Gait.csv";
var strLOPPath = "./data/LOP_Aoki.csv";
var strGaitPath = "./data/LOP_Aoki_Gait.csv";
var strFBXPath = "./models/fbx/ybot.fbx";

var mkrGroup = new THREE.Group();
var linkGroup = new THREE.Group();
var trajectoryGroup = new THREE.Group();

var bxy = 1;//水平面の表裏
var byz = 1;//矢状面の表裏
var bxz = 1;//前額面の表裏

var clock = new THREE.Clock();

var mixer;
var myModel;
var skeletonHelper;

var dModelScale;//モデルのスケーリング


//各ボーンのオブジェクト
var objHeadTop_End, objSpine1, objSpine2, objHip;
var objRUpLeg, objRLeg, objRFoot, objRToe_End, objRArm;
var objLUpLeg, objLLeg, objLFoot, objLToe_End, objLArm;

//初期姿勢時のFootのベクトル
var vRFy_Home, vRFz_Home;
var vLFy_Home, vLFz_Home;
//初期姿勢時のHipの位置
var vHipPos_Home;

//各ボーンの1フレーム前のQuaernion
var quaSpint1Pre, quaSpint2Pre, quaHipPre;
var quaRUpLegPre, quaRLegPre, quaRFootPre, quaRArmPre;
var quaLUpLegPre, quaLLegPre, quaLFootPre, quaLArmPre;;

var canW = window.innerWidth; //canvas横:任意値 
var canH = window.innerHeight; //canvas縦:任意値
var scene,camera,renderer,controls,datObj,cubeTexture,mesh;　

var camera2, cameraNow;

//▼ページの読み込みを待って、getCSVを呼ぶ
//window.addEventListener('load',getGaitCSV);
window.addEventListener('load',getUrlParam);


//▼リサイズのイベントハンドラ
window.addEventListener('resize',onResize,false);

function getUrlParam()
{
    var urlPrm = new Object;
    var urlSearch = location.search.substring(1).split('&');
    for(i=0;urlSearch[i];i++) {
      var kv = urlSearch[i].split('=');
      urlPrm[kv[0]]=kv[1];
    }

    if(!urlPrm.data=="")
    {
       strLOPPath = "./data/"+urlPrm.data+".csv";
       strGaitPath = "./data/"+urlPrm.data+"_Gait.csv";
    }
    if(urlPrm.model=="1"){
        strFBXPath = "./models/fbx/xbot.fbx";
    }
    else{
        strFBXPath = "./models/fbx/ybot.fbx";
    }

    getGaitCSV();
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//▼LOPのCSVを読み込む
function getLOPCSV()
{
    var req = new XMLHttpRequest(); // HTTPでファイルを読み込むためのXMLHttpRrequestオブジェクトを生成
    req.open("get", strLOPPath, true); // アクセスするファイルを指定
    req.send(null); // HTTPリクエストの発行
    
    // レスポンスが返ってきたらconvertCSVtoArray()を呼ぶ	
    req.onload = function()
    {
        convertLOPCSVtoArray(req.responseText); // 渡されるのは読み込んだCSVデータ
        //読み込み終わったらmain()を読み込む
        main();
    }
    //-----------------------------------------------------------------------------------------
    // 読み込んだCSVデータを二次元配列に変換する関数の定義
    function convertLOPCSVtoArray(str)
    { 
        // 読み込んだCSVデータが文字列として渡される
        var result = []; // 最終的な二次元配列を入れるための配列
        var tmp = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成
    
        var i, j,iMk;
        var fmaxZ=0.0;
        var fminZ=999.0;

        //▼まずは空の配列を作る
        for(iMk=0; iMk < iMkrNum + iGoastMkrNum; iMk++)
        {
            mkr[iMk] = [];
            for( i=0; i < iDataCount; i++ )
            {
                var tmpvec=new THREE.Vector3(0,0,0);
                mkr[iMk].push(tmpvec);
            }
        }

        var iFR=0;
        faveHipZ =0;
        for( i=1; i<tmp.length; i++ )
        {
            var tmpline = [];
            //カンマで区切った1行ずつ文字を取得
            tmpline = tmp[i].split(',');

            //左足はOffset分ずらす
            iFL = iFR + iFrameOffset;
            if( iFL >= iDataCount)
            {
                iFL -= iDataCount;
            }

            j = 0;
            for( iMk=0; iMk<iMkrNum; iMk++ )
            {
                var iF = (iMk%2==0)? iFR:iFL;
                mkr[iMk][iF].x = tmpline[++j];
                mkr[iMk][iF].y = tmpline[++j];
                mkr[iMk][iF].z = tmpline[++j];

                //Z軸の最大値と最高値を更新
                if( fmaxZ < mkr[iMk][iF].z)
                    fmaxZ = mkr[iMk][iF].z;
                if( fminZ > mkr[iMk][iF].z)
                    fminZ = mkr[iMk][iF].z;
            }

            
            iFR++;

            if( iFR >= iDataCount)
            {
                break;
            }
        }

        //▼ゴーストマーカを定義する
        for( iF=0; iF<iDataCount; iF++ )
        {
            //▼両肩中心
            mkr[12][iF].set((+mkr[2][iF].x + +mkr[3][iF].x )/2, (+mkr[2][iF].y + +mkr[3][iF].y )/2, (+mkr[2][iF].z + +mkr[3][iF].z )/2);
            //▼両腰中心
            mkr[13][iF].set(( +mkr[4][iF].x + +mkr[5][iF].x )/2, ( +mkr[4][iF].y + +mkr[5][iF].y )/2, ( +mkr[4][iF].z + +mkr[5][iF].z )/2);
            
            var v54 = mkr[4][iF].clone().sub(mkr[5][iF]);
            //▼左Hip 内挿
            mkr[14][iF].set( +mkr[4][iF].x - v54.x*0.18, +mkr[4][iF].y - v54.y*0.18, +mkr[4][iF].z - v54.z*0.18);
            //▼右Hip 内挿
            mkr[15][iF].set( +mkr[5][iF].x + v54.x*0.18, +mkr[5][iF].y + v54.y*0.18, +mkr[5][iF].z + v54.z*0.18);

            //▼左ULeg 内挿
            var v68 = mkr[8][iF].clone().sub(mkr[6][iF]);
            var v810 = mkr[10][iF].clone().sub(mkr[8][iF]);
            var vLin = v68.clone().cross(v810).normalize();
            mkr[16][iF].set( +mkr[6][iF].x + vLin.x*0.026*iHeight, +mkr[6][iF].y + vLin.y*0.026*iHeight, +mkr[6][iF].z + vLin.z*0.026*iHeight);
            //▼左Leg 内挿
            mkr[18][iF].set( +mkr[8][iF].x + vLin.x*0.02*iHeight, +mkr[8][iF].y + vLin.y*0.02*iHeight, +mkr[8][iF].z + vLin.z*0.02*iHeight);
            //▼左Foot 内挿
            mkr[20][iF].set( +mkr[10][iF].x + vLin.x*0.023*iHeight, +mkr[10][iF].y + vLin.y*0.023*iHeight, +mkr[10][iF].z + vLin.z*0.023*iHeight);
            
            //▼右ULeg 内挿
            var v79 = mkr[9][iF].clone().sub(mkr[7][iF]);
            var v911 = mkr[11][iF].clone().sub(mkr[9][iF]);
            var vRin = v79.clone().cross(v911).normalize();
            mkr[17][iF].set( +mkr[7][iF].x - vRin.x*0.026*iHeight, +mkr[7][iF].y - vRin.y*0.026*iHeight, +mkr[7][iF].z - vRin.z*0.026*iHeight);
            //▼右Leg 内挿
            mkr[19][iF].set( +mkr[9][iF].x - vRin.x*0.02*iHeight, +mkr[9][iF].y - vRin.y*0.02*iHeight, +mkr[9][iF].z - vRin.z*0.02*iHeight);
            //▼右Foot 内挿
            mkr[21][iF].set( +mkr[11][iF].x - vRin.x*0.023*iHeight, +mkr[11][iF].y - vRin.y*0.023*iHeight, +mkr[11][iF].z - vRin.z*0.023*iHeight);

            //▼腰の高さの平均を求める
            faveHipZ = +faveHipZ + +mkr[13][iF].z;

        }
        faveHipZ = +faveHipZ/iDataCount;

        console.log(faveHipZ);

        /*
        //高さの平均値を出す（+演算子は文字列から数値を取り出す）
        faveZ = ( (+fmaxZ) + (+fminZ) )/2;
        faveZ = +faveZ + 15;//頭の高さの半分だけ高くする
        console.log(faveZ);
        */
        faveZ = 70;
    }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//▼GaitのCSVを読み込む
function getGaitCSV()
{
    var req = new XMLHttpRequest(); // HTTPでファイルを読み込むためのXMLHttpRrequestオブジェクトを生成
    req.open("get", strGaitPath, true); // アクセスするファイルを指定
    req.send(null); // HTTPリクエストの発行
    
    // レスポンスが返ってきたらconvertCSVtoArray()を呼ぶ	
    req.onload = function()
    {
        convertGaitCSVtoArray(req.responseText); // 渡されるのは読み込んだCSVデータ
        //読み込み終わったらメイン関数を呼び出す
        getLOPCSV();
    }
    //-----------------------------------------------------------------------------------------
    // 読み込んだCSVデータを二次元配列に変換する関数の定義
    function convertGaitCSVtoArray(str)
    { 
        // 読み込んだCSVデータが文字列として渡される
        var result = []; // 最終的な二次元配列を入れるための配列
        var tmp = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成
        var tmpline = [];

        //1行目を読み込み
        tmpline = tmp[0].split(',');
        //身長取得
        iHeight = parseFloat(tmpline[0]);
        //2行目を読み込み
        tmpline = tmp[1].split(',');
        //右立脚(%)-右両脚支持(%)分のフレームが右と左のオフセット
        iFrameOffset = parseInt((parseFloat(tmpline[4]) - parseFloat(tmpline[8]))*iDataCount/100);

    }
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//▼ メイン関数
function main()
{
    //if(!Detector.webgl)Detector.addGetWebGLMessage();//WebGL環境確認
    scene = new THREE.Scene();

    // create a render and set the size
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(new THREE.Color(0xEEEEEE));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    //床
    var plane = new THREE.Mesh( new THREE.PlaneBufferGeometry( 200, 200 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
    plane.receiveShadow = true;
    scene.add( plane );

    var grid = new THREE.GridHelper( 200, 6, 0x000000, 0x000000 );
    grid.rotation.x = - Math.PI/2 ;
    grid.material.opacity = 0.5;//0.2;
    grid.material.transparent = true;
    scene.add( grid );

    //LOPをシーンに追加
    createLOP();

    //FBXを読み込む
    loadFBXModel();

    // 自然光
    var ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);

    // スポットライト1
    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-50,80,400);
    spotLight.target.position.set(scene.position);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1000;
    spotLight.shadow.mapSize.height = 1000;
    spotLight.shadow.camera.near=100;
    spotLight.shadow.camera.far=500;
    scene.add(spotLight);
    //-- スポットライトの向きを表示する
    if(0)
    {
        var cameraHelper = new THREE.CameraHelper(spotLight.shadow.camera);
        scene.add(cameraHelper);
    }

    //軸
    var axis = new THREE.AxesHelper( 50 );
    axis.position.set(0,0,0);
    scene.add( axis);

    // カメラ:透視投影 (視野角,画面サイズ,カメラの見える範囲最小値,最大値)
    camera = new THREE.PerspectiveCamera( 33, canW / canH, 1, 5000);
    //camera = new THREE.OrthographicCamera(-canW, +canW, canH, -canH);
    scene.add(camera);
    camera.up = new THREE.Vector3(0,0,1);//Z UPにする
    camera.position.set( -200, 350, 100);
    camera.lookAt(scene.position);

    cameraNow = camera;

    //カメラ2
    camera2 = new THREE.OrthographicCamera(-canW, +canW, canH, -canH);
    scene.add(camera2);
    camera2.up = new THREE.Vector3(0,0,1);//Z UPにする
    camera2.position.set( -200, 350, 100);
    camera2.lookAt(scene.position);
    
    onResize();

    //コントローラー
    orbitcontrols = new THREE.OrbitControls(camera, renderer.domElement);
    orbitcontrols.maxDistance = 500;
    orbitcontrols.target.set(0,0,+faveZ);//回転中心を設定
                    
    // add the output of the renderer to the html element
    document.getElementById("WebGL-output").appendChild(renderer.domElement);

    
    //▼レンダリング
    renderScene();

    //-----------------------------------------------------------------------------------------
    //▼ FBXファイルを読み込んで配置する
    function loadFBXModel()
    {
        // model
        var loader = new THREE.FBXLoader();
        loader.load( strFBXPath, function ( object ) {
            //読み込んだオブジェクトをメンバに代入する
            myModel = object;

            mixer = new THREE.AnimationMixer( object );

            var action = mixer.clipAction( object.animations[ 0 ] );
            action.play();

            object.traverse( function ( child ) {
                if ( child.isMesh ) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            } );
            scene.add( object );

            //スケルトン表示
            if(0)
            {
                skeletonHelper  = new THREE.SkeletonHelper(object);
                skeletonHelper.material.linewidth=2;
                scene.add(skeletonHelper );			
            }
        
            //▼各ボーンのオブジェクトを取得する
            objHeadTop_End = myModel.getObjectByName('mixamorigHeadTop_End');
            objSpine1   = myModel.getObjectByName('mixamorigSpine');
            objSpine2   = myModel.getObjectByName('mixamorigSpine1');
            objHip      = myModel.getObjectByName('mixamorigHips');
            objRUpLeg   = myModel.getObjectByName('mixamorigRightUpLeg');
            objRLeg     = myModel.getObjectByName('mixamorigRightLeg');
            objRFoot    = myModel.getObjectByName('mixamorigRightFoot');
            objRToe_End = myModel.getObjectByName('mixamorigRightToe_End'); 
            objLUpLeg   = myModel.getObjectByName('mixamorigLeftUpLeg');
            objLLeg     = myModel.getObjectByName('mixamorigLeftLeg');
            objLFoot    = myModel.getObjectByName('mixamorigLeftFoot');
            objRArm     = myModel.getObjectByName('mixamorigRightArm');
            objLArm     = myModel.getObjectByName('mixamorigLeftArm');
            objLToe_End = myModel.getObjectByName('mixamorigLeftToe_End'); 


            //+++++++
            //▼Footをそれらしくする
            // 基本姿勢時の足部の軸方向（y）とそれに垂直なベクトル（z）を保持しておく
            // ほかのボーンは、y軸とy　z軸とzが一致するが、側部は一致しないため。
            //右
            var vx = new THREE.Vector3(1,0,0);
            var vRFootPos = new THREE.Vector3();
            var vRToePos = new THREE.Vector3();
            objRFoot.getWorldPosition(vRFootPos);
            objRToe_End.getWorldPosition(vRToePos);
            vRFy_Home = vRFootPos.clone().sub(vRToePos).normalize();
            vRFz_Home = vx.clone().cross(vRFy_Home).normalize();
            //左
            var vLFootPos = new THREE.Vector3();
            var vLToePos = new THREE.Vector3();
            objLFoot.getWorldPosition(vLFootPos);
            objLToe_End.getWorldPosition(vLToePos);
            vLFy_Home = vLFootPos.clone().sub(vLToePos).normalize();
            vLFz_Home = vx.clone().cross(vLFy_Home).normalize();
            //+++++++

            //▼腕をそれっぽく曲げておく
            objRArm.rotation.z = Math.PI/2.25;
            objRArm.rotation.x = -Math.PI/6;
            objRArm.children[1].rotation.z = Math.PI/2.1;//12;
            objRArm.children[1].children[1].rotation.z = Math.PI/3;//12;

            objLArm.rotation.z = -Math.PI/2.5;
            objLArm.rotation.x = -Math.PI/5;
            objLArm.children[1].rotation.z = -Math.PI/2.5;//12;
            objLArm.children[1].children[1].rotation.z = -Math.PI/3.5;//12;

            //▼ 腰の高さからモデルのサイズを調整
            vHipPos_Home = new THREE.Vector3();
            objHip.getWorldPosition(vHipPos_Home);
            dModelScale = faveHipZ/vHipPos_Home.y;
            myModel.scale.set(dModelScale,dModelScale,dModelScale);            

        } );
    }
    
    //-----------------------------------------------------------------------------------------
    //▼ LOPのオブジェクトを作成して配置する
    function createLOP()
    {
        //▼ここではオブジェクトを追加するだけ。実際の位置はrenderScene()で設定する
        //▼マーカ
        var sphereGeometry = new THREE.SphereGeometry(1.5,20,20);
        var sphereMaterial = new THREE.MeshLambertMaterial({color:0x7777ff});
//        for(var iMk=1; iMk<iMkrNum + iGoastMkrNum; iMk++ )//ゴーストマーカまで表示する場合
        for(var iMk=1; iMk<iMkrNum ; iMk++ )
        {
            sphere[iMk] = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere[iMk].castShadow=true;
            mkrGroup.add(sphere[iMk]);
        }
        scene.add(mkrGroup);

        //▼リンク ここではダミーの位置に追加するのみ
        for(var iLink=0; iLink < iLinkFrom.length; iLink++ )
        {
            var col;
            switch( iLinkSide[iLink])
            {
                case 0:
                    col = 0x0000ff;
                    break;
                case 1:
                    col = 0xff0000;
                    break;
                default:
                    col = 0x00ff00;
            }                        
            var material = new THREE.MeshLambertMaterial( { color: col } );
            cylinder[iLink] = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 1, 0, 0, true), material);
            cylinder[iLink].castShadow=true;
            linkGroup.add(cylinder[iLink]);
        }
        scene.add(linkGroup);

        //▼ LOPの軌跡を描く
        for(var iMk=1; iMk<iMkrNum ; iMk++ )
        {
            trajectoryGroup.add(createLOPTrajectory(iMk));
        }   
        scene.add(trajectoryGroup);
        //LOPの軌跡オブジェクトを作成
        function createLOPTrajectory(iMk)
        {
            var positions = [];
            var colors = [];     
            var color = new THREE.Color();

            for ( var i = 0; i < iDataCount; i++ ) 
            {
                positions.push( mkr[iMk][i].x, mkr[iMk][i].y, mkr[iMk][i].z);
                color.setHSL( i/iDataCount , 1.0, 0.5 );
                colors.push( color.r, color.g, color.b );
            }

            var geometry = new THREE.LineGeometry();
            geometry.setPositions( positions );
            geometry.setColors( colors );
            
            matLine = new THREE.LineMaterial( {
                color: 0xffffff,
                linewidth: .004,//5, // in pixels
                vertexColors: THREE.VertexColors,
                dashed: false
            } );

            line = new THREE.Line2( geometry, matLine );
        
            line.computeLineDistances();
            line.scale.set( 1, 1, 1 );

            return line;
        }
    }
    //-----------------------------------------------------------------------------------------
    //▼ アニメーション（60fpsごとに呼び出される）
    function renderScene()
    {
        var delta = clock.getDelta();

        iF++;;
        if( iF >= iDataCount) iF = 0;

        //iF=60;

        //▼　マーカの位置の移動
        //for(var iMk=1; iMk<iMkrNum + iGoastMkrNum ; iMk++ )
        for(var iMk=1; iMk<iMkrNum ; iMk++ )
            sphere[iMk].position.set(mkr[iMk][iF].x, mkr[iMk][iF].y, mkr[iMk][iF].z);

        //▼ リンクの位置の移動
        for(var iLink=0; iLink < iLinkFrom.length; iLink++ )
            moveCilynder(mkr[iLinkFrom[iLink]][iF], mkr[iLinkTo[iLink]][iF], cylinder[iLink]);

        //FBXのアニメーション
        //if ( mixer ) mixer.update( delta );
        //if(0)
        if ( myModel )
        {     
            objHip.position.z = +mkr[13][iF].z/dModelScale;
            objHip.position.x = +mkr[13][iF].x/dModelScale;
            objHip.position.y = +mkr[13][iF].y/dModelScale;
 
            var vx = new THREE.Vector3(1,0,0);
            var vy = new THREE.Vector3(0,1,0);
            var vz = new THREE.Vector3(0,0,1);

            //▼一つ前のフレームのクォータニオンをかけて、初期姿勢に戻す
            if(quaHipPre)
            {
                //Hip
                objHip.applyQuaternion( quaHipPre.inverse() );
                //上肢
                objSpine1.applyQuaternion( quaSpine1Pre.inverse());
                objSpine2.applyQuaternion( quaSpine2Pre.inverse());
//                objLArm.applyQuaternion( quaLArmPre.inverse());

                //右足
                objRUpLeg.applyQuaternion(quaRUpLegPre.inverse());
                objRLeg.applyQuaternion( quaRLegPre.inverse());
                objRFoot.applyQuaternion( quaRFootPre.inverse());
                //左足
                objLUpLeg.applyQuaternion(quaLUpLegPre.inverse());
                objLLeg.applyQuaternion( quaLLegPre.inverse());
                objLFoot.applyQuaternion( quaLFootPre.inverse());
            }

            //▼初期姿勢に対してクォータニオンをかけて向きを決める

            var v1312 = mkr[12][iF].clone().sub(mkr[13][iF]).normalize();
            var v45 = mkr[5][iF].clone().sub(mkr[4][iF]).normalize();
            var vHipz = v1312.clone().cross(v45).normalize();
            var vHipy = v45.clone().cross(vHipz).normalize();

            var vSpine1y = v1312.clone().normalize();
            var vSpine1z = vHipz.clone();

            var v23 = mkr[3][iF].clone().sub(mkr[2][iF]).normalize();
            var vSpine2z = v1312.clone().cross(v23).normalize();
            var vSpine2y = v23.clone().cross(vSpine1z).normalize();


            var v75 = mkr[15][iF].clone().sub(mkr[17][iF]).normalize();
            var v97 = mkr[17][iF].clone().sub(mkr[19][iF]).normalize();
            var v119 = mkr[19][iF].clone().sub(mkr[21][iF]).normalize();
            var vRAn = v119.clone().cross(v97).normalize();
            var vRULz = vRAn.clone().cross(v75).normalize();
            var vRLz = vRAn.clone().cross(v97).normalize();
            var vRFz = vRAn.clone().cross(v119).normalize();


            //◆Hip
            var quaHip = rotateVectorsSimultaneously(vy,vz,vHipy,vHipz);
            objHip.applyQuaternion( quaHip );
            quaHipPre = quaHip.clone();



            //▼ 右足 --------------------------------
            //◆RUpLeg
            var quaRUpLeg = rotateVectorsSimultaneously(vy,vz,v75,vRULz);
            objRUpLeg.applyQuaternion( quaRUpLegPre = quaHip.clone().inverse().multiply(quaRUpLeg));//Hip(親)の回転をキャンセル⇒保存
            //◆RLeg
            var quaRLeg = rotateVectorsSimultaneously(vy,vz,v97,vRLz);
            objRLeg.applyQuaternion( quaRLegPre = quaRUpLeg.clone().inverse().multiply(quaRLeg));//ULeg(親)の回転をキャンセル⇒保存
            //◆RUpFoot
            var quaRFoot = rotateVectorsSimultaneously(vRFy_Home,vRFz_Home,v119,vRFz);
            objRFoot.applyQuaternion( quaRFootPre = quaRLeg.clone().inverse().multiply(quaRFoot));//Leg(親)の回転をキャンセル⇒保存
            
            //▼ 左足 --------------------------------
            var v64 = mkr[14][iF].clone().sub(mkr[16][iF]).normalize();
            var v86 = mkr[16][iF].clone().sub(mkr[18][iF]).normalize();
            var v108 = mkr[18][iF].clone().sub(mkr[20][iF]).normalize();
            var vLAn = v108.clone().cross(v86).normalize();
            var vLULz = vLAn.clone().cross(v64).normalize();
            var vLLz = vLAn.clone().cross(v86).normalize();
            var vLFz = vLAn.clone().cross(v108).normalize();
            //◆LUpLeg
            var quaLUpLeg = rotateVectorsSimultaneously(vy,vz,v64,vLULz);
            objLUpLeg.applyQuaternion(quaLUpLegPre = quaHip.clone().inverse().multiply(quaLUpLeg));//Hip(親)の回転をキャンセル⇒保存
            //◆LLeg
            var quaLLeg = rotateVectorsSimultaneously(vy,vz,v86,vLLz);
            objLLeg.applyQuaternion( quaLLegPre = quaLUpLeg.clone().inverse().multiply(quaLLeg));//ULeg(親)の回転をキャンセル⇒保存
            //◆LUpFoot
            var quaLFoot = rotateVectorsSimultaneously(vLFy_Home,vLFz_Home,v108,vLFz);
            objLFoot.applyQuaternion( quaLFootPre = quaLLeg.clone().inverse().multiply(quaLFoot));//Leg(親)の回転をキャンセル⇒保存

            //▼ 体幹 --------------------------------
            //◆Spine1
            var quaSpine1 = rotateVectorsSimultaneously(vy,vz,vSpine1y,vSpine1z);
            objSpine1.applyQuaternion( quaSpine1Pre = quaHip.clone().inverse().multiply(quaSpine1));//Hip(親)の回転をキャンセル⇒保存

            //◆Spine2
            var quaSpine2 = rotateVectorsSimultaneously(vy,vz,vSpine2y,vSpine2z);
            objSpine2.applyQuaternion( quaSpine2Pre = quaSpine1.clone().inverse().multiply(quaSpine2));//Spine1(親)の回転をキャンセル⇒保存

            //◆右腕
           // var quaRArm = quaLUpLeg.clone();//右腕は左大腿の動きをコピー
           // objRArm.applyQuaternion( quaRArmPre = quaSpine1.clone().inverse().multiply(quaRArm));//Spine1(親)の回転をキャンセル⇒保存
            //◆左腕
           // var quaLArm = quaRUpLeg.clone();//左腕は右大腿の動きをコピー
           // objLArm.applyQuaternion( quaLArmPre = quaSpine1.clone().inverse().multiply(quaLArm));//Spine1(親)の回転をキャンセル⇒保存

            //▼コントロールに合わせて表示/非表示を変更する
            myModel.visible = document.form1.showObj[3].checked;
        }

        
        //▼コントロールに合わせて表示/非表示を変更する
        mkrGroup.children.forEach(function(child){
            child.visible = document.form1.showObj[0].checked;
        });
        linkGroup.children.forEach(function(child){
            child.visible = document.form1.showObj[1].checked;
        });
        trajectoryGroup.children.forEach(function(child){
            child.visible = document.form1.showObj[2].checked;
        });

        requestAnimationFrame(renderScene);//60fpsで再生しようとする
        orbitcontrols.update();
        renderer.render(scene, cameraNow);
    }
    
    //-----------------------------------------------------------------------------------------
    //▼ u0,v0 -> u2,v2に回転するクォータニオンを求める
    //https://stackoverflow.com/questions/19445934/quaternion-from-two-vector-pairs
    const rotateVectorsSimultaneously = (u0, v0, u2, v2) => {
    //function rotateVectorsSimultaneously(u0, v0, u2, v2){
        const q2 = new THREE.Quaternion().setFromUnitVectors(u0, u2);

        const v1 = v2.clone().applyQuaternion(q2.clone().conjugate());

        const v0_proj = v0.projectOnPlane(u0);
        const v1_proj = v1.projectOnPlane(u0);

        let angleInPlane = v0_proj.angleTo(v1_proj);
        if (v1_proj.dot(new THREE.Vector3().crossVectors(u0, v0)) < 0) {
            angleInPlane *= -1;
        }
        const q1 = new THREE.Quaternion().setFromAxisAngle(u0, angleInPlane);

        const q = new THREE.Quaternion().multiplyQuaternions(q2, q1);
        return q;
    };

    //-----------------------------------------------------------------------------------------
    //▼　リンクの線をVecFromからVecToに向ける。長さ1のCylinderを最初に作っておく
    //　　http://himadeus.hatenadiary.jp/entry/2013/04/28/142846
    function moveCilynder(vecFrom,vecTo,cylinder)
    {
        //From -> Toのベクトルを作る
        var v = vecTo.clone().sub(vecFrom);
        var len = v.length();
        //向きを変える
        if (len > 0.001) 
        {
            cylinder.rotation.z = Math.acos(v.y/len);
            cylinder.rotation.y = 0.5*Math.PI + Math.atan2(v.x, v.z);
            cylinder.rotation.order = 'YZX';
        }
        //位置を移動
        cylinder.position.x = (parseFloat(vecFrom.x) + parseFloat(vecTo.x))/2;
        cylinder.position.y = (parseFloat(vecFrom.y) + parseFloat(vecTo.y))/2;
        cylinder.position.z = (parseFloat(vecFrom.z) + parseFloat(vecTo.z))/2;
        //長さを変える
        cylinder.scale.set(1,len,1);
    }

}
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//▼画面のリサイズ時に読み込まれる
function onResize()
{
    canW = window.innerWidth ;
    canH = window.innerHeight;
    camera.aspect = canW / canH;
    camera.updateProjectionMatrix();
    renderer.setSize(canW, canH);

    // update the camera
    var dRate = window.innerWidth/window.innerHeight;
    var dH=100;
    camera2.left    = -dH*dRate;
    camera2.right   = dH*dRate;
    camera2.top     = dH;
    camera2.bottom  = -dH;
    camera2.updateProjectionMatrix();    
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//▼前額面
function onXZ()
{
    bxz *=-1;
    camera2.position.set( 0, -bxz*300, faveZ);                
    camera2.up = new THREE.Vector3(0,0,1);//Z UPにする
    camera2.lookAt(new THREE.Vector3(0,0,faveZ));
    cameraNow=camera2;

}
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//▼矢状面
function onYZ()
{
    byz *=-1;
    camera2.position.set( -byz*300, 0, faveZ);                
    camera2.up = new THREE.Vector3(0,0,1);//Z UPにする
    camera2.lookAt(new THREE.Vector3(0,0,faveZ));
    cameraNow=camera2;

}
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//▼水平面
function onXY()
{
    //bxy*=-1;
   // camera2.position.set( 0, 0, bxy*300);  
    camera2.position.set( 0, 0, 300);  
    camera2.up = new THREE.Vector3(0,1,0);//Y UPにする
    camera2.lookAt(new THREE.Vector3(0,0,0));
    cameraNow=camera2;

}	
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//▼リセット
function onReset()
{
    camera.position.set( -200, 350, 100);
    cameraNow=camera;
}	


