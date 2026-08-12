import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type PlanetSceneProps = { paused: boolean };

export default function PlanetScene({ paused }: PlanetSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = !paused;
  }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xe7eee3, 0.035);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0.2, 0.5, 8.6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 5.8;
    controls.maxDistance = 11;
    controls.autoRotate = !paused;
    controls.autoRotateSpeed = 0.55;
    controls.target.set(0.55, -0.25, 0);

    const world = new THREE.Group();
    world.position.set(0.6, -0.25, 0);
    world.rotation.z = -0.12;
    scene.add(world);

    function watercolorTexture(size = 1024) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d')!;
      const gradient = context.createRadialGradient(size * .35, size * .28, 20, size * .5, size * .5, size * .7);
      gradient.addColorStop(0, '#dcebd0');
      gradient.addColorStop(.48, '#9fbe8d');
      gradient.addColorStop(1, '#557966');
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      const blobs: [string, number, number, number][] = [
        ['#d9c57b', .18, .26, .18], ['#e7d898', .73, .34, .16], ['#789d78', .34, .60, .24],
        ['#5f8c75', .77, .74, .23], ['#d89c83', .49, .17, .11], ['#87aeb1', .15, .78, .15],
      ];
      function softBlob(color: string, x: number, y: number, radius: number, seed: number) {
        for (let layer = 0; layer < 20; layer++) {
          context.beginPath();
          for (let i = 0; i <= 40; i++) {
            const angle = i / 40 * Math.PI * 2;
            const wobble = 1 + Math.sin(angle * 3 + seed) * .12 + Math.sin(angle * 7 + seed * .7) * .055 + (Math.random() - .5) * .08;
            const r = radius * wobble * (1 - layer * .007);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r * (.72 + .08 * Math.sin(seed));
            i ? context.lineTo(px, py) : context.moveTo(px, py);
          }
          context.closePath();
          context.globalAlpha = .018 + layer * .0022;
          context.fillStyle = color;
          context.fill();
        }
      }
      blobs.forEach((blob, index) => softBlob(blob[0], blob[1] * size, blob[2] * size, blob[3] * size, index * 1.73 + .5));
      context.globalAlpha = 1;
      const image = context.getImageData(0, 0, size, size);
      for (let i = 0; i < image.data.length; i += 4) {
        const noise = (Math.random() - .5) * 18;
        image.data[i] += noise; image.data[i + 1] += noise; image.data[i + 2] += noise;
      }
      context.putImageData(image, 0, 0);
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * size, y = Math.random() * size, radius = 8 + Math.random() * 32;
        const wash = context.createRadialGradient(x, y, 0, x, y, radius);
        wash.addColorStop(0, 'rgba(255,255,240,.11)'); wash.addColorStop(1, 'rgba(255,255,240,0)');
        context.fillStyle = wash; context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return texture;
    }

    const planetGeometry = new THREE.SphereGeometry(2.25, 192, 128);
    const positions = planetGeometry.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      const noise = Math.sin(vertex.x * 5.1 + vertex.y * 2.3) * .013 + Math.sin(vertex.z * 8.6 - vertex.x * 3.2) * .009 + Math.sin((vertex.x + vertex.y + vertex.z) * 12) * .004;
      vertex.multiplyScalar(1 + noise);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    planetGeometry.computeVertexNormals();
    const watercolorMap = watercolorTexture();
    const planet = new THREE.Mesh(planetGeometry, new THREE.MeshPhysicalMaterial({ map: watercolorMap, roughness: .9, metalness: 0, clearcoat: .06, clearcoatRoughness: 1, bumpScale: .03 }));
    planet.rotation.y = -.7;
    world.add(planet);

    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = cloudCanvas.height = 512;
    const cloudContext = cloudCanvas.getContext('2d')!;
    for (let i = 0; i < 95; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, rx = 8 + Math.random() * 38, ry = 2 + Math.random() * 9;
      cloudContext.fillStyle = `rgba(255,255,244,${.025 + Math.random() * .08})`;
      cloudContext.beginPath(); cloudContext.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2); cloudContext.fill();
    }
    const cloudMap = new THREE.CanvasTexture(cloudCanvas);
    cloudMap.colorSpace = THREE.SRGBColorSpace;
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(2.29, 128, 96), new THREE.MeshBasicMaterial({ map: cloudMap, transparent: true, opacity: .72, depthWrite: false }));
    world.add(clouds);

    const atmosphereMaterial = new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      uniforms: { glowColor: { value: new THREE.Color('#b9d8c2') }, viewVector: { value: camera.position.clone() } },
      vertexShader: `varying vec3 vNormal; varying vec3 vWorldPosition; void main(){vNormal=normalize(normalMatrix*normal);vec4 worldPosition=modelMatrix*vec4(position,1.0);vWorldPosition=worldPosition.xyz;gl_Position=projectionMatrix*viewMatrix*worldPosition;}`,
      fragmentShader: `uniform vec3 glowColor;uniform vec3 viewVector;varying vec3 vNormal;varying vec3 vWorldPosition;void main(){vec3 viewDir=normalize(viewVector-vWorldPosition);float intensity=pow(0.58-dot(vNormal,viewDir),2.3);gl_FragColor=vec4(glowColor,intensity*0.55);}`,
    });
    world.add(new THREE.Mesh(new THREE.SphereGeometry(2.39, 96, 64), atmosphereMaterial));

    for (let ringIndex = 0; ringIndex < 2; ringIndex++) {
      const curve = new THREE.EllipseCurve(0, 0, 3.4 + ringIndex * .34, 1.18 + ringIndex * .1, 0, Math.PI * 2, false, .08);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(160).map((point: { x: number; y: number }) => new THREE.Vector3(point.x, point.y, 0)));
      const ring = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: ringIndex ? 0xb6aa7c : 0x6f8d78, transparent: true, opacity: ringIndex ? .16 : .24 }));
      ring.rotation.x = Math.PI * (.49 + ringIndex * .05); ring.rotation.z = -.2 + ringIndex * .25; world.add(ring);
    }
    const moon = new THREE.Mesh(new THREE.SphereGeometry(.18, 32, 24), new THREE.MeshStandardMaterial({ color: 0xe4d7a6, roughness: 1 }));
    moon.position.set(-3.25, 1.15, .2); world.add(moon);
    scene.add(new THREE.HemisphereLight(0xfffee8, 0x567264, 2.2));
    const key = new THREE.DirectionalLight(0xfff3d8, 3.2); key.position.set(-3, 5, 6); scene.add(key);
    const fill = new THREE.PointLight(0xa9d5c0, 1.6, 18); fill.position.set(4, -2, 4); scene.add(fill);

    const starPositions: number[] = [], starColors: number[] = [];
    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#e8d8a9'), new THREE.Color('#a9c7b4')];
    for (let i = 0; i < 280; i++) {
      const radius = 6 + Math.random() * 7, theta = Math.random() * Math.PI * 2, phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      starPositions.push(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
      const color = palette[Math.floor(Math.random() * palette.length)]; starColors.push(color.r, color.g, color.b);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ size: .035, transparent: true, opacity: .62, vertexColors: true, depthWrite: false }));
    scene.add(stars);

    const resize = () => {
      const width = host.clientWidth;
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Shift the projection instead of the model so OrbitControls keeps
      // rotating around the planet while its resting position sits at 68vw.
      camera.setViewOffset(width, height, -width * .18, 0, width, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const clock = new THREE.Clock(); let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      clouds.rotation.y += .00035;
      moon.position.x = -3.25 * Math.cos(time * .12); moon.position.z = 3.25 * Math.sin(time * .12); moon.position.y = 1.05 + Math.sin(time * .32) * .18;
      stars.rotation.y += .000045;
      atmosphereMaterial.uniforms.viewVector.value.copy(camera.position);
      controls.update(); renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); controlsRef.current = null;
      scene.traverse((object: any) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material: any) => material.dispose());
        }
      });
      watercolorMap.dispose(); cloudMap.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="planet-scene" aria-hidden="true" />;
}
