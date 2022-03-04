/**
 * @file Terrain.js - A simple 3D terrain model for WebGL
 * @author Brendan Parmer <bparmer2@illinois.edu>
 * @brief Terrain generation code for MP2
 * 
 * 
 */

 class Terrain {   
    /**
     * Initializes the members of the Terrain object.
     * @param {number} div Number of triangles along the x-axis and y-axis.
     * @param {number} minX Minimum X coordinate value.
     * @param {number} maxX Maximum X coordinate value.
     * @param {number} minZ Minimum Z coordinate value.
     * @param {number} maxZ Maximum Z coordinate value.
     */
    constructor(div, minX, maxX, minZ, maxZ) {
        this.div = div;
        this.minX = minX;
        this.minZ = minZ;
        this.maxX = maxX;
        this.maxZ = maxZ;

        this.minY = Infinity;
        this.maxY = -Infinity;
        
        // Allocate the vertex array
        this.positionData = [];
        // Allocate the normal array.
        this.normalData = [];
        // Allocate the triangle array.
        this.faceData = [];
        // Allocate an array for edges so we can draw a wireframe.
        this.edgeData = [];
        console.log("Terrain: Allocated buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");
        
        this.generateLines();
        console.log("Terrain: Generated lines");

        this.shapeTerrain(5000);
        console.log("Terrain: Sculpted terrain");

        this.calculateNormals();
        console.log("Terrain: Generated normals");

        this.findHeights();
        // You can use this function for debugging your buffers:
        //this.printBuffers();
    }
    
    /**
     * Return a float in the range [min, max]
     * @param {number} min minimum number of range
     * @param {number} max maximum number of range
     */
    randFloat(min, max) {
        return (Math.random() * (max - min)) + min;
    }

    //-------------------------------------------------------------------------
    /**
     * Set the x,y,z coords of the ith vertex
     * @param {Object} v An array of length 3 holding the x,y,z coordinates.
     * @param {number} i The index of the vertex to set.
     */
    setVertex(v, i) {
        this.positionData[i*3]     = v[0];
        this.positionData[i*3 + 1] = v[1];
        this.positionData[i*3 + 2] = v[2];
    }
    

    /**
     * Returns the x,y,z coords of the ith vertex.
     * @param {Object} v An array of length 3 to hold the x,y,z coordinates.
     * @param {number} i The index of the vertex to get.
     */
    getVertex(v, i) {
        v[0] = this.positionData[i*3];
        v[1] = this.positionData[i*3 + 1];
        v[2] = this.positionData[i*3 + 2];
    }


    /**
     * Generate vertex and face information for 2D plane
     */    
    generateTriangles() {
        var deltaX = (this.maxX - this.minX)/this.div
        var deltaZ = (this.maxZ - this.minZ)/this.div

        //generate vertices
        for (var i = 0; i <= this.div; i++) {
            for (var j = 0; j <= this.div; j++) {
                this.positionData.push(this.minX + deltaX*j);
                this.positionData.push(0);
                this.positionData.push(this.minZ + deltaZ*i);
            }
        }

        //generate faces
        for (var i = 0; i < this.div; i++) {
            for (var j = 0; j < this.div; j++) {
                var bl = (this.div + 1)*i + j;
                var br = (this.div + 1)*i + j + 1;
                var tl = (this.div + 1)*(i + 1) + j;
                var tr = (this.div + 1)*(i + 1) + j + 1;

                //T1
                this.faceData.push(bl);
                this.faceData.push(br);
                this.faceData.push(tl);
                
                //T2
                this.faceData.push(br);
                this.faceData.push(tr);
                this.faceData.push(tl);
                
            }
        }
        // We'll need these to set up the WebGL buffers.
        this.numVertices = this.positionData.length/3;
        this.numFaces    = this.faceData.length/3;
    }


    /**
     * Displace vertices with the faulting method
     * @param {number} iterations how many faults to make
     */
    shapeTerrain(iterations) {
        var dy = 0.02;
        for (var i = 0; i < iterations; i++) {
            var h = (i+1)/iterations;
            dy = dy/2**h;
            var p = glMatrix.vec3.fromValues(this.randFloat(this.minX, this.maxX), 
                                             0,
                                             this.randFloat(this.minZ, this.maxZ));
            var n = glMatrix.vec2.create();
            glMatrix.vec2.random(n);
            var n3 = glMatrix.vec3.fromValues(n[0], 0, n[1]);

            for (var j = 0; j < this.numVertices; j++) {
                var b = [0,0,0];
                this.getVertex(b, j);
                var sub = glMatrix.vec3.create();
                glMatrix.vec3.subtract(sub, b, p);
                var dot = glMatrix.vec3.dot(sub, n3);
                if (dot > 0) {
                    b[1] += dy;
                }
                else if (dot < 0) {
                    b[1] -= dy;
                }
                this.setVertex(b, j);
            }
        }
    }


    /**
     * Generate triangle normals
     */
    calculateNormals() {
        //init normal data
        for (var i = 0; i < this.numVertices * 3; i++) {
            this.normalData[i] = 0;
        }
        //sum up triangle-weighted normals
        for (var i = 0; i < this.numFaces; i++) {
            var i0 = this.faceData[i*3];
            var i1 = this.faceData[i*3 + 1];
            var i2 = this.faceData[i*3 + 2];

            var u0 = [0, 0, 0]; 
            var u1 = [0, 0, 0];
            var u2 = [0, 0, 0];

            this.getVertex(u0, i0);
            var v0 = glMatrix.vec3.fromValues(u0[0], u0[1], u0[2]);

            this.getVertex(u1, i1);
            var v1 = glMatrix.vec3.fromValues(u1[0], u1[1], u1[2]);

            this.getVertex(u2, i2);
            var v2 = glMatrix.vec3.fromValues(u2[0], u2[1], u2[2]);

            var e0 = glMatrix.vec3.create();
            glMatrix.vec3.subtract(e0, v1, v0);

            var e1 = glMatrix.vec3.create();
            glMatrix.vec3.subtract(e1, v2, v0);

            var n = glMatrix.vec3.create();
            glMatrix.vec3.cross(n, e0, e1);

            for (var j = 0; j < 3; j++) {
                this.normalData[i0*3 + j] += n[j]/2;
                this.normalData[i1*3 + j] += n[j]/2;
                this.normalData[i2*3 + j] += n[j]/2;
            }
        }

        for (var i = 0; i < this.numVertices; i++) {
            var x = this.normalData[i*3];
            var y = this.normalData[i*3 + 1];
            var z = this.normalData[i*3 + 2];

            var before = glMatrix.vec3.fromValues(x, y, z);
            var normed = glMatrix.vec3.create();
            glMatrix.vec3.normalize(normed, before);

            for (var j = 0; j < 3; j++) {
                this.normalData[i*3 + j] = normed[j];
            }
        }
    }

    findHeights() {
        for (var i = 0; i < this.numVertices; i++) {
            var y = this.positionData[i*3 + 1];
            if (y > this.maxY) {
                this.maxY = y;
            }
            if (y < this.minY) {
                this.minY = y;
            }
        }
    }
    //-------------------------------------------------------------------------
    // Setup code (run once)
    /**
     * Generates line data from the faces in faceData for wireframe rendering.
     */
    generateLines() {
        for (var f = 0; f < this.faceData.length/3; f++) {
            // Calculate index of the face
            var fid = f*3;
            this.edgeData.push(this.faceData[fid]);
            this.edgeData.push(this.faceData[fid+1]);
            
            this.edgeData.push(this.faceData[fid+1]);
            this.edgeData.push(this.faceData[fid+2]);
            
            this.edgeData.push(this.faceData[fid+2]);
            this.edgeData.push(this.faceData[fid]);
        }
    }


    /**
     * Sets up the WebGL buffers and vertex array object.
     * @param {object} shaderProgram The shader program to link the buffers to.
     */
    setupBuffers(shaderProgram) {
        // Create and bind the vertex array object.
        this.vertexArrayObject = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArrayObject);

        // Create the position buffer and load it with the position data.
        this.vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positionData),
                      gl.STATIC_DRAW);
        this.vertexPositionBuffer.itemSize = 3;
        this.vertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.vertexPositionBuffer.numItems, " vertices.");

        // Link the position buffer to the attribute in the shader program.
        gl.vertexAttribPointer(shaderProgram.locations.vertexPosition,
                               this.vertexPositionBuffer.itemSize, gl.FLOAT, 
                               false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.locations.vertexPosition);
    
        // Specify normals to be able to do lighting calculations
        this.vertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalData),
                      gl.STATIC_DRAW);
        this.vertexNormalBuffer.itemSize = 3;
        this.vertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.vertexNormalBuffer.numItems, " normals.");

        // Link the normal buffer to the attribute in the shader program.
        gl.vertexAttribPointer(shaderProgram.locations.vertexNormal,
                               this.vertexNormalBuffer.itemSize, gl.FLOAT, 
                               false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.locations.vertexNormal);
    
        // Set up the buffer of indices that tells WebGL which vertices are
        // part of which triangles.
        this.triangleIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.faceData),
                      gl.STATIC_DRAW);
        this.triangleIndexBuffer.itemSize = 1;
        this.triangleIndexBuffer.numItems = this.faceData.length;
        console.log("Loaded ", this.triangleIndexBuffer.numItems, " triangles.");
    
        // Set up the index buffer for drawing edges.
        this.edgeIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.edgeData),
                      gl.STATIC_DRAW);
        this.edgeIndexBuffer.itemSize = 1;
        this.edgeIndexBuffer.numItems = this.edgeData.length;
        
        // Unbind everything; we want to bind the correct element buffer and
        // VAO when we want to draw stuff
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }
    

    //-------------------------------------------------------------------------
    // Rendering functions (run every frame in draw())
    /**
     * Renders the terrain to the screen as triangles.
     */
    drawTriangles() {
        gl.bindVertexArray(this.vertexArrayObject);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.triangleIndexBuffer.numItems,
                        gl.UNSIGNED_INT,0);
    }
    

    /**
     * Renders the terrain to the screen as edges, wireframe style.
     */
    drawEdges() {
        gl.bindVertexArray(this.vertexArrayObject);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.drawElements(gl.LINES, this.edgeIndexBuffer.numItems,
                        gl.UNSIGNED_INT,0);   
    }


    //-------------------------------------------------------------------------
    // Debugging
    /**
     * Prints the contents of the buffers to the console for debugging.
     */
    printBuffers() {
        for (var i = 0; i < this.numVertices; i++) {
            console.log("v ", this.positionData[i*3], " ", 
                              this.positionData[i*3 + 1], " ",
                              this.positionData[i*3 + 2], " ");
        }
        for (var i = 0; i < this.numVertices; i++) {
            console.log("n ", this.normalData[i*3], " ", 
                              this.normalData[i*3 + 1], " ",
                              this.normalData[i*3 + 2], " ");
        }
        for (var i = 0; i < this.numFaces; i++) {
            console.log("f ", this.faceData[i*3], " ", 
                              this.faceData[i*3 + 1], " ",
                              this.faceData[i*3 + 2], " ");
        }  
    }

} // class Terrain