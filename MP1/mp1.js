/**
 * @file A simple WebGL example drawing a triangle with colors
 * @author Brendan Parmer <bparmer2@illinois.edu>
 * 
 * Updated Spring 2021 to use WebGL 2.0 and GLSL 3.00
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the main triangles */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The vertex array object for the main objects */
var vertexArrayObject;

/** @global GLSL shader program for the LCM */
var lcmShader;

/** @global The WebGL buffer holding the rocket triangles */
var lcmVPB;

/** @global The WebGL buffer holding the LCM vertex colors */
var lcmVCB;

/** @global The vertex array object for the LCM */
var lcmVAO;

/** @global The ModelView matrix contains any modeling and viewing transformations */
var modelViewMatrix = glMatrix.mat4.create();

/** @global Scale matrix on the z-axis */
var yScaleMatrix = glMatrix.mat4.create();

/** @global Translation matrix */
var translationMatrix = glMatrix.mat4.create();

/** @global Matrix we send along to the vertex shader */
var finalMatrix = glMatrix.mat4.create();

/** @global lcm matrix to send to shader*/
var lcmMatrix = glMatrix.mat4.create();

/** @global Records time last frame was rendered */
var previousTime = 0;

/** @global Which animation to use */
var animation = 0;

/** @global moon vertex positions */
var moon = [];

/** @global moon vertex colors */
var moon_colors = [];

/** @global lcm vertex positions */
var lcm = [];

/** @global lcm vertex colors */
var lcm_colors = [];


/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
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
 * Loads a shader.
 * Retrieves the source code from the HTML document and compiles it.
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
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
 * Set up the fragment and vertex shaders.
 */
function setupShaders() {
  // Compile the shaders' source code.
  vertexShader   = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  // Link the shaders together into a program.
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  //shader programs for lunar command module
  lcmVS = loadShaderFromDOM("shader_LCM-vs");
  lcmFS = loadShaderFromDOM("shader_LCM-fs");
  lcmShader = gl.createProgram();
  gl.attachShader(lcmShader, lcmVS);
  gl.attachShader(lcmShader, lcmFS);
  gl.linkProgram(lcmShader);
  
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }
  if (!gl.getProgramParameter(lcmShader, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }
  gl.useProgram(shaderProgram);
    
  // Query the index of each attribute in the list of attributes maintained
  // by the GPU. 
  shaderProgram.vertexPositionAttribute =
    gl.getAttribLocation(shaderProgram, "aVertexPosition");
  shaderProgram.vertexColorAttribute =
    gl.getAttribLocation(shaderProgram, "aVertexColor");
    
  //Get the index of the Uniform variable as well
  shaderProgram.modelViewMatrixUniform =
    gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
}

/**
 * Set up the buffers to hold the vertex positions and colors for the illini animation
 */
