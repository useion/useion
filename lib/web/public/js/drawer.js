
var IntersectsRepository = {
  
  meshes: [],
  intersects: {},
  intersected: null,

  add: function (mesh, obj) {
    this.meshes.push(mesh);
    this.intersects[mesh.uuid] = obj;
  },

};

var Drawer = {

    element:        null,
    size:           null,
    scene:          null,
    camera:         null,
    renderer:       null,
    controls:       null,
    raycaster:      null,
	cubeSize: 		10000,
    mouseOver:      false,
    mouse:          new THREE.Vector2(),
    lastMouseDownTime:  null,
    zShift:         0.15,
    // blue, white
    bgColor:        0xffffff,//0x486b8f, 0xffffff
    textSize:       1,
    smallTextSize:  0.7,
    lineSpacing:    0.5,
    textColor:      0x000000,//0xffffff, 0xffffff
    textBgEdgesColor: 0x999999,//0x333333, 0x999999
    textBgColor:    0xdddddd,//0x333333, 0xdddddd
    textBgOpacity:  1,
    textBgColor2:   0xdddddd,//0x333333, 0xdddddd
    textBgOpacity2: 0.5,
    textMargin:     0.5,
    arrowColor:     0x000000,//0xffffff, 0x000000

    linesBg: [],

    init: function (element, size, position, settings) {
        this.element = element;
        this.scene = new THREE.Scene();
        this.size = size;

        var VIEW_ANGLE = 45, NEAR = 0.1, FAR = 20000;
        this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, size.width/size.height, NEAR, FAR);

        this.camera.lookAt(this.scene.position);
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize( this.size.width,  this.size.height );//window.innerWidth, window.innerHeight );

        if (settings.walk) {

          this.camera.position.x = position.x;
          this.camera.position.y = position.y;
          this.camera.position.z = position.z;
        } else {

          this.camera.position.x = position.x;
          this.camera.position.y = position.y;
          this.camera.position.z = position.z;

          this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
          this.controls.userPanSpeed = 0.4;

        }

        var backgroundGeometry = new THREE.CubeGeometry( this.cubeSize, this.cubeSize, this.cubeSize );
        var backgroundMaterial = new THREE.MeshBasicMaterial( { color: this.bgColor, side: THREE.BackSide } );
        var backgroundBox = new THREE.Mesh( backgroundGeometry, backgroundMaterial );
        IntersectsRepository.add(backgroundBox, {mesh: backgroundBox});
        this.scene.add(backgroundBox);

        var that = this;
        this.raycaster = new THREE.Raycaster();

        if (this.mouseOver) {
          document.addEventListener( 'mousemove', function (event) {
              // event.preventDefault();

              that.mouse.x = ( (event.clientX-that.size.left) / (that.size.width) ) * 2 - 1;
              that.mouse.y = - ( (event.clientY-that.size.top) / (that.size.height) ) * 2 + 1;
          }, false );
        }

        document.addEventListener( 'mouseup',  function (event) {

            for (var i in that.linesBg) {
              that.linesBg[i].color = new THREE.Color(that.textBgColor);
              that.linesBg[i].opacity = that.textBgOpacity;
            }

        });

        document.addEventListener( 'mousedown',  function (event) {
            // event.preventDefault();

            var mouse = new THREE.Vector2();
            mouse.x = ( (event.clientX-that.size.left) / (that.size.width) ) * 2 - 1;
            mouse.y = - ( (event.clientY-that.size.top) / (that.size.height) ) * 2 + 1;

            that.raycaster.setFromCamera( mouse, that.camera );

            var intersects = that.raycaster.intersectObjects( IntersectsRepository.meshes );

            if (that.lastMouseDownTime && (new Date().getTime()) - that.lastMouseDownTime <= 300) {
              that.onDoubleMouseClick(intersects[0].object);
            } else {
              that.onMouseClick(intersects[0].object);
              that.lastMouseDownTime = new Date().getTime();
            }

            if (that.size.left <= event.clientX && event.clientX <= that.size.left+that.size.width &&
                that.size.top <= event.clientY && event.clientY <= that.size.top+that.size.height)
              for (var i in that.linesBg) {
                that.linesBg[i].color = new THREE.Color(that.textBgColor2);
                that.linesBg[i].opacity = that.textBgOpacity2;
              }

        }, false );


        element.appendChild( this.renderer.domElement );
    },

    redraw: function (size) {
      this.size = size;
      this.renderer.setSize( this.size.width,  this.size.height );
      this.camera.setViewOffset(this.size.width, this.size.height, 0, 0, this.size.width, this.size.height);
    },

    onMouseOver: function (object) {
        var intersect = IntersectsRepository.intersects[object.uuid];
        if (intersect.mouseOver)
            intersect.mouseOver(intersect);
    },

    onMouseOut: function (object) {
        var intersect = IntersectsRepository.intersects[object.uuid];
        if (intersect.mouseOut)
            intersect.mouseOut(intersect);
    },

    onMouseClick: function (object) {
        if (object) {
            var intersect = IntersectsRepository.intersects[object.uuid];
            if (intersect.mouseClick)
                intersect.mouseClick(intersect);
        }
    },
    onDoubleMouseClick: function (object) {
        if (object) {
            var intersect = IntersectsRepository.intersects[object.uuid];
            if (intersect.doubleMouseClick)
                intersect.doubleMouseClick(intersect);
        }
    },

    render: function () {

        var that = this;

        var renderF = function () {
            requestAnimationFrame( renderF );
            if (that.controls)
              that.controls.update();

            TWEEN.update();

            // MOUSE out and over
            if (this.mouseOver) {
              that.raycaster.setFromCamera( that.mouse, that.camera );

              var intersects = that.raycaster.intersectObjects( IntersectsRepository.meshes );

              if (intersects.length > 0) {
                  if (IntersectsRepository.intersected !== intersects[0].object) {
                      if (IntersectsRepository.intersected) {
                          that.onMouseOut(IntersectsRepository.intersected);
                      }

                      IntersectsRepository.intersected = intersects[0].object;

                      that.onMouseOver(intersects[0].object);
                  }
              }
            }

            that.renderer.render(that.scene, that.camera);
        };

        renderF();
    },

    drawLines: function (options) {

        var line = 0,
                lineShift = this.textSize+this.lineSpacing,
                maxWidth = 0,
                maxHeight = 0,
                that = this,
                linesReturn = [];

        for (var i in options.lines) {
            var textShapes = THREE.FontUtils.generateShapes(
                    options.lines[i].text,
                    {
                        'font' : 'helvetiker',
                        'weight' : 'normal',
                        'style' : 'normal',
                        'size' : this.textSize
                    });
            var textG = new THREE.ShapeGeometry( textShapes );
            var textMesh = new THREE.Mesh( textG, new THREE.MeshBasicMaterial( {
                color: that.textColor,
                side: THREE.DoubleSide
            }));

            var box = new THREE.Box3().setFromObject( textMesh );
            if (box.size().x > maxWidth) maxWidth = box.size().x;
            maxHeight += lineShift;

            line += 1;
            textMesh.position.set(options.position.x, options.position.y+(line*(-lineShift)), options.position.z+this.zShift);
            linesReturn[i] = {
              position: {x:options.position.x, y: options.position.y+(line*(-lineShift))+(box.size().y/2), z: options.position.z+this.zShift}
            };

            this.scene.add( textMesh );


            var geometry = new THREE.BoxGeometry( box.size().x, box.size().y, 0 );
            var material = new THREE.MeshBasicMaterial( {
                color: that.textBgColor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0
            } );
            var cube = new THREE.Mesh( geometry, material );
            cube.renderOrder = 1;
            cube.position.set(options.position.x+(box.size().x/2), options.position.y+(line*(-lineShift))+(box.size().y/2), options.position.z+this.zShift/2);

            linesReturn[i]['size'] = {
              x: box.size().x, y: box.size().y
            }

            IntersectsRepository.add(cube, {
                cube: cube,
                text: textMesh,
                mouseOver: options.lines[i].mouseOver,
                mouseOut: options.lines[i].mouseOut,
                mouseClick: options.lines[i].mouseClick,
                doubleMouseClick: options.lines[i].doubleMouseClick
            });
            this.scene.add( cube );
        }

        var margin = this.textMargin;
        var width = maxWidth+(margin*2), height = maxHeight+(margin*2);
        var geometry = new THREE.BoxGeometry( width, height, 0.01 );
        var material = new THREE.MeshBasicMaterial( {
            color: that.textBgColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: that.textBgOpacity
        } );
        var cube = new THREE.Mesh( geometry, material );
        cube.position.set(options.position.x+(maxWidth/2), options.position.y-(maxHeight/2)-(this.lineSpacing/2), options.position.z);

        IntersectsRepository.add(cube, {
            cube: cube,
            mouseOver: options.mouseOver,
            mouseOut: options.mouseOut,
            mouseClick: options.mouseClick,
            doubleMouseClick: options.doubleMouseClick
        });
        this.linesBg.push(material);
        this.scene.add( cube );

        var edges = new THREE.EdgesHelper( cube, this.textBgEdgesColor );
        this.scene.add( edges );

        return linesReturn;
    },

    drawArrow: function (options) {
        var sourcePos = new THREE.Vector3(options.src.x, options.src.y, options.src.z);
        var targetPos = new THREE.Vector3(options.dst.x, options.dst.y, options.dst.z);
        var direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
        var arrow = new THREE.ArrowHelper(
                direction.clone().normalize(),
                sourcePos,
                direction.length(),
                this.arrowColor
        );
        this.scene.add(arrow);

        if (options.text) {

          var textShapes = THREE.FontUtils.generateShapes(
                      options.text,
                      {
                          'font' : 'helvetiker',
                          'weight' : 'normal',
                          'style' : 'normal',
                          'size' : this.smallTextSize
                      });
          var textG = new THREE.ShapeGeometry( textShapes );
          var textMesh = new THREE.Mesh( textG, new THREE.MeshBasicMaterial( {
                  color: this.textColor,
                  side: THREE.DoubleSide
              }));

          var box = new THREE.Box3().setFromObject( textMesh );
          var textPosition = {
            x: (options.dst.x+options.src.x)/2-(box.size().x/2),
            y: (options.dst.y+options.src.y)/2-(box.size().y),
            z: (options.dst.z+options.src.z)/2
          };
          
          textMesh.position.set(textPosition.x, textPosition.y, textPosition.z+this.zShift/2);

          this.scene.add( textMesh );


          var geometry = new THREE.BoxGeometry( box.size().x, box.size().y, 0.01 );
          var material = new THREE.MeshBasicMaterial( {
              color: this.textBgColor,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: this.textBgOpacity
          } );
          var cube = new THREE.Mesh( geometry, material );
          cube.renderOrder = 1;
          cube.position.set(textPosition.x+(box.size().x/2), textPosition.y+(box.size().y/2), textPosition.z);

          this.linesBg.push(material);

          IntersectsRepository.add(cube, {
              cube: cube,
              text: textMesh,
              mouseOver: options.mouseOver,
              mouseOut: options.mouseOut,
              mouseClick: options.mouseClick,
              doubleMouseClick: options.doubleMouseClick
          });
          this.scene.add( cube );
          var edges = new THREE.EdgesHelper( cube, this.textBgEdgesColor );
          this.scene.add( edges );

        }
    },
    moveCameraTo: function (position, shiftZ) {
      var that = this;
        new TWEEN.Tween( this.controls.center ).to( {
            x: position.x,
            y: position.y,
            z: position.z}, 1000 ).start().onComplete(function () {
              new TWEEN.Tween( that.camera.position ).to( {
                  x: position.x,
                  y: position.y,
                  z: position.z+shiftZ}, 1000 ).start();
            });
    },
    destroy: function () {
      if (this.renderer)
        this.element.removeChild(this.renderer.domElement);
    }



};
