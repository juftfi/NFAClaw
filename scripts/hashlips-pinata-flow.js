/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const PINATA_FILE_ENDPOINT = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

function must(value, key) {
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function isPng(file) {
  return file.toLowerCase().endsWith('.png');
}

function numericSort(a, b) {
  const na = Number.parseInt(path.parse(a).name, 10);
  const nb = Number.parseInt(path.parse(b).name, 10);
  if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b);
  return na - nb;
}

function normalizeTokenName(rawName, edition, collectionName) {
  const base = rawName || `${edition}`;
  if (base.toLowerCase().startsWith(collectionName.toLowerCase())) return base;
  return `${collectionName} #${edition}`;
}

async function pinDirectoryToPinata(dirPath, jwt, pinName) {
  const formData = new FormData();
  const rootDirName = path.basename(path.resolve(dirPath));

  const files = fs.readdirSync(dirPath)
    .filter((f) => fs.statSync(path.join(dirPath, f)).isFile())
    .sort(numericSort);

  if (files.length === 0) {
    throw new Error(`No files found in ${dirPath}`);
  }

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    formData.append('file', fs.createReadStream(fullPath), {
      filepath: `${rootDirName}/${file}`,
    });
  }

  formData.append('pinataMetadata', JSON.stringify({
    name: pinName,
  }));

  formData.append('pinataOptions', JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: true,
  }));

  const response = await axios.post(PINATA_FILE_ENDPOINT, formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${jwt}`,
    },
    maxBodyLength: Infinity,
  });

  return response.data;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildMetadata({ edition, filename, collectionName, description, imageUriBase, externalUrl }) {
  const image = `${imageUriBase}/${filename}`;
  const now = Date.now();

  return {
    name: normalizeTokenName('', edition, collectionName),
    description,
    image,
    edition,
    attributes: [],
    compiler: 'HashLips Art Engine',
    date: now,
    ...(externalUrl ? { external_url: externalUrl } : {}),
  };
}

function loadTemplateMetadataByEdition(templateDir) {
  if (!templateDir) return new Map();
  if (!fs.existsSync(templateDir) || !fs.statSync(templateDir).isDirectory()) {
    throw new Error(`NFT_METADATA_TEMPLATE_DIR is invalid: ${templateDir}`);
  }

  const files = fs.readdirSync(templateDir)
    .filter((f) => f.toLowerCase().endsWith('.json') && fs.statSync(path.join(templateDir, f)).isFile())
    .sort(numericSort);

  const byEdition = new Map();
  files.forEach((file) => {
    const fullPath = path.join(templateDir, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const edition = Number.parseInt(String(data.edition || path.parse(file).name), 10);
    if (!Number.isNaN(edition)) {
      byEdition.set(edition, data);
    }
  });
  return byEdition;
}

function getImageFilenameFromTemplate(template) {
  if (!template || typeof template.image !== 'string') return '';
  const cleaned = template.image.split('?')[0].split('#')[0];
  const parts = cleaned.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function writeMetadataFromImages({
  imageDir,
  metadataDir,
  metadataTemplateDir,
  collectionName,
  description,
  imageUriBase,
  externalUrl,
  startEdition,
}) {
  ensureDir(metadataDir);
  const templateByEdition = loadTemplateMetadataByEdition(metadataTemplateDir);

  const imageFiles = fs.readdirSync(imageDir)
    .filter((f) => fs.statSync(path.join(imageDir, f)).isFile() && isPng(f))
    .sort(numericSort);

  if (imageFiles.length === 0) {
    throw new Error(`No png images found in ${imageDir}`);
  }

  imageFiles.forEach((filename, index) => {
    const edition = startEdition + index;
    const template = templateByEdition.get(edition);
    const templateFilename = getImageFilenameFromTemplate(template);
    const finalFilename = templateFilename || filename;
    const metadata = template
      ? {
          ...template,
          edition,
          image: `${imageUriBase}/${finalFilename}`,
          name: template.name || normalizeTokenName('', edition, collectionName),
          description: template.description || description,
        }
      : buildMetadata({
          edition,
          filename: finalFilename,
          collectionName,
          description,
          imageUriBase,
          externalUrl,
        });

    const outFile = path.join(metadataDir, `${edition}.json`);
    fs.writeFileSync(outFile, JSON.stringify(metadata, null, 2), 'utf8');
  });

  return imageFiles;
}

async function main() {
  const dryRun = ['1', 'true', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());
  const pinataJwt = dryRun
    ? ''
    : must(process.env.PINATA_JWT || process.env.FLAP_IPFS_API_KEY, 'PINATA_JWT (or FLAP_IPFS_API_KEY)');
  const imageDir = must(process.env.NFT_IMAGE_DIR, 'NFT_IMAGE_DIR');
  const metadataDir = process.env.NFT_METADATA_DIR || path.join(imageDir, '..', 'metadata');
  const metadataTemplateDir = process.env.NFT_METADATA_TEMPLATE_DIR || '';
  const collectionName = process.env.NFT_COLLECTION_NAME || 'Flap NFA';
  const description = process.env.NFT_DESCRIPTION || 'Flap NFA collection metadata';
  const externalUrl = process.env.NFT_EXTERNAL_URL || '';
  const startEdition = Number.parseInt(process.env.NFT_START_EDITION || '1', 10);

  if (!fs.existsSync(imageDir) || !fs.statSync(imageDir).isDirectory()) {
    throw new Error(`NFT_IMAGE_DIR is invalid: ${imageDir}`);
  }

  console.log('[1/5] Generate temporary metadata with placeholder image URI...');
  writeMetadataFromImages({
    imageDir,
    metadataDir,
    metadataTemplateDir,
    collectionName,
    description,
    imageUriBase: 'ipfs://__IMAGE_CID__',
    externalUrl,
    startEdition,
  });

  let imageCid = '';
  if (dryRun) {
    console.log('[2/5] DRY_RUN enabled, skip image upload.');
    imageCid = 'bafybeidryrunimagecidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  } else {
    console.log('[2/5] Upload image folder to Pinata/IPFS...');
    const imagePin = await pinDirectoryToPinata(
      imageDir,
      pinataJwt,
      `${collectionName}-images-${Date.now()}`
    );
    imageCid = imagePin.IpfsHash;
  }

  console.log('[3/5] Backfill metadata image field with real image CID...');
  writeMetadataFromImages({
    imageDir,
    metadataDir,
    metadataTemplateDir,
    collectionName,
    description,
    imageUriBase: `ipfs://${imageCid}`,
    externalUrl,
    startEdition,
  });

  let metadataCid = '';
  if (dryRun) {
    console.log('[4/5] DRY_RUN enabled, skip metadata upload.');
    metadataCid = 'bafybeidryrunmetacidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  } else {
    console.log('[4/5] Upload metadata folder to Pinata/IPFS...');
    const metadataPin = await pinDirectoryToPinata(
      metadataDir,
      pinataJwt,
      `${collectionName}-metadata-${Date.now()}`
    );
    metadataCid = metadataPin.IpfsHash;
  }

  const result = {
    imageCid,
    metadataCid,
    imageBaseUri: `ipfs://${imageCid}`,
    metadataBaseUri: `ipfs://${metadataCid}`,
    tokenUriTemplate: `ipfs://${metadataCid}/{tokenId}.json`,
    imageGatewaySample: `https://gateway.pinata.cloud/ipfs/${imageCid}`,
    metadataGatewaySample: `https://gateway.pinata.cloud/ipfs/${metadataCid}/1.json`,
    dryRun,
    createdAt: new Date().toISOString(),
    imageDir,
    metadataDir,
  };

  const outputFile = path.join(metadataDir, 'pinata-flow-result.json');
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');

  console.log('[5/5] Done.');
  console.log(JSON.stringify(result, null, 2));
  console.log(`Result saved: ${outputFile}`);
}

main().catch((error) => {
  console.error(error?.response?.data || error);
  process.exit(1);
});