function setupBuffersIllini() {
  
  // Create the vertex array object, which holds the list of attributes for
  // the triangle.
  vertexArrayObject = gl.createVertexArray();
  gl.bindVertexArray(vertexArrayObject); 

  // Create a buffer for positions, and bind it to the vertex array object.
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

  var vertex_deform = document.getElementById("vertex_deform").value;
  edge_x = Math.abs((Math.cos(vertex_deform*previousTime - 3))**2 * 0.4) + 0.2;
  // Define Block I in clip coordinates.
  var block_i = [
    //top front
    -edge_x, 0.8,  0.0,
    -edge_x, 0.45, 0.0,
    -0.2,    0.45, 0.0,

    -edge_x, 0.8,  0.0,
     edge_x, 0.8,  0.0,
    -0.2,   0.45,  0.0,

     edge_x, 0.8,  0.0,
    -0.2,   0.45,  0.0,
     0.2,   0.45,  0.0, 

     edge_x, 0.8,  0.0,
     edge_x, 0.45, 0.0,
     0.2,    0.45, 0.0,
    
    
    //middle front
    -0.2,  0.45, 0.0,
    -0.2, -0.45, 0.0,
     0.2, -0.45, 0.0,

     0.2, -0.45, 0.0,
     0.2,  0.45, 0.0,
    -0.2,  0.45, 0.0,
    
    //bottom front
    -edge_x, -0.8,  0.0,
    -edge_x, -0.45, 0.0,
    -0.2,    -0.45, 0.0,

    -edge_x, -0.8,  0.0,
     edge_x, -0.8,  0.0,
    -0.2, -0.45, 0.0,

     edge_x, -0.8,  0.0,
    -0.2,    -0.45, 0.0,
     0.2,    -0.45, 0.0, 

     edge_x, -0.8,  0.0,
     edge_x, -0.45, 0.0,
     0.2,    -0.45, 0.0,

    /**
    //top back
    -0.6, 0.8,  -0.3,
    -0.6, 0.45, -0.3,
    -0.2, 0.45, -0.3,

    -0.6, 0.8,  -0.3,
     0.6, 0.8,  -0.3,
    -0.2, 0.45, -0.3,

     0.6, 0.8,  -0.3,
    -0.2, 0.45, -0.3,
     0.2, 0.45, -0.3, 

     0.6, 0.8,  -0.3,
     0.6, 0.45, -0.3,
     0.2, 0.45, -0.3,

    //middle back
    -0.2,  0.45, -0.3,
    -0.2, -0.45, -0.3,
     0.2, -0.45, -0.3,

     0.2, -0.45, -0.3,
     0.2,  0.45, -0.3,
    -0.2,  0.45, -0.3,
      
    //bottom back
    -0.6, -0.8,  -0.3,
    -0.6, -0.45, -0.3,
    -0.2, -0.45, -0.3,

    -0.6, -0.8,  -0.3,
     0.6, -0.8,  -0.3,
    -0.2, -0.45, -0.3,

     0.6, -0.8,  -0.3,
    -0.2, -0.45, -0.3,
     0.2, -0.45, -0.3, 

     0.6, -0.8,  -0.3,
     0.6, -0.45, -0.3,
     0.2, -0.45, -0.3,
    
    //siding top
    -0.6, 0.8,  0.0,
     0.6, 0.8,  0.0,
    -0.6, 0.8, -0.3,

    -0.6, 0.8, -0.3,
     0.6, 0.8,  0.0,
     0.6, 0.8, -0.3,
    
    -0.6, 0.8,   0.0,
    -0.6, 0.45, -0.3,
    -0.6, 0.45,  0.0,

    -0.6, 0.8,   0.0,
    -0.6, 0.45, -0.3,
    -0.6, 0.8,  -0.3,

     0.6, 0.8,   0.0,
     0.6, 0.45, -0.3,
     0.6, 0.45,  0.0,

     0.6, 0.8,   0.0,
     0.6, 0.45, -0.3,
     0.6, 0.8,  -0.3,

    -0.6, 0.45,  0.0,
    -0.2, 0.45, -0.3,
    -0.6, 0.45, -0.3,

    -0.6, 0.45,  0.0,
    -0.2, 0.45, -0.3,
    -0.2, 0.45,  0.0,

     0.6, 0.45,  0.0,
     0.2, 0.45, -0.3,
     0.6, 0.45, -0.3,

     0.6, 0.45,  0.0,
     0.2, 0.45, -0.3,
     0.2, 0.45,  0.0,

    //siding middle
    -0.2,  0.45,  0.0,
    -0.2, -0.45, -0.3,
    -0.2, -0.45,  0.0,

    -0.2,  0.45,  0.0,
    -0.2, -0.45, -0.3,
    -0.2,  0.45, -0.3,

     0.2,  0.45,  0.0,
     0.2, -0.45, -0.3,
     0.2, -0.45,  0.0,

     0.2,  0.45,  0.0,
     0.2, -0.45, -0.3,
     0.2,  0.45, -0.3,

    //siding bottom
    -0.6, -0.8,  0.0,
     0.6, -0.8,  0.0,
    -0.6, -0.8, -0.3,

    -0.6, -0.8, -0.3,
     0.6, -0.8,  0.0,
     0.6, -0.8, -0.3,
    
    -0.6, -0.8,   0.0,
    -0.6, -0.45, -0.3,
    -0.6, -0.45,  0.0,

    -0.6, -0.8,   0.0,
    -0.6, -0.45, -0.3,
    -0.6, -0.8,  -0.3,

     0.6, -0.8,   0.0,
     0.6, -0.45, -0.3,
     0.6, -0.45,  0.0,

     0.6, -0.8,   0.0,
     0.6, -0.45, -0.3,
     0.6, -0.8,  -0.3,

    -0.6, -0.45,  0.0,
    -0.2, -0.45, -0.3,
    -0.6, -0.45, -0.3,

    -0.6, -0.45,  0.0,
    -0.2, -0.45, -0.3,
    -0.2, -0.45,  0.0,

     0.6, -0.45,  0.0,
     0.2, -0.45, -0.3,
     0.6, -0.45, -0.3,

     0.6, -0.45,  0.0,
     0.2, -0.45, -0.3,
     0.2, -0.45,  0.0
     */
  ];
  // Populate the buffer with the position data.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(block_i), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = block_i.length / vertexPositionBuffer.itemSize;

  // Binds the buffer that we just made to the vertex position attribute.
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  // Do the same steps for the color buffer.
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  var orange = [0.867, 0.204, 0.012, 1.0];
  var colors = [];
  for (var i = 0; i < vertexPositionBuffer.numberOfItems; i++) {
    colors = colors.concat(orange);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = colors.length;  
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                         vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
   // Enable each attribute we are using in the VAO.  
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
    
  // Unbind the vertex array object to be safe.
  gl.bindVertexArray(null);
}

/**
 * Set up the vertex and color buffers for the moon
 */
function setupMoonBuffer() {
  //create VAO
  vertexArrayObject = gl.createVertexArray();
  gl.bindVertexArray(vertexArrayObject);

  //create vertex position buffer
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);


  //populate the buffer with position data
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(moon), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = moon.length/vertexPositionBuffer.itemSize;

  //bind the buffer to the VPA
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(moon_colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = moon_colors.length;
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  gl.bindVertexArray(null);
}

/**
 * Set up the vertex and color buffers for the moon
 */
 function setupMoonBuffer() {
  //create VAO
  vertexArrayObject = gl.createVertexArray();
  gl.bindVertexArray(vertexArrayObject);

  //create vertex position buffer
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);


  //populate the buffer with position data
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(moon), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = moon.length/vertexPositionBuffer.itemSize;

  //bind the buffer to the VPA
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  //moon color buffer
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(moon_colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = moon_colors.length;
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  //enable VAAs
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  gl.bindVertexArray(null);
}

/**
 * Set up the vertex and color buffers for the moon
 */
 function setupLCMBuffer() {
  gl.useProgram(lcmShader);

  // Query the index of each attribute in the list of attributes maintained
  // by the GPU. 
  lcmShader.vertexPositionAttribute =
    gl.getAttribLocation(lcmShader, "aVertexPosition");
  lcmShader.vertexColorAttribute =
    gl.getAttribLocation(lcmShader, "aVertexColor");
    
  //Get the index of the Uniform variable as well
  lcmShader.modelViewMatrixUniform =
    gl.getUniformLocation(lcmShader, "uModelViewMatrix");
  
  //create VAO
  lcmVAO = gl.createVertexArray();
  gl.bindVertexArray(lcmVAO);

  //create vertex position buffer
  lcmVPB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lcmVPB);

  //populate the buffer with position data
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lcm), gl.STATIC_DRAW);
  lcmVPB.itemSize = 3;
  lcmVPB.numberOfItems = lcm.length/lcmVPB.itemSize;

  //bind the buffer to the VPA
  gl.vertexAttribPointer(lcmShader.vertexPositionAttribute, lcmVPB.itemSize, gl.FLOAT, false, 0, 0);

  lcmVCB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lcmVCB);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lcm_colors), gl.STATIC_DRAW);
  lcmVCB.itemSize = 4;
  lcmVCB.numItems = lcm_colors.length;
  gl.vertexAttribPointer(lcmShader.vertexColorAttribute, lcmVCB.itemSize, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(lcmShader.vertexPositionAttribute);
  gl.enableVertexAttribArray(lcmShader.vertexColorAttribute);

  gl.bindVertexArray(null);
}

