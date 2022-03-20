/**
 * @file MP3.js - A simple WebGL rendering engine
 * @author Brendan Parmer <bparmer2@illinois.edu>
 * @brief Rendering code for MP3 - simulating flight
 * 
 * Updated Spring 2021 for WebGL 2.0/GLSL 3.00 ES.
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas to draw on */
var canvas;

/** @global The GLSL shader program */
var shaderProgram;

/** @global An object holding the geometry for your 3D terrain */
var myTerrain;

/** @global The Model matrix */
var modelViewMatrix = glMatrix.mat4.create();
/** @global The Projection matrix */
var projectionMatrix = glMatrix.mat4.create();
/** @global The Normal matrix */
var normalMatrix = glMatrix.mat3.create();

// Material parameters
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [227/255, 227/255, 227/255];
/** @global Shininess exponent for Phong reflection */
var shininess = 100;

// Light parameters
/** @global Light position in world coordinates */
var lightPosition = [6, 5, 3];
/** @global Ambient light color/intensity for Phong reflection */
var ambientLightColor = [0.1, 0.1, 0.1];
/** @global Diffuse light color/intensity for Phong reflection */
var diffuseLightColor = [1.0, 1.0, 1.0];
/** @global Specular light color/intensity for Phong reflection */
var specularLightColor = [1, 1, 1];

/** @global Edge color for black wireframe */
var kEdgeBlack = [0.0, 0.0, 0.0];
/** @global Edge color for white wireframe */
var kEdgeWhite = [0.7, 0.7, 0.7];

/** @global Position of the camera */
var camPosition = glMatrix.vec3.create();

/** @global Default camera position */
var camPosDefault = glMatrix.vec3.fromValues(-5, 1, 0);

/** @global Orientation of the camera */
var camOrientation = glMatrix.quat.create();

/** @global Default camera orientation */
var camOrientationDefault = glMatrix.quat.create();

/** @global Speed of our camera */
var camSpeed = 0.5;

/** @global Initial view direction */
var camInitialDir = glMatrix.vec3.fromValues(5, -1, 0);

/** @global Time of previous frame */
var prev_time = 0;

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}


//-----------------------------------------------------------------------------
// Setup functions (run once)
/**
 * Startup function called from the HTML code to start program.
 */
function startup() {
  // Set up the canvas with a WebGL context.
  canvas = document.getElementById("glCanvas");
  gl = createGLContext(canvas);

  // Compile and link the shader program.
  setupShaders();

  document.addEventListener("keydown", keypress);
  // Let the Terrain object set up its own buffers.
  var scale = 5;
  myTerrain = new Terrain(64, -scale, scale, -scale, scale);
  myTerrain.setupBuffers(shaderProgram);

  camPosDefault = glMatrix.vec3.fromValues(-scale, myTerrain.maxY + 1.0, 0.0);
  resetCam();

  // Set the background color to sunset color
  gl.clearColor(100/255, 131/255, 153/255, 1.0);
  gl.enable(gl.DEPTH_TEST);
  requestAnimationFrame(animate);
}

/**
 * Handle different keys being pressed
 * @param {event} e - the event of the key press
 */
function keypress(e) {
  console.log(e.key);

  var d = 0.25;
  var eulerX = 0;
  var eulerY = 0;
  var eulerZ = 0;

  // pitch
  if (e.key === "ArrowLeft" || e.key === "a") {
    eulerX -= d;
  }
  else if (e.key === "ArrowRight" || e.key === "d") {
    eulerX += d;
  }

  // roll
  else if (e.key === "ArrowUp" || e.key === "w") {
    eulerZ += d;
  }
  else if (e.key === "ArrowDown" || e.key === "s") {
    eulerZ -= d;
  }
  //speed
  else if (e.key === "+" || e.key === "=") {
    camSpeed += 0.01;
  }
  else if (e.key === "-") {
    camSpeed -= 0.01;
  }

  //reset
  else if (e.key === "Escape") {
    resetCam();
  }
  var dOrientation = glMatrix.quat.create();
  glMatrix.quat.fromEuler(dOrientation, eulerX, eulerY, eulerZ);
  glMatrix.quat.multiply(camOrientation, camOrientation, dOrientation);
}


