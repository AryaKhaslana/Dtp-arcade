import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const { name, answers } = await req.json();

    if (!name || !answers || answers.length !== 3) {
      return NextResponse.json(
        { error: "Data gak lengkap, coba isi ulang ya" },
        { status: 400 }
      );
    }

    // --- DATA CADANGAN SAKTI ---
    // Kalau Gemini error kena limit, kita lempar data ini diem-diem
    const mockResult = {
      title: "Sepuh " + answers[1].split(" ")[0], 
      class: "Glitch Master",
      stats: {
        power: Math.floor(Math.random() * 40) + 60, // Biar angkanya tetep random tipis-tipis
        wisdom: 15,
        chaos: 99,
        vibes: 100
      },
      special_skill: "Turu pas ngerjain project",
      roast: `Percuma senjata lu ${answers[0]}, kalo nemu bug kelakuan lu ujung-ujungnya tetep ${answers[2].toLowerCase()}, kocak lu ${name}!`
    };

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Kalau API Key belum dipasang di .env, langsung pake cadangan
    if (!apiKey) {
      console.log("API Key kosong, pakai data cadangan.");
      await new Promise(r => setTimeout(r, 1500)); // Kasih delay dikit biar animasi loading tetep jalan
      return NextResponse.json(mockResult);
    }

    const systemPrompt = `Kamu adalah AI generator karakter RPG bergaya Gen-Z Indonesia yang lucu dan witty.
Tugasmu: berdasarkan jawaban user, buat karakter RPG fiktif yang nyambung sama jawabannya.
Gaya bahasa: santai, gaul, sedikit alay, banyak referensi anak SMK IT/Programming.
PENTING: Balas HANYA dalam format JSON valid. Struktur:
{
  "title": "gelar lucu, max 5 kata",
  "class": "nama class, max 3 kata",
  "stats": { "power": 1-100, "wisdom": 1-100, "chaos": 1-100, "vibes": 1-100 },
  "special_skill": "skill unik, max 6 kata",
  "roast": "roasting lucu max 20 kata"
}`;

    const userPrompt = `Nama: ${name}\nSenjata: ${answers[0]}\nNongkrong: ${answers[1]}\nKalo ada bug: ${answers[2]}`;

    try {
      // Nyoba nembak Gemini beneran
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
          }),
        }
      );

      // KALO GEMINI NGAMBEK KENA LIMIT (ERROR 429 atau lainnya)
      if (!response.ok) {
        console.warn(`Gemini Error ${response.status}. Pindah ke mode Data Cadangan!`);
        return NextResponse.json(mockResult); // Mulus, user nggak nyadar
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) return NextResponse.json(mockResult);

      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const result = JSON.parse(cleaned);

      return NextResponse.json(result);

    } catch (fetchError) {
      // Kalau fetch gagal total (misal internet putus)
      console.warn("Koneksi LLM putus, switch ke cadangan.");
      return NextResponse.json(mockResult);
    }

  } catch (err) {
    console.error("Route error parah:", err);
    return NextResponse.json(
      { error: "Server lokal lagi pusing, coba lagi ya" },
      { status: 500 }
    );
  }
}