/**
 * Draws a frame to the screen.
 */
function draw() {
  // Transform the clip coordinates so the render fills the canvas dimensions.
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  // Clear the screen.
  gl.clear(gl.COLOR_BUFFER_BIT);
  clearColor2();

  // Use the vertex array object that we set up.
  gl.bindVertexArray(vertexArrayObject);
    
  // Send the ModelView matrix with our transformations to the vertex shader.
  gl.uniformMatrix4fv(shaderProgram.modelViewMatrixUniform,
                      false, finalMatrix);
    
  // Render the triangle. 
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
  
  // Unbind the vertex array object to be safe.
  gl.bindVertexArray(null);
  
  if (animation == 1) {
    //do the same for the lunar command module
    setupLCMBuffer();

    gl.bindVertexArray(lcmVAO);
    gl.uniformMatrix4fv(lcmShader.modelViewMatrixUniform, false, lcmMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, lcmVPB.numberOfItems);
    gl.bindVertexArray(null);
  }
}

/**
 * General animation function that chooses between Illini and Moon animations
 * @param currentTime - time in milliseconds
 */
function animate(currentTime) {
  if (animation == 0) {
    illini_animate(currentTime);
    setupShaders();
    setupBuffersIllini();
  }
  else {
    moon_animate(currentTime);
    lcm_animate(currentTime);
    setupShaders();
    setupMoonBuffer();
  }
  // Draw the frame.
  draw();
  
  // Animate the next frame. The animate function is passed the current time in
  // milliseconds.
  requestAnimationFrame(animate);
  update_html();
}

