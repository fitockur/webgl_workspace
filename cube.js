var VSHADER_SOURCE =
  'uniform mat4 u_perspectiveMatrix;\n' +
  'uniform mat4 u_modelMatrix;\n' +
  'uniform mat4 u_viewMatrix;\n' +

  'attribute vec4 a_Position;\n' +
  'attribute vec3 a_Normal;\n' +

  'varying vec4 v_Position;\n' +
  'varying vec3 v_Normal;\n' +

  'void main() {\n' +
  '  mat4 modelViewMatrix = u_viewMatrix * u_modelMatrix;\n' +
  '  v_Position = modelViewMatrix * a_Position;\n' +
  '  gl_Position = u_perspectiveMatrix * v_Position;\n' +
  '  v_Normal = normalize( mat3(modelViewMatrix) * a_Normal);\n' + 
  '}\n';

var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'uniform mat4 u_fViewMatrix;\n' +
  'uniform vec3 u_lightPosition;\n' +

  'varying vec4 v_Position;\n' +
  'varying vec3 v_Normal;\n' +
  'void main() {\n' +
  '  vec3 normal = normalize(v_Normal);\n' + // получаем нормаль
  '  vec3 lightPosition = vec3(u_fViewMatrix * vec4(u_lightPosition, 1) - v_Position);\n' + // получаем вектор направления света
  '  vec3 lightDir = normalize(lightPosition);\n' +
  '  float lightDist = length(lightPosition);\n' +

  '  float specular = 0.0;\n' +
  '  float d = max(dot(v_Normal, lightDir), 0.0);\n' + // получаем скалярное произведение векторов нормали и направления света
  '  if (d > 0.0) {\n' +
  '    vec3 viewVec = vec3(0,0,1.0);\n' +
  '    vec3 reflectVec = reflect(-lightDir, normal);\n' + // получаем вектор отраженного луча
  '    specular = pow(max(dot(reflectVec, viewVec), 0.0), 160.0);\n' +
  '  }\n' +
  '  gl_FragColor.rgb = vec3(0.1,0.1,0.1) + vec3(0, 1, 1) * d + specular;\n' + // отраженный свет равен сумме фонового, диффузного и зеркального отражений света
  '  gl_FragColor.a = 1.0;\n' +
  '}\n';

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Set the clear color and enable the depth test
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage locations of uniform variables
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_modelMatrix');
  var u_viewMatrix = gl.getUniformLocation(gl.program, 'u_viewMatrix');
  var u_perspectiveMatrix = gl.getUniformLocation(gl.program, 'u_perspectiveMatrix');

  var u_fViewMatrix = gl.getUniformLocation(gl.program, 'u_fViewMatrix');
  var u_LightPosition = gl.getUniformLocation(gl.program, 'u_lightPosition');

  if (!u_ModelMatrix || !u_viewMatrix || !u_perspectiveMatrix || !u_fViewMatrix || !u_LightPosition) { 
    console.log('Failed to get the storage location');
    return;
  }

  // Set the light direction (in the world coordinate)
  gl.uniform3f(u_LightPosition, 6,6,14);

  var viewMatrix = mat4.create();
  var projMatrix = mat4.create();
  

  mat4.perspective(projMatrix, glMatrix.toRadian(30), canvas.width/canvas.height, 1, 100); 
  mat4.lookAt(viewMatrix, [6,6,14], [0,0,0], [0,1,0]);
  
  // Зарегистрировать обработчик событий
    var currentAngle = [0.0, 0.0]; // [ось X, ось Y] градусы
    initEventHandlers(canvas, currentAngle);
    var tick = function() { // Начало рисования
        draw(gl, n, projMatrix, viewMatrix, u_perspectiveMatrix, u_viewMatrix, currentAngle);
        requestAnimationFrame(tick, canvas);
    };
    tick();

    function initEventHandlers(canvas, currentAngle) {
        var dragging = false;
        // Буксировать или нет
        var lastX = -1, lastY = -1; // Последняя позиция указателя мыши
        canvas.onmousedown = function(ev) { // Кнопка мыши нажата
            var x = ev.clientX, y = ev.clientY;
            // Начать буксировку, если указатель в пределах элемента <canvas>
            var rect = ev.target.getBoundingClientRect();
            if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
                lastX = x; lastY = y;
                dragging = true;
            }
        };

        // Кнопка мыши отпущена
        canvas.onmouseup = function(ev) { dragging = false; };

        canvas.onmousemove = function(ev) { // Перемещение указателя
            var x = ev.clientX, y = ev.clientY;
            if (dragging) {
                var factor = 100/canvas.height; // Скорость вращения
                var dx = factor * (x - lastX);
                var dy = factor * (y - lastY);
                // Ограничить угол поворота по оси X от -90 до 90 градусов
                currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
                currentAngle[1] = currentAngle[1] + dx;
            }
            lastX = x, lastY = y;
        };
    }

    function draw(gl, n, projMatrix, viewMatrix, u_perspectiveMatrix, u_viewMatrix, currentAngle) {
        var modelMatrix = mat4.create();
        mat4.rotateX(modelMatrix, modelMatrix, glMatrix.toRadian(currentAngle[0]));// ось X
        mat4.rotateY(modelMatrix, modelMatrix, glMatrix.toRadian(currentAngle[1])) // ось Y

        gl.uniformMatrix4fv(u_perspectiveMatrix, false, projMatrix);
        gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
    }
}

function initVertexBuffers(gl) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  // Coordinates
  var vertices = new Float32Array([
     2.0, 2.0, 2.0,  -2.0, 2.0, 2.0,  -2.0,-2.0, 2.0,   2.0,-2.0, 2.0, // v0-v1-v2-v3 front
     2.0, 2.0, 2.0,   2.0,-2.0, 2.0,   2.0,-2.0,-2.0,   2.0, 2.0,-2.0, // v0-v3-v4-v5 right
     2.0, 2.0, 2.0,   2.0, 2.0,-2.0,  -2.0, 2.0,-2.0,  -2.0, 2.0, 2.0, // v0-v5-v6-v1 up
    -2.0, 2.0, 2.0,  -2.0, 2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0,-2.0, 2.0, // v1-v6-v7-v2 left
    -2.0,-2.0,-2.0,   2.0,-2.0,-2.0,   2.0,-2.0, 2.0,  -2.0,-2.0, 2.0, // v7-v4-v3-v2 down
     2.0,-2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0, 2.0,-2.0,   2.0, 2.0,-2.0  // v4-v7-v6-v5 back
  ]);

  // Normal
  var normals = new Float32Array([
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);

  // Indices of the vertices
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
 ]);

  // Write the vertex property to buffers (coordinates, colors and normals)
  if (!initArrayBuffer(gl, 'a_Position', vertices, 3)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3)) return -1;

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBuffer(gl, attribute, data, num) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, gl.FLOAT, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  return true;
}