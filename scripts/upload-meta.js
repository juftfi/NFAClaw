/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function uploadFile(gateway, apiKey, filePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  const response = await axios.post(gateway, formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: apiKey ? `Bearer ${apiKey}` : undefined,
    },
    maxBodyLength: Infinity,
  });

  return response.data;
}

async function main() {
  const gateway = process.env.FLAP_IPFS_GATEWAY;
  const apiKey = process.env.FLAP_IPFS_API_KEY;
  const inputDir = process.env.METADATA_INPUT_DIR || './metadata';

  if (!gateway) {
    throw new Error('FLAP_IPFS_GATEWAY is required');
  }

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Metadata directory not found: ${inputDir}`);
  }

  const files = fs.readdirSync(inputDir).filter((file) => file.endsWith('.json'));
  if (files.length === 0) {
    console.log('No metadata .json files found.');
    return;
  }

  const results = [];
  for (const file of files) {
    const fullPath = path.join(inputDir, file);
    const data = await uploadFile(gateway, apiKey, fullPath);
    results.push({ file, data });
    console.log(`Uploaded ${file}`);
  }

  const outputPath = path.join(inputDir, 'upload-result.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Upload summary written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error?.response?.data || error);
  process.exit(1);
});