/**
 * Animation rules for Illini animate
 * @param currentTime - time in milliseconds
 */
function illini_animate(currentTime) {
  // Read sliders from the website
  var scale = document.getElementById("scale").value / 5;
  var x_t   = document.getElementById("x-t").value;
  var y_t   = document.getElementById("y-t").value;
  // Convert the time to seconds.
  currentTime *= 0.001;
  // Subtract the previous time from the current time.
  //var deltaTime = currentTime - previousTime;
  // Remember the current time for the next frame.
  previousTime = currentTime;
  
  // Update geometry to scale along the y-axis
  y_scale = Math.sin(scale * currentTime);
  
  glMatrix.mat4.fromScaling(yScaleMatrix, glMatrix.vec3.fromValues(1, y_scale, 1));

  finalMatrix = glMatrix.mat4.create();
  //apply scaling
  glMatrix.mat4.multiply(finalMatrix, yScaleMatrix, modelViewMatrix);

  //set up translation matrix
  x_t = 0.4 * Math.sin(currentTime*x_t + 2);
  y_t = 0.2 * Math.sin(currentTime*y_t + 5);
  glMatrix.mat4.fromTranslation(translationMatrix, glMatrix.vec3.fromValues(x_t, y_t, 0));
  glMatrix.mat4.multiply(finalMatrix, finalMatrix, translationMatrix);
}

/**
 * Animation rules for mystery animate
 * @param currentTime - time in milliseconds
 */
function moon_animate(currentTime) {
  currentTime *= 0.001;
  finalMatrix = glMatrix.mat4.create();
  previousTime = currentTime;

  var speed = document.getElementById("speed").value;
  var rotateAngle = currentTime * speed;
  while (rotateAngle > 2 * Math.PI) {
    rotateAngle -= 2 * Math.PI;
  }
  moon_scale = 0.8;
  moon_transform = -1.7;
  var scaleMatrix       = glMatrix.mat4.create();
  var rotationMatrix    = glMatrix.mat4.create();
  var translationMatrix = glMatrix.mat4.create();
  glMatrix.mat4.fromScaling(scaleMatrix, glMatrix.vec3.fromValues(moon_scale, moon_scale, moon_scale));
  glMatrix.mat4.fromZRotation(rotationMatrix, rotateAngle);
  glMatrix.mat4.fromTranslation(translationMatrix, glMatrix.vec3.fromValues(0, moon_transform, 0));

  glMatrix.mat4.multiply(finalMatrix, scaleMatrix, modelViewMatrix);
  glMatrix.mat4.multiply(finalMatrix, rotationMatrix, finalMatrix);
  glMatrix.mat4.multiply(finalMatrix, translationMatrix, finalMatrix);
}

