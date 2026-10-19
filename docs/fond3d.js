// Fond 3D : un noyau holographique au centre, des anneaux orbitaux portés par des satellites
// lumineux (chacun représente une langue), un champ d'étoiles en profondeur et une grille d'ondes.
// Léger pour les téléphones : moins de points, pause quand l'onglet est caché, immobile si
// l'utilisateur demande moins d'animations.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("fond");
const reduire = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = window.matchMedia("(max-width: 720px)").matches;

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: "low-power" });
} catch {
  canvas.style.display = "none"; // pas de WebGL : le fond CSS reste affiché
}
if (renderer) demarrer(renderer);

function demarrer(renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04050b, 0.035);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 1.6, 15);

  const materiau = (couleur, opacite) =>
    new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: opacite, depthWrite: false });

  // Noyau : deux solides en fil de fer qui tournent en sens inverse, et une lueur interne.
  const noyau = new THREE.Group();
  const icosa = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), materiau(0x7af3ff, 0.55));
  icosa.material.wireframe = true;
  const octa = new THREE.Mesh(new THREE.OctahedronGeometry(1.3, 0), materiau(0x9d7bff, 0.6));
  octa.material.wireframe = true;
  const lueur = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), materiau(0x7af3ff, 0.09));
  noyau.add(icosa, octa, lueur);
  scene.add(noyau);

  // Anneaux orbitaux, inclinés différemment, avec un satellite par anneau.
  const anneaux = [];
  const satellites = [];
  [
    { r: 3.6, c: 0x7af3ff, inc: 1.15, vit: 0.35 },
    { r: 4.9, c: 0x9d7bff, inc: 0.55, vit: -0.22 },
    { r: 6.2, c: 0xffc978, inc: 1.45, vit: 0.15 },
  ].forEach(({ r, c, inc, vit }) => {
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 240), materiau(c, 0.5));
    anneau.rotation.x = inc;
    const pivot = new THREE.Group();
    pivot.rotation.x = inc;
    pivot.add(anneau);
    const point = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), materiau(c, 1));
    pivot.add(point);
    scene.add(pivot);
    anneaux.push({ pivot, point, r, vit, phase: Math.random() * Math.PI * 2 });
  });

  // Champ d'étoiles en profondeur.
  const N = mobile ? 900 : 2200;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 9 + Math.random() * 46;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(p) * Math.cos(t);
    positions[i * 3 + 1] = r * Math.cos(p) * 0.7;
    positions[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
  }
  const etoiles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({ size: 0.06, color: 0xbff7ff, transparent: true, opacity: 0.8, depthWrite: false })
  );
  scene.add(etoiles);

  // Grille d'ondes au sol.
  const colonnes = mobile ? 40 : 64;
  const lignes = mobile ? 22 : 34;
  const ondes = new Float32Array(colonnes * lignes * 3);
  let i = 0;
  for (let y = 0; y < lignes; y++) {
    for (let x = 0; x < colonnes; x++) {
      ondes[i++] = (x / (colonnes - 1) - 0.5) * 30;
      ondes[i++] = 0;
      ondes[i++] = (y / (lignes - 1) - 0.5) * 18;
    }
  }
  const geoOndes = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(ondes, 3));
  const grille = new THREE.Points(geoOndes, new THREE.PointsMaterial({ color: 0x7af3ff, size: 0.05, transparent: true, opacity: 0.6, depthWrite: false }));
  grille.position.y = -3.6;
  scene.add(grille);

  function dimensionner() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", dimensionner);
  dimensionner();

  // La caméra suit doucement la souris (ou le doigt).
  const cible = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    cible.x = e.clientX / window.innerWidth - 0.5;
    cible.y = e.clientY / window.innerHeight - 0.5;
  });

  let temps = 0;
  function image(dt) {
    temps += dt;
    noyau.rotation.y += dt * 0.12;
    icosa.rotation.x += dt * 0.05;
    octa.rotation.y -= dt * 0.22;
    const pulsation = 1 + Math.sin(temps * 1.4) * 0.04;
    lueur.scale.setScalar(pulsation);

    anneaux.forEach((a) => {
      a.pivot.rotation.z += dt * a.vit;
      const angle = temps * a.vit * 2.2 + a.phase;
      a.point.position.set(Math.cos(angle) * a.r, 0, Math.sin(angle) * a.r);
    });

    const pos = geoOndes.attributes.position.array;
    for (let y = 0; y < lignes; y++) {
      for (let x = 0; x < colonnes; x++) {
        const k = (y * colonnes + x) * 3;
        pos[k + 1] = Math.sin(pos[k] * 0.55 + temps * 1.1) * 0.35 + Math.cos(pos[k + 2] * 0.7 + temps * 0.9) * 0.3;
      }
    }
    geoOndes.attributes.position.needsUpdate = true;
    etoiles.rotation.y += dt * 0.012;

    camera.position.x += (cible.x * 3 - camera.position.x) * 0.04;
    camera.position.y += (1.6 - cible.y * 2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  if (reduire) {
    image(0);
    return;
  }
  let precedent = performance.now();
  const boucle = (maintenant) => {
    const dt = Math.min((maintenant - precedent) / 1000, 0.05);
    precedent = maintenant;
    if (!document.hidden) image(dt);
    requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
}
