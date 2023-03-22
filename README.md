# ipfs-deploy

`ipfs-deploy` is a command-line tool for deploying static websites to an auth-protected IPFS cluster. It takes care of recursively adding the files in the specified source directory to the IPFS cluster, authenticating with the cluster using provided credentials, and outputting the IPFS hash (CID) of the root folder.

## Install
```sh
npm install -g @noisekit/ipfs-deploy
```

## ENV
Configure the environment variables with your IPFS cluster credentials and settings.


```sh
IPFS_HOST=ipfs.synthetix.io
IPFS_PORT=443
IPFS_PROTOCOL=https
IPFS_USER=
IPFS_PASS=
```

## CLI

Usage and examples

```sh
# SOURCE_DIR will be recursively pinned to IPFS under `www/` path
# prints Qm CID of pinned root `www` folder 
> ipfs-deploy SOURCE_DIR

# Example: Deploy the `dist` folder and output Qm into `cid.txt` file
ipfs-deploy ./dist > ./cid.txt

# Example: Deploy the `public` folder and store the CID in an environment variable
export IPFS_CID=$(ipfs-deploy ./public)

# Example: Deploy a custom folder (e.g., 'build') and output the CID
ipfs-deploy ./build

# Print all CIDs using DEBUG
DEBUG=ipfs-deploy ipfs-deploy ./dist
```
