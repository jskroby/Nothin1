#!/usr/bin/env node
// compute-nft.js — enterprise-grade CLI

// ✅ 1. CONFIG + VALIDATION via env-schema (AJV + dotenv)
const envSchema = require('env-schema')
const config = envSchema({
  dotenv: true,
  schema: {
    type: 'object',
    required: ['RPC_URL','PRIVATE_KEY','CONTRACT_ADDRESS','ABI_PATH','LLM_PROVIDER'],
    properties: {
      RPC_URL:          { type: 'string', format: 'uri' },
      PRIVATE_KEY:      { type: 'string', minLength: 10 },
      CONTRACT_ADDRESS: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
      ABI_PATH:         { type: 'string' },
      LLM_PROVIDER:     { type: 'string', enum: ['openai','local'] }
    }
  }
})  // env-schema uses Ajv + dotenv to validate and load env vars

// ✅ 2. RESILIENT RETRY HELPER
async function retry(fn, attempts = 3, delay = 1000) {
  for (let i = 1; i <= attempts; i++) {
    try { return await fn() }
    catch (err) {
      console.warn(`Retry ${i}/${attempts} failed: ${err.message}`)
      if (i === attempts) throw err
      await new Promise(r => setTimeout(r, delay))
    }
  }
}  // Basic retry ensures stability of async steps

// ✅ 3. LLM ABSTRACTION
const { Configuration, OpenAIApi } = require('openai')
const localModel = require('./localModel') // your local model logic
async function generateOutput(prompt) {
  switch (config.LLM_PROVIDER) {
    case 'openai':
      const oa = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_KEY }))
      return retry(() =>
        oa.createChatCompletion({ model: 'gpt-4', messages: [{ role: 'user', content: prompt }] })
          .then(res => res.data.choices[0].message.content)
      )
    case 'local':
      return localModel.run(prompt)
    default: throw new Error('Unsupported LLM_PROVIDER')
  }
}

// ✅ 4. CORE DEPENDENCIES
const fs = require('fs')
const { exec } = require('child_process')
const ethers = require('ethers')
const { groth16 } = require('snarkjs')
const { splitToInts, sha256 } = require('./utils')

// ✅ 5. SHELL COMMAND WRAPPER
async function runCmd(cmd) {
  return retry(() => new Promise((res, rej) =>
    exec(cmd, { shell: '/bin/sh' }, (e, out, errout) => e ? rej(Object.assign(e, { stderr: errout })) : res(out))
  ))
}

// ✅ 6. BUILD CIRCUIT + KEYS
async function buildCircuit() {
  console.log('🔨 Building circuit + keys...')
  await runCmd('circom circuits/BlockCompute.circom --r1cs --wasm --sym --output circuits/build')
  await runCmd('snarkjs plonk setup circuits/build/BlockCompute.r1cs circuits/build/circuit_0000.zkey')
  await runCmd('snarkjs zkey beacon circuits/build/circuit_0000.zkey circuits/build/circuit_final.zkey 0102030405060708 10')
  await runCmd('snarkjs zkey export verificationkey circuits/build/circuit_final.zkey circuits/build/verification_key.json')
}

// ✅ 7. GENERATE PROOF
async function generateProof(n, prompt) {
  const provider = new ethers.providers.JsonRpcProvider(config.RPC_URL)
  const block = await provider.getBlock(n)
  const hash = block.hash
  const llmOut = await generateOutput(`${hash}|${prompt}`)
  const digest = sha256(Buffer.from(llmOut)).toString('hex')
  const witness = { n, h: splitToInts(hash), o: splitToInts('0x'+digest) }
  fs.writeFileSync('circuits/build/witness.json', JSON.stringify(witness))
  await runCmd('snarkjs wtns calculate circuits/build/BlockCompute.wasm circuits/build/witness.json circuits/build/witness.wtns')
  const { proof } = await groth16.prove('circuits/build/circuit_final.zkey', 'circuits/build/witness.wtns')
  return { hash, digest, proof }
}

// ✅ 8. SUBMIT TRANSACTION + MINT
async function submitMint(n, hash, digest, proof) {
  const wallet = new ethers.Wallet(config.PRIVATE_KEY, new ethers.providers.JsonRpcProvider(config.RPC_URL))
  const abi = JSON.parse(fs.readFileSync(config.ABI_PATH))
  const contract = new ethers.Contract(config.CONTRACT_ADDRESS, abi, wallet)
  const tx = await contract.submit(n, hash, '0x'+digest, proof)
  console.log('📡 Submitted TX:', tx.hash)
  await tx.wait()
  console.log('✅ Mint confirmed on-chain')
}

// ✅ 9. MAIN EXECUTION FLOW
async function main() {
  const [nStr, ...promptParts] = process.argv.slice(2)
  if (!nStr || promptParts.length < 1) {
    console.error('Usage: compute-nft <block> <prompt>')
    process.exit(1)
  }
  const n = Number(nStr)
  console.log(`Starting end-to-end for block ${n}`)
  await buildCircuit()
  const { hash, digest, proof } = await generateProof(n, promptParts.join(' '))
  await submitMint(n, hash, digest, proof)
}
main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})

