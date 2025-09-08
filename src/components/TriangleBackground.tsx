'use client'

import React, { useEffect, useRef } from 'react'

interface TriangleBackgroundProps {
  className?: string
}

export function TriangleBackground({ className = '' }: TriangleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const programRef = useRef<WebGLProgram | null>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  // Vertex shader source
  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `

  // Fragment shader source (triangle grid shader)
  const fragmentShaderSource = `
    precision highp float;
    
    uniform float u_time;
    uniform vec2 u_resolution;
    
    const float pi = 3.14159265359;
    const float triangleScale = 0.816497161855865;
    const vec3 orange = vec3(0.937, 0.435, 0.0);
    
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    vec4 getTriangleCoords(vec2 uv) {
      uv.y /= triangleScale;
      uv.x -= uv.y / 2.0;
      vec2 center = floor(uv);
      vec2 local = fract(uv);
      
      center.x += center.y / 2.0;
      center.y *= triangleScale;
      
      if (local.x + local.y > 1.0) {
        local.x -= 1.0 - local.y;
        local.y = 1.0 - local.y;
        center.y += 0.586;
        center.x += 1.0; 
      } else {
        center.y += 0.287;
        center.x += 0.5;
      }
      
      return vec4(center, local);
    }
    
    vec4 getLoader(vec4 triangle) {
      if (length(triangle.xy) > 1.6) {
        return vec4(0.0);
      }
      
      float angle = atan(triangle.x, triangle.y);
      float seed = rand(triangle.xy);
      float dst = min(triangle.z, min(triangle.w, 1.0 - triangle.z - triangle.w)) * 15.0;
      float glow = dst < pi ? pow(sin(dst), 1.5) : 0.0;
      
      return vec4(
        mix(orange, vec3(1.0), glow * 0.07), 
        pow(0.5 + 0.5 * sin(angle - u_time * 6.0 + seed), 2.0)
      );
    }
    
    float getBackground(vec4 triangle) {
      float dst = min(triangle.z, min(triangle.w, 1.0 - triangle.z - triangle.w)) - 0.05;
      
      if (triangle.y > 1.9 || triangle.y < -2.4 || dst < 0.0) {
        return 0.0;
      }
      
      float value = pow(
        0.5 + 0.5 * cos(-abs(triangle.x) * 0.4 + rand(triangle.xy) * 2.0 + u_time * 4.0), 
        2.0
      ) * 0.08;
      
      return value * (dst > 0.05 ? 0.65 : 1.0);
    }
    
    vec3 getColor(vec2 uv) {
      uv *= 2.0 / u_resolution.y;
      
      vec3 background = vec3(getBackground(getTriangleCoords(uv * 6.0 - vec2(0.5, 0.3))));
      vec4 loader = getLoader(getTriangleCoords(uv * 11.0));
      
      vec3 color = mix(background, loader.rgb, loader.a);
      return color;
    }
    
    void main() {
      vec2 fragCoord = gl_FragCoord.xy - 0.5 * u_resolution.xy;
      
      // Anti-aliasing with 4x supersampling
      vec3 color = 0.25 * (
        getColor(fragCoord) +
        getColor(fragCoord + vec2(0.5, 0.0)) +
        getColor(fragCoord + vec2(0.5, 0.5)) +
        getColor(fragCoord + vec2(0.0, 0.5))
      );
      
      gl_FragColor = vec4(color, 1.0);
    }
  `

  const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type)
    if (!shader) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
    const program = gl.createProgram()
    if (!program) return null

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      return null
    }

    return program
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      console.error('WebGL not supported')
      return
    }

    glRef.current = gl as WebGLRenderingContext

    // Create shaders
    const webgl = gl as WebGLRenderingContext
    const vertexShader = createShader(webgl, webgl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(webgl, webgl.FRAGMENT_SHADER, fragmentShaderSource)

    if (!vertexShader || !fragmentShader) return

    // Create program
    const program = createProgram(webgl, vertexShader, fragmentShader)
    if (!program) return

    programRef.current = program

    // Set up geometry (full screen quad)
    const positionBuffer = webgl.createBuffer()
    webgl.bindBuffer(webgl.ARRAY_BUFFER, positionBuffer)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ])
    webgl.bufferData(webgl.ARRAY_BUFFER, positions, webgl.STATIC_DRAW)

    const positionLocation = webgl.getAttribLocation(program, 'a_position')
    webgl.enableVertexAttribArray(positionLocation)
    webgl.vertexAttribPointer(positionLocation, 2, webgl.FLOAT, false, 0, 0)

    // Get uniform locations
    const timeLocation = webgl.getUniformLocation(program, 'u_time')
    const resolutionLocation = webgl.getUniformLocation(program, 'u_resolution')

    const render = () => {
      if (!webgl || !program) return

      // Resize canvas
      const displayWidth = canvas.clientWidth
      const displayHeight = canvas.clientHeight

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth
        canvas.height = displayHeight
        webgl.viewport(0, 0, displayWidth, displayHeight)
      }

      // Clear and use program
      webgl.clearColor(0, 0, 0, 0)
      webgl.clear(webgl.COLOR_BUFFER_BIT)
      webgl.useProgram(program)

      // Set uniforms
      const currentTime = (Date.now() - startTimeRef.current) / 1000
      webgl.uniform1f(timeLocation, currentTime)
      webgl.uniform2f(resolutionLocation, canvas.width, canvas.height)

      // Draw
      webgl.drawArrays(webgl.TRIANGLES, 0, 6)

      animationRef.current = requestAnimationFrame(render)
    }

    // Start rendering
    render()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (webgl && programRef.current) {
        webgl.deleteProgram(programRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  )
}

export default TriangleBackground