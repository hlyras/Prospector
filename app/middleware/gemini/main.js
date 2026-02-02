const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function GeminiImageEdit({ imagePath, prompt }) {
  try {
    // Inicialize o cliente com sua chave de API
    // Recomenda-se usar process.env.GEMINI_API_KEY
    // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // O modelo gemini-2.0-flash ou pro com suporte a geração de imagem
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const buffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();

    const mimeMap = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    };

    const mimeType = mimeMap[ext];
    if (!mimeType) {
      throw new Error(`Formato não suportado: ${ext}`);
    }

    // Preparar a imagem no formato que o Gemini espera (Base64 inline)
    const imagePart = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType
      },
    };

    // No Gemini, enviamos o prompt e a imagem como um array de partes
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;

    // Localizar a parte da resposta que contém os dados da imagem gerada
    const generatedPart = response.candidates[0].content.parts.find(part => part.inlineData);

    if (!generatedPart) {
      throw new Error("O Gemini não retornou dados de imagem. Verifique se o prompt permite geração visual.");
    }

    // Converter o base64 de retorno para Buffer
    const outputBuffer = Buffer.from(generatedPart.inlineData.data, "base64");

    // Definir o caminho de saída
    const fileName = `logo-${Date.now()}.png`;
    const publicDir = path.join(process.cwd(), "public", "images", "ai");

    // Garantir que a pasta existe
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const filePath = path.join(publicDir, fileName);

    fs.writeFileSync(filePath, outputBuffer);

    return filePath;
  } catch (err) {
    console.error("Erro ao processar imagem no Gemini:", err);
    return null;
  }
}

module.exports = { GeminiImageEdit };