#!/usr/bin/env zx

import { argv } from 'zx'
import fs from 'fs'
import path from 'path'

// Regex file Patterns to skip (against relative path)
const disallow = []

function readJSONFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
}

function writeJSONFileSorted(filePath, jsonObj) {
    const sortedKeys = Object.keys(jsonObj).sort()
    const sortedObj = {}
    for (const key of sortedKeys) {
        sortedObj[key] = jsonObj[key]
    }
    const formatted = JSON.stringify(sortedObj, null, 2) + '\n'
    fs.writeFileSync(filePath, formatted, 'utf-8')
}

function walkDir(dir) {
    let files = []
    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
            files = files.concat(walkDir(fullPath))
        } else {
            files.push(fullPath)
        }
    }
    return files
}

async function main() {
    if (argv._.length < 2) {
        console.error('Usage: sync-json.mjs <source> <destination>')
        process.exit(1)
    }

    const sourceDir = path.resolve(argv._[0])
    const destDir = path.resolve(argv._[1])

    console.log(`Syncing JSON files from:\n  Source:      ${sourceDir}\n  Destination: ${destDir}`)

    const sourceFiles = walkDir(sourceDir).filter(f => f.endsWith('.json'))

    for (const srcFile of sourceFiles) {
        const relativePath = path.relative(sourceDir, srcFile)

        // 🔥 Check disallow patterns
        if (disallow.some(pattern => pattern.test(relativePath))) {
            console.log(`Skipped (disallowed): ${relativePath}`)
            continue
        }

        const destFile = path.join(destDir, relativePath)

        if (!fs.existsSync(destFile)) {
            fs.mkdirSync(path.dirname(destFile), { recursive: true })
            fs.copyFileSync(srcFile, destFile)
            console.log(`Copied new file: ${relativePath}`)
        } else {
            const srcJson = readJSONFile(srcFile)
            const destJson = readJSONFile(destFile)

            // Merge keys: overwrite existing keys and add new ones
            for (const key of Object.keys(srcJson)) {
                destJson[key] = srcJson[key]
            }

            writeJSONFileSorted(destFile, destJson)
            console.log(`Synchronized: ${relativePath}`)
        }
    }

    console.log('Synchronization complete.')
}

await main()
