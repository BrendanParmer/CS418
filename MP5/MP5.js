/**
 * @file MP5.js - A simple WebGL rendering engine
 * @author Ian Rudnick <itr2@illinois.edu>
 * @brief Starter code for CS 418 MP5 at the University of Illinois at
 * Urbana-Champaign.
 * 
 * Updated Spring 2021 for WebGL 2.0/GLSL 3.00 ES.
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas to draw on */
var canvas;

/** @global The GLSL shader program */
var shaderProgram;

/** @global An object holding the geometry for your 3D model */
var sphere1;

/** @global The Model matrix */
var modelViewMatrix = glMatrix.mat4.create();
/** @global The Model matrix */
var viewMatrix = glMatrix.mat4.create();
/** @global The Projection matrix */
var projectionMatrix = glMatrix.mat4.create();
/** @global The Normal matrix */
var normalMatrix = glMatrix.mat3.create();

// Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [0.25, 0.75, 1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kDiffuse = [0.25, 0.75, 1.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.25, 0.75, 1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 2;

/** @global Ambient light color */
const lAmbient = [0.4, 0.4, 0.4];
/** @global Diffuse light color */
const lDiffuse = [1.0, 1.0, 1.0];
/** @global Specular  light color */
const lSpecular = [1.0, 1.0, 1.0];

/** @global Gravity (m/s^2) */
const gravity = glMatrix.vec3.fromValues(0, -9.81, 0);
/** @global drag factor */
const d = 0.999;
/** @global collision slowing factor */
const csf = 0.99;
/** @global Box size */
const m = 3.0;
/** @global Stop dist */
const stop_dist = 0.01;
/** @global previous time */
var t = -1;

/** @global list of all particles in scene */
var particles = [];

class Particle {
  constructor(pos_0, v_0, m, r, color) {
    this.pos    = pos_0;
    this.v      = v_0;
    this.m      = m;
    this.moving = true; 

    this.r     = r;
    this.color = color;
  }

