

// Simple pseudo-random noise function to avoid external dependencies
// Returns value between -1.5 and 1.5 approx
export function pseudoNoise(x: number, z: number): number {
  const sinX = Math.sin(x * 0.05);
  const cosZ = Math.cos(z * 0.05);
  const sinX2 = Math.sin(x * 0.15 + 100);
  const cosZ2 = Math.cos(z * 0.15 + 100);
  
  return (sinX * cosZ) + (sinX2 * cosZ2) * 0.5;
}

export function getHeight(x: number, z: number): number {
  // Base rolling hills - shifted up significantly to avoid random puddles
  // pseudoNoise range is approx -1.5 to 1.5
  // * 6 gives range -9 to +9
  // + 12 shifts it to +3 to +21. Water level is -2.0, so this is safe dry land everywhere.
  let y = pseudoNoise(x, z) * 6 + 12; 
  
  // Add some finer detail
  y += Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.0;
  
  // --- Mountain Generation (Top-Right: +X, -Z) ---
  // Adjusted for 1:1 aspect ratio (Width 800, Depth 800)
  const mountainCenterX = 250;
  const mountainCenterZ = -120;
  const mountainRadius = 160; 

  // Domain Warping: Distort the coordinate space to make the mountain footprint irregular
  const warpFreq = 0.04;
  const warpAmp = 40;
  const warpX = Math.sin(x * warpFreq) * warpAmp + Math.cos(z * warpFreq * 0.7) * warpAmp * 0.5;
  const warpZ = Math.cos(z * warpFreq * 0.8) * warpAmp + Math.sin(x * warpFreq * 0.5) * warpAmp * 0.5;

  const dx = (x - warpX) - mountainCenterX;
  const dz = (z - warpZ) - mountainCenterZ;
  const distFromMountain = Math.sqrt(dx * dx + dz * dz);

  if (distFromMountain < mountainRadius) {
    // Normalize distance 0..1 (0 at center, 1 at edge)
    const normalizedDist = distFromMountain / mountainRadius;
    
    // Use Cosine curve for a natural "Bell" shape (Dome)
    const shape = 0.5 + 0.5 * Math.cos(normalizedDist * Math.PI);
    
    const mountainHeight = 140; 
    let mountainY = shape * mountainHeight;
    
    // Add roughness/ridges that is stronger at the top/middle
    const roughness = (pseudoNoise(x * 0.15, z * 0.15) * 15 + Math.abs(Math.sin(x*0.05)*Math.cos(z*0.05))*20) * shape;
    
    y += mountainY + roughness;
  }

  // --- Irregular Lake Carving (Bottom-Left: -X, +Z) ---
  // Adjusted for 1:1 aspect ratio
  // Shifted slightly Top-Right from (-250, 120) to (-200, 80)
  const lakeCenterX = -200;
  const lakeCenterZ = 80;

  // Distort coordinates to make the shape irregular
  const distortionX = Math.sin(z * 0.1) * 15;
  const distortionZ = Math.cos(x * 0.1) * 15;
  
  const lx = (x - lakeCenterX) + distortionX;
  const lz = (z - lakeCenterZ) + distortionZ;
  
  // Elliptical distance field (SIGNIFICANTLY EXPANDED to prevent parrot clipping)
  const lakeRadiusX = 200; // Was 140
  const lakeRadiusZ = 140; // Was 90
  const dist = Math.sqrt((lx * lx) / (lakeRadiusX * lakeRadiusX) + (lz * lz) / (lakeRadiusZ * lakeRadiusZ));
  
  // If within lake influence
  if (dist < 1.0) {
      // Smooth crater function: 1 at center, 0 at edge
      const depthFactor = Math.pow(1.0 - dist, 2.0); 
      
      // Subtract height to create depression. 
      // Increased from 25 to 45 because base terrain is now higher (+12 instead of +4)
      y -= depthFactor * 45;
  }
  
  // Clamp deepest parts of lake/valleys
  if (y < -12) y = -12;
  
  return y;
}

// Texture Generation Helpers

