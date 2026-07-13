import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, answers } = await req.json();

    if (!name || !answers || answers.length !== 3) {
      return NextResponse.json(
        { error: "Data gak lengkap, coba isi ulang ya" },
        { status: 400 }
      );
    }

    const systemPrompt = `Kamu adalah AI generator karakter RPG bergaya Gen-Z Indonesia yang lucu dan witty.
Tugasmu: berdasarkan jawaban user, buat karakter RPG fiktif yang nyambung sama jawabannya (jangan generic).

Gaya bahasa: santai, gaul, sedikit alay, banyak referensi meme/anak IT (bug, deadline, kopi, dll), TAPI tetap sopan dan aman untuk acara sekolah.

PENTING: Balas HANYA dalam format JSON valid, tanpa markdown code block, tanpa teks tambahan apapun. Struktur:
{
  "title": "gelar/kelas karakter yang lucu, max 5 kata",
  "class": "nama class RPG yang catchy, max 3 kata",
  "stats": {
    "power": <angka 1-100>,
    "wisdom": <angka 1-100>,
    "chaos": <angka 1-100>,
    "vibes": <angka 1-100>
  },
  "special_skill": "nama jurus/skill unik yang nyambung ke jawaban user, max 6 kata",
  "roast": "satu kalimat roasting/prediksi lucu tentang kepribadian user, max 20 kata, nyambung ke jawaban mereka"
}`;

    const userPrompt = `Nama: ${name}
Senjata andalan: ${answers[0]}
Tempat nongkrong: ${answers[1]}
Kalo ketemu bug: ${answers[2]}

Generate karakter RPG-nya sekarang.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server belum dikonfigurasi, hubungi panitia" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json(
        { error: "AI lagi capek, coba lagi bentar ya" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: "AI gak ngasih jawaban, coba lagi" },
        { status: 502 }
      );
    }

    // Safety parse - jaga-jaga kalau model tetep nyisipin markdown fence
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Predict route error:", err);
    return NextResponse.json(
      { error: "Ada yang error nih, coba lagi ya" },
      { status: 500 }
    );
  }
}