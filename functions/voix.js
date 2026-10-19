// Remplace la route /voix de serveur.py sur Cloudflare Pages.
// Les données viennent de voix-data.js, généré une fois avec generer_voix.py.
import { VOIX } from "./voix-data.js";

export async function onRequestGet({ request }) {
  const langue = new URL(request.url).searchParams.get("langue") || "";

  if (!/^[a-z]{2,3}$/.test(langue)) {
    return new Response(JSON.stringify({ detail: "Langue non prise en charge" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  return new Response(JSON.stringify(VOIX[langue] || []), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
