import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let url = searchParams.get("url");

  if (!url || url.trim() === "") {
    return NextResponse.json({ error: "URL manquante" }, { status: 400 });
  }

  try {
    // 1. Nettoyage de l'URL si elle est encodée plusieurs fois
    if (url.includes("proxy-img?url=")) {
      const parts = url.split("proxy-img?url=");
      url = decodeURIComponent(parts[parts.length - 1]);
    }

    if (!url.startsWith("http")) {
      url = decodeURIComponent(url);
    }

    // 2. Appel direct à TikTok en feignant un comportement de navigateur
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/jpeg,image/png,video/*,*/*;q=0.8",
        "Referer": "https://www.tiktok.com/",
        "Cache-Control": "no-cache"
      }
    });

    if (!res.ok) {
      throw new Error(`Erreur TikTok : ${res.status}`);
    }

    // 3. Extraction du flux binaire (Audio, Vidéo ou Image)
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "image/jpeg";

    // 4. On renvoie la réponse brute au navigateur
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error: any) {
    console.error("Erreur Proxy :", error.message);
    // Fallback transparent en cas de crash
    return new NextResponse(
      Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"),
      { headers: { "Content-Type": "image/gif" } }
    );
  }
}