// Fond 3D : un champ d'étoiles lent, en profondeur. Sa couleur suit le thème.
// Léger pour les téléphones : moins de points, pause quand l'onglet est caché,
// immobile si l'utilisateur demande moins d'animations.
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

function couleurDuTheme() {
  const brut = getComputedStyle(document.body).getPropertyValue("--aurore").trim();
  return brut || "#7af3ff";
}

function demarrer(renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 0, 14);

  const N = mobile ? 700 : 1800;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 9 + Math.random() * 40;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(p) * Math.cos(t);
    positions[i * 3 + 1] = r * Math.cos(p) * 0.7;
    positions[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
  }
  const geometrie = new THREE.BufferGeometry();
  geometrie.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const materiau = new THREE.PointsMaterial({
    size: 0.05, color: couleurDuTheme(), transparent: true, opacity: 0.7, depthWrite: false,
  });
  const etoiles = new THREE.Points(geometrie, materiau);
  scene.add(etoiles);

  // Le thème change la couleur des étoiles, sans recharger la scène.
  document.addEventListener("themechange", () => materiau.color.set(couleurDuTheme()));

  function dimensionner() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", dimensionner);
  dimensionner();

  function image(dt) {
    etoiles.rotation.y += dt * 0.015;
    etoiles.rotation.x += dt * 0.004;
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
