import * as THREE from "three";

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const fade = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Lightweight atmosphere: one particle draw call and six shared ring meshes. */
export function createAtmosphere(scene: THREE.Scene, earbuds: THREE.Group[]) {
  const ringGeometry = new THREE.TorusGeometry(1, .0045, 3, 64);
  const rings = earbuds.flatMap((earbud, side) => Array.from({ length: 3 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: 0x91dbe8, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeometry, material);
    // Waves travel out from the silicone tip, along the earbud's local X axis.
    ring.rotation.y = Math.PI / 2;
    earbud.add(ring);
    return { ring, material, side, index };
  }));

  const spriteCanvas = document.createElement("canvas");
  spriteCanvas.width = spriteCanvas.height = 32;
  const ctx = spriteCanvas.getContext("2d")!;
  const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, "rgba(222,248,255,.85)");
  glow.addColorStop(.18, "rgba(160,218,240,.45)");
  glow.addColorStop(1, "rgba(110,190,220,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 32, 32);
  const sprite = new THREE.CanvasTexture(spriteCanvas);
  const geometry = new THREE.BufferGeometry();
  const count = 54;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  let seed = 137;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = (random() - .5) * 12;
    seeds[i * 3 + 1] = random() * 6 - 2;
    seeds[i * 3 + 2] = random() * 7 - 5;
  }
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  const material = new THREE.PointsMaterial({
    color: 0xc4edfa, map: sprite, size: .045, sizeAttenuation: true,
    transparent: true, opacity: .28, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  scene.add(particles);

  return {
    update(progress: number, elapsed: number, mobile: boolean, white: number) {
      const waveVisibility = fade(.25, .7, progress) * (1 - fade(1.25, 1.7, progress));
      for (const { ring, material, side, index } of rings) {
        const phase = (elapsed * .18 + index / 3 + side * .12) % 1;
        const envelope = Math.sin(phase * Math.PI) ** 1.4;
        ring.visible = waveVisibility > .005;
        ring.position.set(-.57 - phase * .66, .16, .08);
        ring.scale.setScalar(.22 + phase * (mobile ? .46 : .65));
        material.opacity = waveVisibility * envelope * (mobile ? .26 : .36);
      }
      material.opacity = (1 - white) * (mobile ? .19 : .28);
      particles.visible = material.opacity > .005;
      geometry.setDrawRange(0, mobile ? 28 : count);
      for (let i = 0; i < count; i++) {
        const offset = i * 3;
        positions[offset] = seeds[offset] + Math.sin(elapsed * .11 + i * .8) * .22;
        positions[offset + 1] = ((seeds[offset + 1] + 2 + elapsed * (.025 + (i % 5) * .006)) % 6) - 2;
        positions[offset + 2] = seeds[offset + 2];
      }
      particles.rotation.y = progress * .035;
      attribute.needsUpdate = true;
    },
    dispose() {
      for (const { ring, material } of rings) { ring.removeFromParent(); material.dispose(); }
      ringGeometry.dispose(); particles.removeFromParent();
      geometry.dispose(); material.dispose(); sprite.dispose();
    },
  };
}
