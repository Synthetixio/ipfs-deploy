import { promises as fs } from 'fs';
import { jest } from '@jest/globals';
import { join } from 'path';
import { tmpdir } from 'os';

let mockIpfsHttpClient;
let tempDir;
let deploy;
let getFilesRecursively;
let addAll;
beforeEach(async () => {
  jest.resetModules();

  addAll = jest.fn(() => [
    { path: 'www/css/file2.css', cid: { toString: () => 'QmFile2' } },
    { path: 'www/file1.html', cid: { toString: () => 'QmFile1' } },
    { path: 'www', cid: { toString: () => 'QmRoot' } },
  ]);
  mockIpfsHttpClient = { create: jest.fn(() => ({ addAll })) };

  jest.unstable_mockModule('ipfs-http-client', () => ({ create: mockIpfsHttpClient.create }));

  // Import the module
  const module = await import('./deploy.mjs');
  deploy = module.deploy;
  getFilesRecursively = module.getFilesRecursively;

  // Create a temporary directory with files
  const tempDirPrefix = join(tmpdir(), `ipfs-deploy-test-`);
  tempDir = await fs.mkdtemp(tempDirPrefix);
});

afterEach(async () => {
  jest.clearAllMocks();

  // Clean up the temporary directory
  await fs.rm(tempDir, { recursive: true, force: true });
});

test('getFilesRecursively should return file paths', async () => {
  await fs.writeFile(join(tempDir, 'file1.html'), '<html><body></body></html>');
  await fs.mkdir(join(tempDir, 'css'), { recursive: true });
  await fs.writeFile(join(tempDir, 'css', 'file2.css'), 'body { background: red; }');

  // Get files recursively
  const filePaths = await getFilesRecursively(tempDir);

  // Check if the expected file paths are returned
  expect(filePaths).toEqual(
    expect.arrayContaining([join(tempDir, 'file1.html'), join(tempDir, 'css', 'file2.css')])
  );
});

test('getFilesRecursively should return an empty array for an empty directory', async () => {
  // Get files recursively
  const filePaths = await getFilesRecursively(tempDir);

  // Check if an empty array is returned
  expect(filePaths).toEqual([]);
});

test('deploy should call IPFSHttpClient.create with correct options', async () => {
  const testOptions = {
    log: () => null,
    srcDir: tempDir,
    IPFS_HOST: 'ipfs.example.com',
    IPFS_PORT: 1234,
    IPFS_PROTOCOL: 'https',
    IPFS_USER: 'testUser',
    IPFS_PASS: 'testPass',
  };

  await deploy(testOptions);

  expect(mockIpfsHttpClient.create).toHaveBeenCalledWith({
    host: testOptions.IPFS_HOST,
    port: testOptions.IPFS_PORT,
    protocol: testOptions.IPFS_PROTOCOL,
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(`${testOptions.IPFS_USER}:${testOptions.IPFS_PASS}`).toString('base64'),
      'Content-Encoding': 'utf-8',
    },
    timeout: '5m',
  });
});

test('deploy should call ipfs.addAll with correct file paths and content', async () => {
  // Write files to tempDir
  const file1Content = '<html><body></body></html>';
  const file2Content = 'body { background: red; }';
  await fs.writeFile(join(tempDir, 'file1.html'), file1Content);
  await fs.mkdir(join(tempDir, 'css'), { recursive: true });
  await fs.writeFile(join(tempDir, 'css', 'file2.css'), file2Content);

  // Import the module and call the function
  const { deploy } = await import('./deploy.mjs');
  await deploy({
    log: () => null,
    srcDir: tempDir,
    IPFS_HOST: 'ipfs.example.com',
    IPFS_PORT: 1234,
    IPFS_PROTOCOL: 'https',
    IPFS_USER: 'testUser',
    IPFS_PASS: 'testPass',
  });

  const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  };

  const expectedFiles = [
    {
      path: 'www/css/file2.css',
      content: Buffer.from(file2Content),
    },
    {
      path: 'www/file1.html',
      content: Buffer.from(file1Content),
    },
  ];

  for (const [index, actualFile] of addAll.mock.calls[0][0].entries()) {
    const actualContent = await streamToBuffer(actualFile.content);
    expect(actualFile.path).toEqual(expectedFiles[index].path);
    expect(actualContent).toEqual(expectedFiles[index].content);
  }
});

test('deploy should return root CID', async () => {
  // Write files to tempDir
  const file1Content = '<html><body></body></html>';
  const file2Content = 'body { background: red; }';
  await fs.writeFile(join(tempDir, 'file1.html'), file1Content);

  // Import the module and call the function
  const { deploy } = await import('./deploy.mjs');
  const rootCID = await deploy({
    log: () => null,
    srcDir: tempDir,
  });

  // Check if the root CID is returned
  expect(rootCID).toEqual('QmRoot');
});

test('deploy should log added CIDs with the provided log function', async () => {
  // Write files to tempDir
  const file1Content = '<html><body></body></html>';
  const file2Content = 'body { background: red; }';
  await fs.writeFile(join(tempDir, 'file1.html'), file1Content);
  await fs.mkdir(join(tempDir, 'css'), { recursive: true });
  await fs.writeFile(join(tempDir, 'css', 'file2.css'), file2Content);

  // Import the module and call the function
  const { deploy } = await import('./deploy.mjs');

  const log = jest.fn();
  await deploy({
    log,
    srcDir: tempDir,
  });

  // Check if the log function was called with the correct CIDs and paths
  expect(log.mock.calls).toEqual([
    ['www/css/file2.css'],
    ['www/file1.html'],
    ['QmFile2', 'www/css/file2.css'],
    ['QmFile1', 'www/file1.html'],
    ['QmRoot', 'www'],
  ]);
});