export function createGroundTexture(): string {
  const size = 1024; // High resolution for detail
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Base color (Rich organic green)
  ctx.fillStyle = '#2d4c1e'; 
  ctx.fillRect(0, 0, size, size);

  // 2. High frequency noise (Grass blade texture)
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
      // Variation intensity
      const grain = (Math.random() - 0.5) * 30;
      
      // Add subtle noise
      data[i] = Math.max(0, Math.min(255, data[i] + grain));     // R
      data[i+1] = Math.max(0, Math.min(255, data[i+1] + grain)); // G
      data[i+2] = Math.max(0, Math.min(255, data[i+2] + grain)); // B
  }
  ctx.putImageData(imageData, 0, 0);

  // 3. Add organic variations (Soil/Shadow patches)
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 50 + Math.random() * 100;
    
    // Create soft gradient for patch
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const shade = Math.random() > 0.5 ? '0, 0, 0' : '100, 200, 100';
    const alpha = 0.05 + Math.random() * 0.05;
    
    grad.addColorStop(0, `rgba(${shade}, ${alpha})`);
    grad.addColorStop(1, `rgba(${shade}, 0)`);
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function createFoliageTexture(): string {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fill with a base green
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(0, 0, size, size);

  // Generate seamless noise pattern for leaf surface detail
  const drawNoiseLayer = (count: number, minScale: number, maxScale: number, colors: string[]) => {
      for (let i = 0; i < count; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const r = minScale + Math.random() * (maxScale - minScale);
          
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();

          // Simple wrapping for seamlessness (repeat on edges)
          if (x + r > size) {
            ctx.beginPath(); ctx.arc(x - size, y, r, 0, Math.PI * 2); ctx.fill();
          }
          if (x - r < 0) {
            ctx.beginPath(); ctx.arc(x + size, y, r, 0, Math.PI * 2); ctx.fill();
          }
          if (y + r > size) {
            ctx.beginPath(); ctx.arc(x, y - size, r, 0, Math.PI * 2); ctx.fill();
          }
          if (y - r < 0) {
            ctx.beginPath(); ctx.arc(x, y + size, r, 0, Math.PI * 2); ctx.fill();
          }
      }
  };

  // Darker shadow gaps
  drawNoiseLayer(2000, 2, 8, ['#1b5e20', '#003300']);
  // Mid-tone leaves
  drawNoiseLayer(3000, 2, 6, ['#388e3c', '#43a047']);
  // Highlights
  drawNoiseLayer(1500, 1, 4, ['#66bb6a', '#81c784']);

  return canvas.toDataURL('image/jpeg', 0.8);
}

export function createCloudTexture(): string {
  const size = 256; // Smoother clouds
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0,0,size,size);

  const cx = size/2;
  const cy = size/2;
  
  // Soft radial gradient for a "puff" of smoke/cloud
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size/2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
  grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return canvas.toDataURL('image/png');
}

export function createWaterBumpMap(): string {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#808080'; // Mid-grey base
  ctx.fillRect(0, 0, size, size);

  // Add random wave-like noise
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 30;
    
    // Gradient for smooth bump
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    // Oscillate between lighter and darker to create peaks and troughs
    const val = Math.random() > 0.5 ? 255 : 0;
    const alpha = 0.05 + Math.random() * 0.05;
    
    grad.addColorStop(0, `rgba(${val}, ${val}, ${val}, ${alpha})`);
    grad.addColorStop(1, `rgba(${val}, ${val}, ${val}, 0)`);
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Wrapping
    if (x > size - r) { ctx.beginPath(); ctx.arc(x - size, y, r, 0, Math.PI * 2); ctx.fill(); }
    if (x < r) { ctx.beginPath(); ctx.arc(x + size, y, r, 0, Math.PI * 2); ctx.fill(); }
    if (y > size - r) { ctx.beginPath(); ctx.arc(x, y - size, r, 0, Math.PI * 2); ctx.fill(); }
    if (y < r) { ctx.beginPath(); ctx.arc(x, y + size, r, 0, Math.PI * 2); ctx.fill(); }
  }

  return canvas.toDataURL('image/png');
}

// Generate a bump map texture to simulate feather detail
export function createFeatherDetailMap(): string {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Mid-grey base
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Draw many small overlapping scales/feathers
  // This creates high-frequency noise that looks like feather texture
  const drawScale = (x: number, y: number, r: number, darkness: number) => {
     ctx.beginPath();
     // Semi-circle/scale shape
     ctx.arc(x, y, r, Math.PI, 0); 
     ctx.fillStyle = `rgba(${darkness}, ${darkness}, ${darkness}, 0.2)`;
     ctx.fill();
     
     // Highlight edge
     ctx.beginPath();
     ctx.arc(x, y+1, r, Math.PI, 0);
     ctx.strokeStyle = 'rgba(255,255,255,0.1)';
     ctx.stroke();
  };

  for(let i=0; i<4000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 2 + Math.random() * 4;
      const darkness = Math.random() > 0.5 ? 0 : 255;
      drawScale(x, y, r, darkness);
      
      // Wrap for tiling (mostly)
      if (x > size - 5) drawScale(x - size, y, r, darkness);
      if (y > size - 5) drawScale(x, y - size, r, darkness);
  }

  // Add general fibrous noise
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
      data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function createFireGlowTexture(): string {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  const cx = size / 2;
  const cy = size / 2;
  
  // More intense core
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size/2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); // White hot center
  grad.addColorStop(0.2, 'rgba(255, 240, 200, 0.9)'); // Very bright yellow
  grad.addColorStop(0.5, 'rgba(255, 140, 0, 0.4)'); // Deep orange
  grad.addColorStop(1, 'rgba(100, 0, 0, 0)'); // Fade to red/transparent
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  
  return canvas.toDataURL('image/png');
}
