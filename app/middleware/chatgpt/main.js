const OpenAIApi = require("openai");
const fs = require("fs");
const path = require("path");

const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY,
  organization: "org-b3yL4hVCnKtGVieDRztus6p0"
});

const ChatGPTAPI = async (message) => {
  const completion = await openai.chat.completions.create(message);
  return completion.choices[0].message.content;
};

async function ChatGPTTranscription(filePath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "gpt-4o-transcribe",
  });

  return transcription.text;
}

async function ChatGPTTTS(text, voice = 'aria') {
  try {
    // Caminho físico da pasta /public/tts/
    const ttsDir = path.join(process.cwd(), "public", "tts");

    // Garante que a pasta exista
    if (!fs.existsSync(ttsDir)) {
      fs.mkdirSync(ttsDir, { recursive: true });
    }

    // Nome do arquivo com timestamp
    const filename = `tts_${Date.now()}.mp3`;

    // Caminho físico do arquivo a ser salvo
    const outputPath = path.join(ttsDir, filename);

    // Gera o áudio
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: `${text}`
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    // Caminho público utilizado no browser
    const publicPath = `/tts/${filename}`;

    return publicPath;

  } catch (err) {
    console.error("Erro ao gerar TTS:", err);
    return null;
  }
}

module.exports = {
  ChatGPTAPI,
  ChatGPTTranscription,
  ChatGPTTTS
};