/**
 * Resets the camera to default position and orientation
 */
function resetCam() {
  camPosition = glMatrix.vec3.clone(camPosDefault);
  camOrientation = glMatrix.quat.clone(camOrientationDefault);
  glMatrix.vec3.normalize(camInitialDir, camInitialDir);
}

/**
 * Creates a WebGL 2.0 context.
 * @param {element} canvas The HTML5 canvas to attach the context to.
 * @return {Object} The WebGL 2.0 context.
 */
function createGLContext(canvas) {
  var context = null;
  context = canvas.getContext("webgl2");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads a shader from the HTML document and compiles it.
 * @param {string} id ID string of the shader script to load.
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
    
  // Return null if we don't find an element with the specified id
  if (!shaderScript) {
    return null;
  }
    
  var shaderSource = shaderScript.text;
  
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
  
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader; 
}

/**
 * Sets up the vertex and fragment shaders.
 */
function setupShaders() {
  // Compile the shaders' source code.
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  // Link the shaders together into a program.
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  // We only need the one shader program for this rendering, so we can just
  // bind it as the current program here.
  gl.useProgram(shaderProgram);

  // Query the index of each attribute and uniform in the shader program.
  shaderProgram.locations = {};
  shaderProgram.locations.vertexPosition =
    gl.getAttribLocation(shaderProgram, "vertexPosition");
  shaderProgram.locations.vertexNormal =
    gl.getAttribLocation(shaderProgram, "vertexNormal");

  shaderProgram.locations.modelViewMatrix =
    gl.getUniformLocation(shaderProgram, "modelViewMatrix");
  shaderProgram.locations.projectionMatrix =
    gl.getUniformLocation(shaderProgram, "projectionMatrix");
  shaderProgram.locations.normalMatrix =
    gl.getUniformLocation(shaderProgram, "normalMatrix");

  shaderProgram.locations.kSpecular =
    gl.getUniformLocation(shaderProgram, "kSpecular");
  shaderProgram.locations.shininess =
    gl.getUniformLocation(shaderProgram, "shininess");
  shaderProgram.locations.fogColor =
    gl.getUniformLocation(shaderProgram, "fogColor");
  shaderProgram.locations.fogDensity = 
    gl.getUniformLocation(shaderProgram, "fogDensity");
  
  shaderProgram.locations.lightPosition =
    gl.getUniformLocation(shaderProgram, "lightPosition");
  shaderProgram.locations.ambientLightColor =
    gl.getUniformLocation(shaderProgram, "ambientLightColor");
  shaderProgram.locations.diffuseLightColor =
  gl.getUniformLocation(shaderProgram, "diffuseLightColor");
  shaderProgram.locations.specularLightColor =
  gl.getUniformLocation(shaderProgram, "specularLightColor");

  shaderProgram.locations.minY =
    gl.getUniformLocation(shaderProgram, "minY");
  shaderProgram.locations.maxY =
    gl.getUniformLocation(shaderProgram, "maxY");
}

/**
 * Draws the terrain to the screen.
 */