  /**
   * Computes new position and velocity for the particle
   * @param {float} dt   - time elapsed since last frame
   * @param {float} drag - d**dt, slowing factor
   * @param {float} dv   - a*dt,  euler integrated change in velocity
   */
  physics(dt, drag, dv) {
    if (this.moving) {
      glMatrix.vec3.scale(this.v, this.v, drag);
      glMatrix.vec3.add(this.v, this.v, dv);
      var old_p = this.pos;
      var dx = glMatrix.vec3.create();
      glMatrix.vec3.scale(dx, this.v, dt);
      glMatrix.vec3.add(this.pos, this.pos, dx);
      //particle on floor
      if ((this.pos[1] + m) < 0.01) {
        if (glMatrix.vec3.distance(this.pos, old_p) < stop_dist) {
          console.log("Stop moving");
          console.log(this.pos);
          this.moving = false;
          this.v = glMatrix.vec3.fromValues(0, 0, 0);
        }
      }

      //collision detection
      var first_wall = [-1, 0]; // [wall index, distance past wall]
      for (var i = 0; i < 3; i++) {
        var a =   this.pos[i] + this.r - m;
        var b = -(this.pos[i] - this.r + m);
        if (a >= 0) {
          if (first_wall[1] < a) {
            first_wall[0] = 2*i;
            first_wall[1] = a;
          }
        }
        else if (b >= 0) {
          if (first_wall[1] < b) {
            first_wall[0] = 2*i + 1;
            first_wall[1] = b;
          }
        }
      }
      var index = first_wall[0];
      if (index != -1) { //collision has occurred
        console.log("Collision", first_wall);
        var wall_normals = [glMatrix.vec3.fromValues(-1,  0,  0),
                            glMatrix.vec3.fromValues( 1,  0,  0),
                            glMatrix.vec3.fromValues( 0, -1,  0),
                            glMatrix.vec3.fromValues( 0,  1,  0),
                            glMatrix.vec3.fromValues( 0,  0, -1),
                            glMatrix.vec3.fromValues( 0,  0,  1)]
        var wn = wall_normals[index];

        var coord = Math.floor(first_wall[0]/2);
        var negative = first_wall[0] % 2;
        console.log("coord", coord);
        var x;
        if (negative)
          x = m + this.r;
        else
          x = m - this.r;
        var tc = (x - old_p[coord])/this.v[coord];
        console.log((m - this.r) - old_p[coord]);

        glMatrix.vec3.scale(dx, this.v, tc);
        var hit_pos = glMatrix.vec3.create();
        glMatrix.vec3.add(hit_pos, old_p, dx);

        var dot = glMatrix.vec3.dot(this.v, wn);
        var v1 = glMatrix.vec3.create();
        glMatrix.vec3.scale(v1, wn, 2*dot);
        glMatrix.vec3.subtract(v1, this.v, v1);
        glMatrix.vec3.scale(this.v, v1, csf);
        
        this.pos = old_p;
        /*
        var t1 = dt - tc;
        glMatrix.vec3.scale(v1, this.v, t1);
        glMatrix.vec3.add(this.pos, hit_pos, v1);
        
        //this.moving = false;

        console.log("hp:", hit_pos);
        console.log("v:", this.v);
        console.log("p:", this.pos);
        */
        //this.pos = old_p;
        //this.pos = hit_pos + this.v * (dt - tc); //might be out of bounds if on corners, can comment out if needed
      }
    }
  }
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

//-----------------------------------------------------------------------------
// Setup functions (run once when the webpage loads)
/**
 * Startup function called from the HTML code to start program.
 */
function startup() {
  // Set up the canvas with a WebGL context.
  canvas = document.getElementById("glCanvas");
  gl = createGLContext(canvas);

  // Compile and link a shader program.
  setupShaders();

  var num_particles = 10; //document.getElementById("num_particles");
  for (var i = 0; i < num_particles; i++) {
    makeParticle();
  }
  // Create a sphere mesh and set up WebGL buffers for it.
  sphere1 = new Sphere(5);
  sphere1.setupBuffers(shaderProgram);
  
  // Create the projection matrix with perspective projection.
  const near = 0.1;
  const far = 200.0;
  glMatrix.mat4.perspective(projectionMatrix, degToRad(45), 
                            gl.viewportWidth / gl.viewportHeight,
                            near, far);
    
  // Set the background color to black (you can change this if you like).    
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  // Start animating.
  requestAnimationFrame(animate);
}

/** generate a random particle */
function makeParticle() {
  //var radius = 0.6;
  var radius = 0.2*m*Math.random() + 0.1;
  var mass = radius;

  var x = 0.99*(m-radius)*(2*Math.random() - 1);
  var y = 0.99*(m-radius)*(2*Math.random() - 1);
  var z = 0.99*(m-radius)*(2*Math.random() - 1);
  var pos = glMatrix.vec3.fromValues(x, y, z);

  var vf = 10;
  var vx = m*vf*(2*Math.random() - 1);
  var vy = m*vf*(2*Math.random() - 1);
  var vz = m*vf*(2*Math.random() - 1);
  var v  = glMatrix.vec3.fromValues(vx, vy, vz);

  var r = Math.random();
  var g = Math.random();
  var b = Math.random();
  var color = glMatrix.vec3.fromValues(r, g, b);

  var p = new Particle(pos, v, mass, radius, color);
  particles.push(p);
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

  // If you have multiple different shader programs, you'll need to move this
  // function to draw() and call it whenever you want to switch programs
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

  shaderProgram.locations.kAmbient =
    gl.getUniformLocation(shaderProgram, "kAmbient");
  shaderProgram.locations.kDiffuse =
    gl.getUniformLocation(shaderProgram, "kDiffuse");
  shaderProgram.locations.kSpecular =
    gl.getUniformLocation(shaderProgram, "kSpecular");
  shaderProgram.locations.shininess =
    gl.getUniformLocation(shaderProgram, "shininess");
  
  shaderProgram.locations.lightPosition =
    gl.getUniformLocation(shaderProgram, "lightPosition");
  shaderProgram.locations.ambientLightColor =
    gl.getUniformLocation(shaderProgram, "ambientLightColor");
  shaderProgram.locations.diffuseLightColor =
  gl.getUniformLocation(shaderProgram, "diffuseLightColor");
  shaderProgram.locations.specularLightColor =
  gl.getUniformLocation(shaderProgram, "specularLightColor");
}

//-----------------------------------------------------------------------------
// Animation functions (run every frame)
/**
 * Draws the current frame and then requests to draw the next frame.
 * @param {number} currentTime The elapsed time in milliseconds since the
 *    webpage loaded. 
 */
function animate(currentTime) {
  // Add code here using currentTime if you want to add animations
  var dt;
  if (t != -1) 
    dt = (currentTime - t)/5000;
  else
    dt = 0;
  var drag = d**dt;
  var dv   = glMatrix.vec3.create();
  glMatrix.vec3.scale(dv, gravity, dt);
  //console.log(dv);
  // Set up the canvas for this frame
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  var viewMatrix = glMatrix.mat4.create();

  // Create the view matrix using lookat.
  const lookAtPt = glMatrix.vec3.fromValues(0.0, 0.0, 0.0);
  const eyePt = glMatrix.vec3.fromValues(0.0, 0.0, 10.0);
  const up = glMatrix.vec3.fromValues(0.0, 1.0, 0.0); 
  glMatrix.mat4.lookAt(viewMatrix, eyePt, lookAtPt, up);

  for (var i = 0; i < particles.length; i++) {
    var particle = particles[i];
    //console.log(dt, drag, dv);
    particle.physics(dt, drag, dv);

    var radius = particle.r;
    var scale_vector = glMatrix.vec3.fromValues(radius, radius, radius);
    var modelMatrix = glMatrix.mat4.create();
    glMatrix.mat4.fromScaling(modelMatrix, scale_vector);
    glMatrix.mat4.translate(modelMatrix, modelMatrix, particle.pos);
    // Concatenate the model and view matrices.
    // Remember matrix multiplication order is important.
    glMatrix.mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

    setMatrixUniforms();

    // Transform the light position to view coordinates
    var lightPosition = glMatrix.vec3.fromValues(5, 5, -5);
    glMatrix.vec3.transformMat4(lightPosition, lightPosition, viewMatrix);

    setLightUniforms(lAmbient, lDiffuse, lSpecular, lightPosition);
    setMaterialUniforms(particle.color, particle.color, kSpecular, shininess);

    // You can draw multiple spheres by changing the modelViewMatrix, calling
    // setMatrixUniforms() again, and calling gl.drawArrays() again for each
    // sphere. You can use the same sphere object and VAO for all of them,
    // since they have the same triangle mesh.
    sphere1.bindVAO();
    gl.drawArrays(gl.TRIANGLES, 0, sphere1.numTriangles*3);
    sphere1.unbindVAO();
  }
  t = currentTime;
  // Use this function as the callback to animate the next frame.
  requestAnimationFrame(animate);
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
  glMatrix.mat3.fromMat4(normalMatrix,modelViewMatrix);
  glMatrix.mat3.transpose(normalMatrix,normalMatrix);
  glMatrix.mat3.invert(normalMatrix,normalMatrix);

  gl.uniformMatrix3fv(shaderProgram.locations.normalMatrix, false,
                      normalMatrix);
}


/**
 * Sends material properties to the shader program.
 * @param {Float32Array} a Ambient material color.
 * @param {Float32Array} d Diffuse material color.
 * @param {Float32Array} s Specular material color.
 * @param {Float32} alpha shininess coefficient
 */
function setMaterialUniforms(a, d, s, alpha) {
  gl.uniform3fv(shaderProgram.locations.kAmbient, a);
  gl.uniform3fv(shaderProgram.locations.kDiffuse, d);
  gl.uniform3fv(shaderProgram.locations.kSpecular, s);
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
  gl.uniform3fv(shaderProgram.locations.ambientLightColor, a);
  gl.uniform3fv(shaderProgram.locations.diffuseLightColor, d);
  gl.uniform3fv(shaderProgram.locations.specularLightColor, s);
  gl.uniform3fv(shaderProgram.locations.lightPosition, loc);
}