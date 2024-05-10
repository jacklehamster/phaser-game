const WAIT_BETWEEN_LOAD = 10;

const blobs: Record<string, string> = {};

function updateProgress(progress: number) {
  const progressBarDiv = document.getElementById("progress");
  if (progressBarDiv) {
    const p = `${(progress * 100).toFixed(0)}%`;
    progressBarDiv.style.width = p;
    progressBarDiv.textContent = p;
  }
}

export async function prepareUrls(
  urls: (string | undefined)[],
  retry: number = 0,
  totalCount?: number,
  b: Record<string, string> = blobs,
  skipProgressBar = false): Promise<Record<string, string>> {
  if (!urls.length) {
    return {};
  }
  let progressBarDiv;
  if (!skipProgressBar) {
    progressBarDiv = document.getElementById("progress-bar");
    if (progressBarDiv) {
      progressBarDiv.style.display = "";
    }
  }
  const loadCount = totalCount ?? (new Set(urls)).size;
  const promises: Promise<string | undefined>[] = []
  let count = 0;
  const failedUrls: string[] = [];
  for (const url of urls) {
    if (url && !b[url]) {
      promises.push(fetch(url).then(r => r.blob()).then(async b => {
        const split = url.split(".");
        const ext = split[split.length - 1].toLowerCase();
        switch (ext) {
          case "mp3":
          case "ogg":
            if (b.type.indexOf("audio/") !== 0) {
              failedUrls.push(url);
              return;
            }
            break;
          case "png":
          case "jpg":
          case "jpeg":
            if (b.type.indexOf("image/") !== 0) {
              failedUrls.push(url);
              return;
            }
            break;
          case "json":
            if (b.type.indexOf("application/json") !== 0) {
              failedUrls.push(url);
              return;
            }
            break;
        }
        return URL.createObjectURL(b);
      }).then(bl => {
        if (!bl) {
          return;
        }
        const s = b[url] = bl;
        if (!skipProgressBar) {
          updateProgress(Object.values(b).length / loadCount);
        }
        return s;
      }));
      count++;
      if (count % 3 === 0) {
        await Promise.all(promises);
        await new Promise(r => setTimeout(r, WAIT_BETWEEN_LOAD));
        promises.length = 0;
      }
    }
  }
  await Promise.all(promises);
  await new Promise(r => setTimeout(r, WAIT_BETWEEN_LOAD));
  promises.length = 0;
  if (failedUrls.length && retry < 3) {
    console.warn("Retrying", ...failedUrls);
    await prepareUrls(failedUrls, retry + 1, loadCount);
  }
  if (retry === 0) {
    if (progressBarDiv) {
      await new Promise(r => setTimeout(r, 500));
      progressBarDiv.style.display = "none";
    }
  }
  return b;
}

export function u(url: string, b: Record<string, string> = blobs) {
  return b[url] ?? url;
}

export function revoke(url: string, b: Record<string, string> = blobs) {
  if (b[url]) {
    URL.revokeObjectURL(b[url]);
    delete b[url];
  }
}