function draw() {
  // Transform the clip coordinates so the render fills the canvas dimensions.
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // Clear the color buffer and the depth buffer.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  // Generate the projection matrix using perspective projection.
  const near = 0.1;
  const far = 200.0;
  glMatrix.mat4.perspective(projectionMatrix, degToRad(25), 
                            gl.viewportWidth / gl.viewportHeight,
                            near, far);
  
  // Generate the view matrix using lookat.
  //CAMERA STUFF
  const up = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);
  glMatrix.vec3.transformQuat(up, up, camOrientation);
  var dir = glMatrix.vec3.create();
  var lookAtPt = glMatrix.vec3.create();
  glMatrix.vec3.transformQuat(dir, camInitialDir, camOrientation);
  glMatrix.vec3.add(lookAtPt, camPosition, dir);
  glMatrix.mat4.lookAt(modelViewMatrix, camPosition, lookAtPt, up);

  lightPosition[1] = myTerrain.maxY + 3;
  setMatrixUniforms();
  setLightUniforms(ambientLightColor, diffuseLightColor, specularLightColor,
                   lightPosition);
  setHeightUniforms(myTerrain.minY, myTerrain.maxY);
  
  // Draw the triangles, the wireframe, or both, based on the render selection.
  if (document.getElementById("polygon").checked) { 
    setMaterialUniforms(kSpecular, shininess);
    myTerrain.drawTriangles();
  }
  else if (document.getElementById("wirepoly").checked) {
    setMaterialUniforms(kSpecular, shininess); 
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 1);
    myTerrain.drawTriangles();
    gl.disable(gl.POLYGON_OFFSET_FILL);
    setMaterialUniforms(kEdgeBlack, kEdgeBlack, kEdgeBlack, shininess);
    myTerrain.drawEdges();
  }
  else if (document.getElementById("wireframe").checked) {
    setMaterialUniforms(kEdgeBlack, shininess);
    myTerrain.drawEdges();
  }
  //set fog uniforms
  var fogColor = glMatrix.vec4.fromValues(0.3, 0.3, 0.3, 0.5);
  var fogDensity = 0.15;
  if (!document.getElementById("fog").checked) {
    fogDensity = 0.0;
  }
  gl.uniform4fv(shaderProgram.locations.fogColor, fogColor);
  gl.uniform1f(shaderProgram.locations.fogDensity, fogDensity);
}

/**
 * Sends the three matrix uniforms to the shader program.
 */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.locations.modelViewMatrix, false,
                      modelViewMatrix);
  gl.uniformMatrix4fv(shaderProgram.locations.projectionMatrix, false,
                      projectionMatrix);

  // We want to transform the normals by the inverse-transpose of the
  // Model/View matrix
  glMatrix.mat3.fromMat4(normalMatrix, modelViewMatrix);
  glMatrix.mat3.transpose(normalMatrix, normalMatrix);
  glMatrix.mat3.invert(normalMatrix, normalMatrix);

  gl.uniformMatrix3fv(shaderProgram.locations.normalMatrix, false,
                      normalMatrix);
}

/**
 * Sends material properties to the shader program.
 * @param {Float32Array} s Specular material color.
 * @param {Float32} alpha shininess coefficient
 */
function setMaterialUniforms(s, alpha) {
  gl.uniform3fv(shaderProgram.locations.kSpecular,    s);
  gl.uniform1f(shaderProgram.locations.shininess, alpha);
}

/**
 * Sends light information to the shader program.
 * @param {Float32Array} a Ambient light color/intensity.
 * @param {Float32Array} d Diffuse light color/intensity.
 * @param {Float32Array} s Specular light color/intensity.
 * @param {Float32Array} loc The light position, in view coordinates.
 */
function setLightUniforms(a, d, s, loc) {
  gl.uniform3fv(shaderProgram.locations.ambientLightColor,  a);
  gl.uniform3fv(shaderProgram.locations.diffuseLightColor,  d);
  gl.uniform3fv(shaderProgram.locations.specularLightColor, s);
  gl.uniform3fv(shaderProgram.locations.lightPosition,    loc);
}

/**
 * Sends height info to the fragment shader
 * @param min the min height of the terrain
 * @param max the max height of the terrain
 */
function setHeightUniforms(min, max) {
  gl.uniform1f(shaderProgram.locations.minY, min);
  gl.uniform1f(shaderProgram.locations.maxY, max);
}

/**
 * Animates...allows user to change the geometry view between
 * wireframe, polygon, or both.
 */
 function animate(currentTime) {
  var dPos = glMatrix.vec3.create();
  var forward = glMatrix.vec3.create();
  glMatrix.vec3.transformQuat(forward, camInitialDir, camOrientation);
  glMatrix.vec3.normalize(forward, forward);

  var scale = camSpeed * (currentTime - prev_time) * 0.0005;
  glMatrix.vec3.scale(dPos, forward, scale);
  glMatrix.vec3.add(camPosition, camPosition, dPos);

  // Draw the frame.
  draw();
  prev_time = currentTime;
  // Animate the next frame. 
  requestAnimationFrame(animate);
}