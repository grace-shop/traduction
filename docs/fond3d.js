// Fond 3D : une grille d'ondes lumineuses et un anneau en rotation.
// Léger pour les téléphones : peu de points, pause quand l'onglet est caché,
// immobile si l'utilisateur demande moins d'animations.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("fond");
const reduire = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
} catch {
  canvas.style.display = "none"; // pas de WebGL : le fond CSS reste affiché
}
if (renderer) demarrer(renderer);

function demarrer(renderer) {
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 3.2, 9);
camera.lookAt(0, 0, 0);

// Grille d'ondes
const colonnes = 64;
const lignes = 34;
const positions = new Float32Array(colonnes * lignes * 3);
let i = 0;
for (let y = 0; y < lignes; y++) {
  for (let x = 0; x < colonnes; x++) {
    positions[i++] = (x / (colonnes - 1) - 0.5) * 22;
    positions[i++] = 0;
    positions[i++] = (y / (lignes - 1) - 0.5) * 14;
  }
}
const geometrieGrille = new THREE.BufferGeometry();
geometrieGrille.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const grille = new THREE.Points(
  geometrieGrille,
  new THREE.PointsMaterial({ color: 0x7cf5ff, size: 0.055, transparent: true, opacity: 0.85 })
);
grille.position.y = -2.6;
scene.add(grille);

// Anneau central
const anneau = new THREE.Mesh(
  new THREE.TorusGeometry(2.6, 0.012, 8, 220),
  new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.55 })
);
anneau.rotation.x = Math.PI / 2.4;
scene.add(anneau);

const anneau2 = new THREE.Mesh(
  new THREE.TorusGeometry(3.4, 0.008, 8, 220),
  new THREE.MeshBasicMaterial({ color: 0x7cf5ff, transparent: true, opacity: 0.3 })
);
anneau2.rotation.x = Math.PI / 2.1;
anneau2.rotation.y = 0.4;
scene.add(anneau2);

function dimensionner() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", dimensionner);
dimensionner();

let temps = 0;
function image(dt) {
  temps += dt;
  const pos = geometrieGrille.attributes.position.array;

  for (let y = 0; y < lignes; y++) {
    for (let x = 0; x < colonnes; x++) {
      const px = pos[(y * colonnes + x) * 3];
      const pz = pos[(y * colonnes + x) * 3 + 2];
      pos[(y * colonnes + x) * 3 + 1] =
        Math.sin(px * 0.6 + temps * 1.1) * 0.35 + Math.cos(pz * 0.7 + temps * 0.9) * 0.3;

    }
  }
  geometrieGrille.attributes.position.needsUpdate = true;
  anneau.rotation.z += dt * 0.25;
  anneau2.rotation.z -= dt * 0.15;
  renderer.render(scene, camera);
}

if (reduire) {
  image(0);
} else {
  let precedent = performance.now();
  const boucle = (maintenant) => {
    const dt = Math.min((maintenant - precedent) / 1000, 0.05);
    precedent = maintenant;
    image(dt);
    requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
}
}
