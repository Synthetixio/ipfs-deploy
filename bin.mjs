#!/usr/bin/env node
import debug from 'debug';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { deploy } from './deploy.mjs';

dotenv.config();
const log = debug('ipfs-deploy');

const { IPFS_HOST, IPFS_PORT, IPFS_PROTOCOL, IPFS_USER, IPFS_PASS } = process.env;
const [srcDir] = process.argv.slice(2);

console.log(
  await deploy({
    log,
    srcDir,
    IPFS_HOST,
    IPFS_PORT,
    IPFS_PROTOCOL,
    IPFS_USER,
    IPFS_PASS,
  })
);
