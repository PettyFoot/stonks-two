'use client';

import React, { useEffect, useRef, useState } from 'react';

interface WebGLCausticsBackgroundProps {
  className?: string;
  intensity?: number; // 0-1, controls brightness of caustics
  speed?: number; // 0-2, controls animation speed
  color?: [number, number, number]; // RGB color for caustics (0-1 range)
  backgroundColor?: [number, number, number]; // RGB background color (0-1 range)
  fallbackToCSS?: boolean; // Use CSS caustics if WebGL fails
}

const WebGLCausticsBackground: React.FC<WebGLCausticsBackgroundProps> = ({
  className = '',
  intensity = 0.8,
  speed = 1.0,
  color = [0.9, 1.0, 1.0], // Bright cyan-white
  backgroundColor = [0.05, 0.2, 0.35], // Dark blue
  fallbackToCSS = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [webglFailed, setWebglFailed] = useState(false);

  // Vertex shader - creates a full-screen quad
  const vertexShaderSource = `
    attribute vec4 a_position;
    varying vec2 v_uv;
    
    void main() {
      gl_Position = a_position;
      v_uv = a_position.xy * 0.5 + 0.5;
    }
  `;

  // Fragment shader - creates the caustics effect
  const fragmentShaderSource = `
    precision highp float;
    
    varying vec2 v_uv;
    uniform float u_time;
    uniform float u_intensity;
    uniform float u_speed;
    uniform vec3 u_color;
    uniform vec3 u_backgroundColor;
    uniform vec2 u_resolution;
    
    // Noise function for organic movement
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 2.0;
      
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      
      return value;
    }
    
    // Caustics function - creates light focusing patterns
    float caustics(vec2 uv, float time) {
      // Create multiple layers of caustics
      vec2 p1 = uv * 8.0 + vec2(time * 0.3, time * 0.2);
      vec2 p2 = uv * 6.0 + vec2(-time * 0.2, time * 0.4);
      vec2 p3 = uv * 4.0 + vec2(time * 0.1, -time * 0.3);
      
      // Use sine waves to create light focusing patterns
      float c1 = sin(p1.x + sin(p1.y + time)) * 0.5 + 0.5;
      float c2 = sin(p2.x + sin(p2.y + time * 1.2)) * 0.5 + 0.5;
      float c3 = sin(p3.x + sin(p3.y + time * 0.8)) * 0.5 + 0.5;
      
      // Add some noise for organic variation
      float n1 = fbm(uv * 5.0 + time * 0.1);
      float n2 = fbm(uv * 3.0 - time * 0.05);
      
      // Combine layers with different weights
      float caustic = (c1 * 0.4 + c2 * 0.3 + c3 * 0.3) * (n1 * 0.3 + n2 * 0.2 + 0.5);
      
      // Create sharper light rays by using power function
      caustic = pow(caustic, 2.0);
      
      // Add some subtle secondary patterns
      vec2 p4 = uv * 12.0 + vec2(sin(time * 0.7), cos(time * 0.5));
      float detail = sin(p4.x) * sin(p4.y) * 0.1 + 0.1;
      
      return caustic + detail;
    }
    
    void main() {
      vec2 uv = v_uv;
      
      // Adjust UV coordinates to maintain aspect ratio
      vec2 aspectUV = uv;
      if (u_resolution.x > u_resolution.y) {
        aspectUV.x = uv.x * u_resolution.x / u_resolution.y;
      } else {
        aspectUV.y = uv.y * u_resolution.y / u_resolution.x;
      }
      
      float time = u_time * u_speed;
      
      // Generate caustics pattern
      float causticsValue = caustics(aspectUV, time);
      
      // Apply intensity
      causticsValue *= u_intensity;
      
      // Create the final color by mixing background and caustics
      vec3 finalColor = u_backgroundColor + u_color * causticsValue;
      
      // Add a subtle vignette effect
      float vignette = 1.0 - length(uv - 0.5) * 0.3;
      finalColor *= vignette;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // Compile shader function
  const compileShader = (gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  };

  // Create shader program function
  const createShaderProgram = (gl: WebGLRenderingContext): WebGLProgram | null => {
    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) return null;
    
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    
    try {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
      if (!gl) {
        throw new Error('WebGL not supported');
      }
    } catch (error) {
      console.warn('WebGL initialization failed:', error);
      setWebglFailed(true);
      return;
    }

    const program = createShaderProgram(gl);
    if (!program) {
      setWebglFailed(true);
      return;
    }

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');
    const speedLocation = gl.getUniformLocation(program, 'u_speed');
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    const backgroundColorLocation = gl.getUniformLocation(program, 'u_backgroundColor');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    // Create vertex buffer for full-screen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Resize canvas function
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas || !gl) return;
      
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    };

    // Animation loop
    const render = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }
      
      const elapsed = (currentTime - startTimeRef.current) * 0.001; // Convert to seconds
      
      if (!gl || !program) return;
      
      resizeCanvas();
      
      gl.useProgram(program);
      
      // Set uniforms
      gl.uniform1f(timeLocation, elapsed);
      gl.uniform1f(intensityLocation, intensity);
      gl.uniform1f(speedLocation, speed);
      gl.uniform3f(colorLocation, color[0], color[1], color[2]);
      gl.uniform3f(backgroundColorLocation, backgroundColor[0], backgroundColor[1], backgroundColor[2]);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      
      // Set up vertex attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      animationRef.current = requestAnimationFrame(render);
    };

    // Initial resize and start animation
    resizeCanvas();
    animationRef.current = requestAnimationFrame(render);

    // Handle window resize
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [intensity, speed, color, backgroundColor]);

  // If WebGL failed and fallback is enabled, use CSS caustics
  if (webglFailed && fallbackToCSS) {
    return (
      <div 
        className={`fixed inset-0 -z-10 bg-caustics ${className}`}
        style={{ zIndex: -1 }}
      />
    );
  }

  // If WebGL failed and no fallback, render nothing
  if (webglFailed) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 w-full h-full ${className}`}
      style={{ zIndex: -1 }}
    />
  );
};

export default WebGLCausticsBackground;