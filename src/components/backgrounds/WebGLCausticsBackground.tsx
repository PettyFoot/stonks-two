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
    
    // Caustics function - creates sharp light focusing patterns using distance fields
    float caustics(vec2 uv, float time) {
      float caustic = 0.0;
      
      // Create multiple caustic lines using distance from curves
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        
        // Create animated curves for each caustic line
        vec2 offset = vec2(
          sin(time * 0.4 + fi * 2.1) * 0.5,
          cos(time * 0.3 + fi * 1.7) * 0.3
        );
        
        // Create wavy lines
        float x = uv.x + offset.x;
        float y = uv.y + offset.y;
        float wave = sin(x * 6.0 + time * 0.5 + fi) * 0.1;
        float dist = abs(y - wave);
        
        // Create sharp caustic line using inverse distance
        float line = 1.0 / (dist * 40.0 + 1.0);
        line = pow(line, 2.0);
        
        // Add to caustic value
        caustic += line;
      }
      
      // Add crossing patterns for more realistic caustics
      for (int i = 0; i < 2; i++) {
        float fi = float(i);
        
        vec2 offset = vec2(
          cos(time * 0.35 + fi * 3.14) * 0.4,
          sin(time * 0.25 + fi * 2.5) * 0.6
        );
        
        float x = uv.x * 0.7 + uv.y * 0.3 + offset.x;
        float y = uv.y * 0.7 - uv.x * 0.3 + offset.y;
        float wave = sin(x * 4.0 + time * 0.6 + fi * 1.5) * 0.15;
        float dist = abs(y - wave);
        
        float line = 1.0 / (dist * 35.0 + 1.0);
        line = pow(line, 1.8);
        
        caustic += line * 0.6;
      }
      
      // Add some subtle background variation
      float background = sin(uv.x * 3.0 + time * 0.1) * sin(uv.y * 3.0 + time * 0.15) * 0.05 + 0.05;
      
      return clamp(caustic + background, 0.0, 1.0);
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
        className={`absolute inset-0 w-full h-full object-cover -z-10 bg-caustics ${className}`}
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
      className={`absolute inset-0 w-full h-full object-cover -z-10 ${className}`}
    />
  );
};

export default WebGLCausticsBackground;