// helpers/media-queue.js

const queue = [];
let running = 0;
const MAX_CONCURRENT = 5; // máximo de downloads simultâneos

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function queueDownload(taskFn) {
  return new Promise((resolve, reject) => {
    queue.push({ taskFn, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (running >= MAX_CONCURRENT || queue.length === 0) return;

  const { taskFn, resolve, reject } = queue.shift();
  running++;

  try {
    const result = await taskFn();
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    running--;
    await delay(100); // pequeno respiro entre downloads
    processQueue();
  }
}