/**
 * Animation for the LCM
 * @param currentTime - time in milliseconds
 */
function lcm_animate(currentTime) {
  currentTime *= 0.001;
  lcmMatrix = glMatrix.mat4.create();
  previousTime = currentTime;

  var speed = document.getElementById("speed").value;
  var y = 0.4 * Math.sin(currentTime * speed);

  var lcm_scale = -0.8;
  var x = 0.0;

  var scaleMatrix = glMatrix.mat4.create();
  var translationMatrix = glMatrix.mat4.create();

  glMatrix.mat4.fromScaling(scaleMatrix, glMatrix.vec3.fromValues(lcm_scale, lcm_scale, lcm_scale));
  glMatrix.mat4.fromTranslation(translationMatrix, glMatrix.vec3.fromValues(x, y, 0));

  glMatrix.mat4.multiply(lcmMatrix, scaleMatrix, modelViewMatrix);
  glMatrix.mat4.multiply(lcmMatrix, translationMatrix, lcmMatrix);

}

/**
 * Update the HTML based on the animation chosen
 */
function update_html() {
  animation = document.getElementById("picker").value;
  if (animation == 0) {
    document.getElementById("Mystery").style.visibility = "hidden";
    document.getElementById("Illini").style.visibility = "visible";
  }
  else {
    document.getElementById("Illini").style.visibility="hidden";
    document.getElementById("Mystery").style.visibility="visible";
  }
}

/**
 * Clear canvas color based on the animation chosen
 */
function clearColor2() {
  if (animation == 0) {
    gl.clearColor(0.075, 0.08, 0.11, 1.0);
  }
  else {
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
  }
}

/**
 * Startup function called from html code to start the program.
 */
 function startup() {
  console.log("Starting animation...");
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 

  //defaults to illini animation
  gl.clearColor(0.075, 0.08, 0.11, 1.0);
  setupBuffersIllini();
  setupMoonArrays();
  setupLCMArrays();
  requestAnimationFrame(animate);
}

/**
 * function that sets up moon vertex positions and colors
 */
function setupMoonArrays() {
  //vertices
  var m0 =   [ 0.0,    0.0, 0.0]

  var m1_0 = [ 0.0,    1.0, 0.0]
  var m1_1 = [ 0.866,  0.5, 0.0]
  var m1_2 = [ 0.866, -0.5, 0.0]
  var m1_3 = [ 0.0,   -1.0, 0.0]
  var m1_4 = [-0.866, -0.5, 0.0]
  var m1_5 = [-0.866,  0.5, 0.0]

  var m2_0 = [ 0.0,  1.806, 0.0]
  var m2_1 = [ 0.866,  1.5, 0.0]
  var m2_2 = [ 1.5,  0.866, 0.0]

  var m2_3 = [ 1.731,  0.0, 0.0]
  var m2_4 = [ 1.5, -0.866, 0.0]
  var m2_5 = [ 0.866, -1.5, 0.0]

  var m2_6 = [ 0.0, -1.806, 0.0]
  var m2_7 = [-0.866, -1.5, 0.0]
  var m2_8 = [-1.5, -0.866, 0.0]

  var m2_9 = [-1.731,  0.0, 0.0]
  var m2_10 = [-1.5,  0.866, 0.0]
  var m2_11 = [-0.866,  1.5, 0.0]

  //moon in clip coords
  moon = moon.concat(
    //layer one
    m0, m1_0, m1_1,
    m0, m1_1, m1_2,
    m0, m1_2, m1_3,
    m0, m1_3, m1_4,
    m0, m1_4, m1_5,
    m0, m1_5, m1_0,

    //layer two
    m1_0, m2_0, m2_1,
    m1_0, m2_1, m1_1,
    m1_1, m2_1, m2_2,
    m1_1, m2_2, m2_3,
    m1_1, m2_3, m1_2,
    m1_2, m2_3, m2_4,
    m1_2, m2_4, m2_5,
    m1_2, m1_3, m2_5,
    m1_3, m2_5, m2_6,

    m1_3, m2_6, m2_7, 
    m1_3, m1_4, m2_7,
    m1_4, m2_7, m2_8,
    m1_4, m2_8, m2_9,
    m1_4, m1_5, m2_9,
    m1_5, m2_9, m2_10,
    m1_5, m2_10, m2_11,
    m1_5, m1_0, m2_11,
    m1_0, m2_11, m2_0
  );

  for (var i = 0; i < vertexPositionBuffer.numberOfItems; i++) {
    var r = 0.95 + (Math.random()-0.5)/20.0;
    var g = 0.9  + (Math.random()-0.5)/20.0;
    var b = 0.65 + (Math.random()-0.5)/20.0;
    var tan = [r, g, b, 1.0];
    moon_colors = moon_colors.concat(tan, tan, tan);
  }
}

