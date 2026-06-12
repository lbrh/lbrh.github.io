'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT  = 200;
const CONNECT_DIST    = 7.5;
const MAX_CONNECTIONS = 600;

interface Pt { vx: number; vy: number; vz: number; baseX: number; baseY: number; baseZ: number; }

export default function ParticleCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    /* ── Renderer ─────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    /* ── Scene ────────────────────────────────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    camera.position.z = 40;

    /* ── Glowing dot texture ──────────────────────────────── */
    const tc  = document.createElement('canvas');
    tc.width  = 64; tc.height = 64;
    const tcx = tc.getContext('2d')!;
    const g   = tcx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,   'rgba(0,229,200,1)');
    g.addColorStop(0.25,'rgba(0,229,200,0.65)');
    g.addColorStop(0.7, 'rgba(0,229,200,0.12)');
    g.addColorStop(1,   'rgba(0,229,200,0)');
    tcx.fillStyle = g;
    tcx.fillRect(0, 0, 64, 64);
    const ptTex = new THREE.CanvasTexture(tc);

    /* ── Particles ────────────────────────────────────────── */
    const pArr  = new Float32Array(PARTICLE_COUNT * 3);
    const pts: Pt[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const bx = (Math.random() - 0.5) * 58;
      const by = (Math.random() - 0.5) * 34;
      const bz = (Math.random() - 0.5) * 24;
      pArr[i * 3]     = bx;
      pArr[i * 3 + 1] = by;
      pArr[i * 3 + 2] = bz;
      pts.push({
        vx: (Math.random() - 0.5) * 0.012,
        vy: (Math.random() - 0.5) * 0.012,
        vz: (Math.random() - 0.5) * 0.004,
        baseX: bx, baseY: by, baseZ: bz,
      });
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pArr.slice(), 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.42,
      map: ptTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      opacity: 0.9,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    /* ── Connection lines ─────────────────────────────────── */
    const linePos = new Float32Array(MAX_CONNECTIONS * 6);
    const lGeo    = new THREE.BufferGeometry();
    lGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage),
    );
    lGeo.setDrawRange(0, 0);

    const lMat = new THREE.LineBasicMaterial({
      color: 0x00e5c8,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.LineSegments(lGeo, lMat));

    /* ── Wireframe icosahedron (background glyph) ─────────── */
    const icoGeo = new THREE.IcosahedronGeometry(12, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x00e5c8,
      wireframe: true,
      transparent: true,
      opacity: 0.025,
    });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    ico.position.set(10, -2, -10);
    scene.add(ico);

    /* ── Torus knot (secondary glyph) ────────────────────── */
    const tkGeo = new THREE.TorusKnotGeometry(5, 1.2, 80, 12);
    const tkMat = new THREE.MeshBasicMaterial({
      color: 0x7c5cfc,
      wireframe: true,
      transparent: true,
      opacity: 0.018,
    });
    const torus = new THREE.Mesh(tkGeo, tkMat);
    torus.position.set(-16, 5, -8);
    scene.add(torus);

    /* ── Mouse ────────────────────────────────────────────── */
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* ── Resize ───────────────────────────────────────────── */
    const onResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── Animation ────────────────────────────────────────── */
    let raf  = 0;
    let time = 0;

    const tick = () => {
      raf  = requestAnimationFrame(tick);
      time += 0.008;

      const p = pGeo.attributes.position.array as Float32Array;

      /* Wave / drift particles */
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        p[i3]     += pts[i].vx + Math.sin(time + pts[i].baseY * 0.4) * 0.003;
        p[i3 + 1] += pts[i].vy + Math.cos(time + pts[i].baseX * 0.4) * 0.003;
        p[i3 + 2] += pts[i].vz;

        /* Wrap */
        if (p[i3]     >  29) p[i3]     = -29;
        if (p[i3]     < -29) p[i3]     =  29;
        if (p[i3 + 1] >  17) p[i3 + 1] = -17;
        if (p[i3 + 1] < -17) p[i3 + 1] =  17;
        if (p[i3 + 2] >  12) p[i3 + 2] = -12;
        if (p[i3 + 2] < -12) p[i3 + 2] =  12;
      }
      pGeo.attributes.position.needsUpdate = true;

      /* Lines */
      const lp = lGeo.attributes.position.array as Float32Array;
      let cnt  = 0;
      for (let i = 0; i < PARTICLE_COUNT && cnt < MAX_CONNECTIONS; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT && cnt < MAX_CONNECTIONS; j++) {
          const dx = p[i * 3] - p[j * 3];
          const dy = p[i * 3 + 1] - p[j * 3 + 1];
          const dz = p[i * 3 + 2] - p[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < CONNECT_DIST * CONNECT_DIST) {
            const l = cnt * 6;
            lp[l]     = p[i * 3];     lp[l + 1] = p[i * 3 + 1]; lp[l + 2] = p[i * 3 + 2];
            lp[l + 3] = p[j * 3];     lp[l + 4] = p[j * 3 + 1]; lp[l + 5] = p[j * 3 + 2];
            cnt++;
          }
        }
      }
      lGeo.attributes.position.needsUpdate = true;
      lGeo.setDrawRange(0, cnt * 2);

      /* Wireframe glyphs rotate */
      ico.rotation.x = time * 0.18;
      ico.rotation.y = time * 0.12;
      torus.rotation.x = time * -0.14;
      torus.rotation.z = time * 0.09;

      /* Camera subtle mouse parallax */
      camera.position.x += (mouse.x * 4  - camera.position.x) * 0.016;
      camera.position.y += (mouse.y * 2.5 - camera.position.y) * 0.016;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      [pGeo, lGeo, icoGeo, tkGeo].forEach(g => g.dispose());
      [pMat, lMat, icoMat, tkMat].forEach(m => m.dispose());
      ptTex.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}
