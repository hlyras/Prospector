import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

// helpers/group-metadata.js

/**
 * 🔁 getGroupMetadataCached(sock, jid)
 * Faz cache do metadata de grupos e evita requisições duplicadas.
 * Inclui controle de rate-limit (429) e TTL configurável.
 */

const groupCache = new Map(); // cache compartilhado em todo o projeto

// configurações
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos
const RETRY_DELAY = 15000; // 15 segundos entre tentativas se der 429
const MAX_RETRIES = 3;

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function getGroupMetadataCached(sock, jid) {
  const now = Date.now();
  const key = `meta_${jid}`;
  const cached = groupCache.get(key);

  // ✅ 1. Retorna do cache se ainda estiver dentro do TTL
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // ✅ 2. Se já existe uma requisição pendente, espera ela terminar
  if (groupCache.get(`${key}_pending`)) {
    while (!groupCache.get(key) && groupCache.get(`${key}_pending`)) {
      await delay(300);
    }
    return groupCache.get(key)?.data || null;
  }

  // Marca como pendente para evitar chamadas simultâneas
  groupCache.set(`${key}_pending`, true);

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const metadata = await sock.groupMetadata(jid);

      // salva no cache
      groupCache.set(key, { data: metadata, timestamp: now });
      return metadata;
    } catch (err) {
      const code = err?.data || err?.output?.statusCode;
      const isRateLimit = code === 429 || err?.message?.includes('rate-overlimit');

      if (isRateLimit) {
        attempt++;
        const wait = RETRY_DELAY * attempt;
        console.warn(`⚠️ Rate limit (tentativa ${attempt}/${MAX_RETRIES}) para ${jid}. Aguardando ${wait / 1000}s...`);
        await delay(wait);
        continue;
      }

      console.error(`❌ Erro ao buscar metadata do grupo ${jid}:`, err);
      return null;
    } finally {
      groupCache.delete(`${key}_pending`);
    }
  }

  console.error(`❌ Falha ao buscar metadata do grupo ${jid} após ${MAX_RETRIES} tentativas.`);
  return null;
}

// (Opcional) limpeza automática do cache a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of groupCache.entries()) {
    if (key.startsWith('meta_') && value?.timestamp && now - value.timestamp > CACHE_TTL) {
      groupCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

async function getProfilePicWithTimeout(waSocket, jid, timeout = 5000) {
  // sanity checks
  try {
    if (!waSocket) return null;
    // se o socket não estiver autenticado, espere um pouco ou retorne null
    if (!waSocket?.user) return null;

    // não tenta perfil de grupo
    if (jid?.endsWith?.('@g.us')) return null;

    // Promise que obtém a url (envolvemos em try/catch para evitar rejeições não tratadas)
    const getUrl = (async () => {
      try {
        const url = await waSocket.profilePictureUrl(jid, 'image');
        return url || null;
      } catch (err) {
        // erro comum: 404 / not_found ou Boom -> retornamos null silenciosamente
        return null;
      }
    })();

    // Promise de timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(null), timeout);
    });

    // race entre obter a url e o timeout
    const res = await Promise.race([getUrl, timeoutPromise]);

    return res; // url string ou null
  } catch (err) {
    // qualquer erro inesperado aqui -> log e retorna null
    console.error('Erro em getProfilePicWithTimeout:', err);
    return null;
  }
};

async function downloadMedia(data, waSocket) {
  try {
    if (!data?.message) return null;

    // pasta de destino
    const tempFolder = join(__dirname, '../../temp');
    if (!existsSync(tempFolder)) {
      mkdirSync(tempFolder, { recursive: true });
    }

    let mediaType = null;
    if (data.message.imageMessage) mediaType = 'image';
    else if (data.message.audioMessage) mediaType = 'audio';
    else if (data.message.videoMessage) mediaType = 'video';
    if (!mediaType) return null;

    // nome do arquivo
    const ext = mediaType === 'image' ? 'jpg' : mediaType === 'audio' ? 'ogg' : 'mp4';
    const fileName = `media_${Date.now()}.${ext}`;
    const filePath = join(tempFolder, fileName);

    // download da mídia
    const stream = await downloadContentFromMessage(data.message, mediaType, waSocket);
    const buffer = [];
    for await (const chunk of stream) buffer.push(chunk);
    const mediaBuffer = Buffer.concat(buffer);

    // salva no disco
    writeFileSync(filePath, mediaBuffer);

    return filePath; // retorna o caminho salvo
  } catch (err) {
    console.error('❌ Erro ao baixar mídia:', err);
    return null;
  }
}

export default {
  getProfilePicWithTimeout,
  downloadMedia,
  getGroupMetadataCached
}