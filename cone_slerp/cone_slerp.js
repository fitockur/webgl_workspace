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
  '    specular = pow(max(dot(reflectVec, viewVec), 0.0), 120.0);\n' +
  '  }\n' +
  '  gl_FragColor.rgb = vec3(0.2,0,0) + vec3(1, 0, 0) * d + specular;\n' + // отраженный свет равен сумме фонового, диффузного и зеркального отражений света
  '  gl_FragColor.a = 1.0;\n' +
  '}\n';

function main() {
  var canvas = document.getElementById('webgl');
  var gl = canvas.getContext('webgl2');
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
  gl.uniform3f(u_LightPosition, 0,25,0);

  var viewMatrix = mat4.create();
  var projMatrix = mat4.create();
  
  mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width/canvas.height, 5, 100); 
  mat4.lookAt(viewMatrix, [0,5,15], [0,0,0], [0,1,0]);
  gl.uniformMatrix4fv(u_perspectiveMatrix, false, projMatrix);
  gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(u_fViewMatrix, false, viewMatrix);
  
  var center_coord1 = vecFromStr(document.getElementById('center_coord1').value);
  var axis_dir1 = vecFromStr(document.getElementById('axis_dir1').value);
  vec3.normalize(axis_dir1, axis_dir1);
  var center_coord2 = vecFromStr(document.getElementById('center_coord2').value);
  var axis_dir2 = vecFromStr(document.getElementById('axis_dir2').value);
  vec3.normalize(axis_dir2, axis_dir2);

  // START
  var q1 = quat.create();
  var modelMatrix = mat4.create();
  var axis = vec3.fromValues(0,1,0);
  var rad = vec3.angle(axis, axis_dir1);
  vec3.cross(axis, axis, axis_dir1);
  quat.setAxisAngle(q1, axis, rad);
  

  //END
  var q2 = quat.create();
  axis = vec3.fromValues(0,1,0);
  rad = vec3.angle(axis, axis_dir2);
  vec3.cross(axis, axis, axis_dir2);
  quat.setAxisAngle(q2, axis, rad);

  var t = 0;
  var tick = function() {
    t += 0.01;  // Update the rotation angle
    draw(gl, n, t, modelMatrix, u_ModelMatrix, q1, q2, center_coord1, center_coord2); // Draw the triangle
    if (t<=1) {
    requestAnimationFrame(tick, canvas); // Request that the browser calls tick
    }
  };
  tick();
}

function initVertexBuffers(gl) {

  function setVertices(length) {
    var r = Number(document.getElementById('radius').value);
    var h = Number(document.getElementById('height').value);
    var vertices = [];
    vertices.push(.0, h, .0,);
    for (var i = 0; i < 2 * Math.PI; i += 2 * Math.PI / length) {
        vertices.push(r * Math.cos(i), 0, r * Math.sin(i),)
    }
    vertices.push(.0, 0.0, .0,);
    return vertices;
}

function setNormals(length, v) {
    var normals = [];
    var vector1;
    var vector2;
    const n = vec3.fromValues(0, -1, 0);
    normals.push(v[0], v[1], v[2]);
    for (let i = 3; i < v.length-3; i += 3) {
        // вектор из текущей точки с направлением на вершину конуса
        vector1 = vec3.fromValues(v[0]-v[i],v[1]-v[i+1],v[2]-v[i+2]);
        // вектор из текущей точки с направлением на центр основания конуса
        vector2 = vec3.fromValues(-v[i],-v[i+1],-v[i+2]);
        // вектор кассательный в текущей точке
        vec3.cross(vector2, vector1, vector2);
        // вектор перпендикулярный образующей конуса
        vec3.cross(vector2, vector1, vector2);
        vec3.normalize(vector2, vector2);
        // усредненный вектор
        vec3.add(vector2, n, vector2);

        normals.push(vector2[0], vector2[1], vector2[2]);
    }        
    normals.push(n[0], n[1], n[2]);
    return normals;
}
function setIndices(length) {
    indices = [];
    for (var i = 0; i<=length; i++) {
        indices.push(i);
    }
    indices.push(1, 255, length + 1);
    for (var i = 1; i<=length; i++) {
        indices.push(i);
    }
    indices.push(1);
    return indices;
}

var len = Number(document.getElementById('grid').value);
var vertices = new Float32Array(setVertices(len));
var normals = new Float32Array(setNormals(len, vertices));

// Индексы вершин для построения треугольников
var indices = new Uint8Array(setIndices(len));

// Write the vertex property to buffers (coordinates, colors and normals)
if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

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

function draw(gl, n, t, modelMatrix, u_ModelMatrix, q1, q2, center_coord1, center_coord2) {
  q = quat.create();
  v = vec3.create();
  quat.slerp(q, q1, q2, t);
  vec3.lerp(v, center_coord1, center_coord2, t)
  mat4.fromRotationTranslation(modelMatrix, q, v);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw the rectangle
  gl.drawElements(gl.TRIANGLE_FAN, n, gl.UNSIGNED_BYTE, 0);
}

function vecFromStr(str) {
  xyz = str.split(",");
  return vec3.fromValues(xyz[0], xyz[1], xyz[2]);
}
