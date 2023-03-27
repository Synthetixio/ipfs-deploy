import { createReadStream, promises as fs } from 'fs';
import * as IPFSHttpClient from 'ipfs-http-client';
import { resolve } from 'path';

export async function getFilesRecursively(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const filePaths = await Promise.all(
    entries.map(async (entry) => {
      const res = resolve(dir, entry.name);
      return entry.isDirectory() ? getFilesRecursively(res) : res;
    })
  );

  return Array.prototype.concat(...filePaths);
}

export async function deploy({
  log = () => null,
  srcDir,
  IPFS_HOST,
  IPFS_PORT,
  IPFS_PROTOCOL,
  IPFS_USER,
  IPFS_PASS,
}) {
  const directory = resolve(srcDir);
  const filePaths = await getFilesRecursively(directory);
  const root = 'www';
  const files = filePaths.map((path) => ({
    path: `${root}/${path.slice(directory.length + 1)}`,
    content: createReadStream(path),
  }));
  files.forEach((f) => log(f.path));

  const ipfs = IPFSHttpClient.create({
    host: IPFS_HOST,
    port: IPFS_PORT,
    protocol: IPFS_PROTOCOL,
    headers: {
      ...(IPFS_USER || IPFS_PASS
        ? {
            Authorization: 'Basic ' + Buffer.from(`${IPFS_USER}:${IPFS_PASS}`).toString('base64'),
          }
        : {}),
      'Content-Encoding': 'utf-8',
    },
    timeout: '5m',
  });

  let rootCid;
  for await (const result of ipfs.addAll(files)) {
    log(result.cid.toString(), result.path);
    if (result.path === root) {
      rootCid = result.cid.toString();
    }
  }
  return rootCid;
}
