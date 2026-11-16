"use client";
import React, { useEffect, useRef, useState } from "react";
import { User, Lock, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

// Vertex shader source code
const vertexSmokeySource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// Fragment shader source code for the smokey background effect
const fragmentSmokeySource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord / iResolution;
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    float time = iTime * 0.5;

    // Normalize mouse input (0.0 - 1.0) and remap to -1.0 ~ 1.0
    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;

    vec2 distortion = centeredUV;
    // Apply distortion for a wavy, smokey effect
    for (float i = 1.0; i < 8.0; i++) {
        distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
        distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
    }

    // Create a glowing wave pattern
    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.9, 0.2, wave);

    fragColor = vec4(u_color * glow, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

/**
 * Valid blur sizes supported by Tailwind CSS.
 */
type BlurSize = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

/**
 * Props for the SmokeyBackground component.
 */
interface SmokeyBackgroundProps {
  backdropBlurAmount?: string;
  color?: string;
  className?: string;
}

/**
 * A mapping from blur size names to Tailwind CSS classes.
 */
const blurClassMap: Record<BlurSize, string> = {
  none: "backdrop-blur-none",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
  "2xl": "backdrop-blur-2xl",
  "3xl": "backdrop-blur-3xl",
};

/**
 * A React component that renders an interactive WebGL shader background.
 */
export function SmokeyBackground({
  backdropBlurAmount = "sm",
  color = "#1E40AF", // Default dark blue
  className = "",
}: SmokeyBackgroundProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Helper to convert hex color to RGB (0-1 range)
  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;
    return [r, g, b];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSmokeySource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSmokeySource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const iMouseLocation = gl.getUniformLocation(program, "iMouse");
    const uColorLocation = gl.getUniformLocation(program, "u_color");

    let startTime = Date.now();
    const [r, g, b] = hexToRgb(color);
    gl.uniform3f(uColorLocation, r, g, b);

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);

      const currentTime = (Date.now() - startTime) / 1000;

      gl.uniform2f(iResolutionLocation, width, height);
      gl.uniform1f(iTimeLocation, currentTime);
      gl.uniform2f(iMouseLocation, isHovering ? mousePosition.x : width / 2, isHovering ? height - mousePosition.y : height / 2);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setMousePosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    render();

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isHovering, mousePosition, color]);

  const finalBlurClass = blurClassMap[backdropBlurAmount as BlurSize] || blurClassMap["sm"];

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className={`absolute inset-0 ${finalBlurClass}`}></div>
    </div>
  );
}

/**
 * A glassmorphism-style login form component with animated labels and Telegram login.
 */
export function LoginForm() {
  const [tgWaiting, setTgWaiting] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const botUsername = "tugunuzbot";

  const handleTelegramClick = () => {
    // 6 xonali unikal sessiya kodi
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setAuthCode(code);
    setTgWaiting(true);

    // Telegram Bot Deep-Link: /start auth_123456
    const tgUrl = `https://t.me/${botUsername}?start=auth_${code}`;
    window.open(tgUrl, "_blank");
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Xush kelibsiz</h2>
        <p className="mt-2 text-sm text-gray-300">Tugun — BARAKA LES jamoasi</p>
      </div>

      {tgWaiting ? (
        <div className="p-4 rounded-xl bg-white/10 border border-white/20 text-center space-y-4 animate-fade-in">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#229ED9]/20 flex items-center justify-center text-[#229ED9]">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Telegram bot ochildi</h3>
            <p className="text-xs text-gray-300 mt-1">
              Botda <span className="font-semibold text-white">"START"</span> tugmasini bosing:
            </p>
          </div>
          <div className="py-2.5 px-4 bg-black/30 rounded-lg border border-white/10">
            <span className="text-xs text-gray-400 block mb-0.5">Tasdiqlash kodingiz:</span>
            <span className="text-xl font-mono font-bold tracking-widest text-[#229ED9]">{authCode}</span>
          </div>
          <div className="space-y-2 pt-1">
            <a
              href={`https://t.me/${botUsername}?start=auth_${authCode}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#229ED9] hover:bg-[#1E88E5] text-white text-xs font-semibold rounded-lg transition"
            >
              Botni qayta ochish <ExternalLink size={14} />
            </a>
            <button
              type="button"
              onClick={() => setTgWaiting(false)}
              className="w-full py-1.5 text-xs text-gray-400 hover:text-white transition"
            >
              Bekor qilish / Oddiy login
            </button>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Email Input with Animated Label */}
          <div className="relative z-0">
            <input
              type="email"
              id="floating_email"
              className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
              placeholder=" " 
              required
            />
            <label
              htmlFor="floating_email"
              className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >
              <User className="inline-block mr-2 -mt-1" size={16} />
              Email Address
            </label>
          </div>

          {/* Password Input with Animated Label */}
          <div className="relative z-0">
            <input
              type="password"
              id="floating_password"
              className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
              placeholder=" "
              required
            />
            <label
              htmlFor="floating_password"
              className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >
              <Lock className="inline-block mr-2 -mt-1" size={16} />
              Password
            </label>
          </div>

          <div className="flex items-center justify-between">
            <a href="#" className="text-xs text-gray-300 hover:text-white transition">Parolni unutdingizmi?</a>
          </div>
          
          <button
            type="submit"
            className="group w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300"
          >
            Kirish
            <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-400/30"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-xs">YOKI</span>
              <div className="flex-grow border-t border-gray-400/30"></div>
          </div>

          {/* Telegram Login Button */}
          <button
            type="button"
            onClick={handleTelegramClick}
            id="tg-login-btn"
            className="w-full flex items-center justify-center py-2.5 px-4 bg-[#229ED9] hover:bg-[#1E88E5] rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[#229ED9] transition-all duration-300 shadow-md"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Telegram orqali kirish
          </button>
        </form>
      )}

      <p className="text-center text-xs text-gray-400">
        Hisobingiz yo'qmi? <a href="#register" className="font-semibold text-blue-400 hover:text-blue-300 transition">Ro'yxatdan o'tish</a>
      </p>
      <div className="text-center pt-1">
        <a href="#tuzilma" className="text-xs text-gray-400 hover:text-white transition flex items-center justify-center gap-1">
          ← Ilovaga qaytish
        </a>
      </div>
    </div>
  );
}