/**
 * function that sets up the lcm vertex positions and colors
 */
function setupLCMArrays() {
  var v0  = [-0.45, 0.0, 0.0];
  var v1a = [-0.4, 0.1, 0.0];
  var v1b = [-0.4, -0.1, 0.0];

  var v2a = [-0.1, 0.3, 0.0];
  var v2b = [-0.1, 0.1, 0.0];
  var v2c = [-0.1, -0.1, 0.0];
  var v2d = [-0.1, -0.3, 0.0];

  var v3a = [0.4, 0.3, 0.0];
  var v3b = [0.4, 0.1, 0.0];
  var v3c = [0.4, -0.1, 0.0];
  var v3d = [0.4, -0.3, 0.0];

  var v4a = [0.6, 0.2, 0.0];
  var v4b = [0.6, 0.1, 0.0];
  var v4c = [0.6, -0.1, 0.0];
  var v4d = [0.6, -0.2, 0.0];

  var v5a = [0.75, 0.25, 0.0];
  var v5b = [0.75, 0.0, 0.0];
  var v5c = [0.75, -0.25, 0.0];

  lcm = lcm.concat(
    v0, v1a, v1b,
    v1a, v2a, v2b,
    v1a, v2b, v2c,
    v1a, v1b, v2c,
    v1b, v2c, v2d,
    v2a, v3a, v3b,
    v2a, v2b, v3b,
    v2b, v3b, v3c,
    v2b, v2c, v3c,
    v2c, v3c, v3d,
    v2c, v2d, v3d,
    //booster
    v3b, v4a, v4b,
    v3b, v3c, v4b,
    v3c, v4b, v4c,
    v3c, v4c, v4d,
    v4a, v5a, v5b,
    v4a, v4b, v5b,
    v4b, v4c, v5b,
    v4c, v4d, v5b,
    v4d, v5b, v5c
  );
  var grey = [0.5, 0.5, 0.5, 1.0];
  var dark_grey = [0.2, 0.2, 0.2, 1.0];
  lcm_colors = lcm_colors.concat(
    grey, grey, grey, 
    grey, grey, grey,
    grey, grey, grey,
    grey, grey, grey,
    grey, grey, grey,
    grey, grey, grey,
    grey, grey, grey,
    grey, grey, grey,
    grey, grey, grey,
    grey, grey, grey,
    grey, grey, grey,
    //booster
    dark_grey, dark_grey, dark_grey,
    dark_grey, dark_grey, dark_grey,
    dark_grey, dark_grey, dark_grey,
    dark_grey, dark_grey, dark_grey,
    dark_grey, dark_grey, dark_grey,
    dark_grey, dark_grey, dark_grey,
    dark_grey, dark_grey, dark_grey,
    dark_grey, dark_grey, dark_grey,
    dark_grey, dark_grey, dark_grey
  );
}