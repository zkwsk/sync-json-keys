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

function getDictionaryEntrySegment(key) {
    if (!key.startsWith('DictionaryEntry.')) {
        return null
    }
    const segments = key.split('.')
    return segments.length > 1 ? segments[1] : null
}

function processSingleKey(srcKey, srcJson, destJson, matchedDestKeys) {
    const srcSegment = getDictionaryEntrySegment(srcKey)
    
    // Guard: Handle regular keys (non-DictionaryEntry)
    if (!srcSegment) {
        destJson[srcKey] = srcJson[srcKey]
        return
    }

    // Process DictionaryEntry keys
    const matchingDestKey = findMatchingDestinationKey(srcSegment, destJson, matchedDestKeys)
    
    // Guard: No matching segment found, add source key
    if (!matchingDestKey) {
        destJson[srcKey] = srcJson[srcKey]
        return
    }

    // Update matching destination key
    updateDestinationKey(matchingDestKey, srcKey, srcJson, destJson, matchedDestKeys, srcSegment)
}

function findMatchingDestinationKey(srcSegment, destJson, matchedDestKeys) {
    for (const destKey of Object.keys(destJson)) {
        // Guard: Skip already matched keys
        if (matchedDestKeys.has(destKey)) continue
        
        const destSegment = getDictionaryEntrySegment(destKey)
        
        // Guard: Skip non-matching segments
        if (!destSegment || destSegment !== srcSegment) continue
        
        return destKey
    }
    return null
}

function updateDestinationKey(destKey, srcKey, srcJson, destJson, matchedDestKeys, segment) {
    // Guard: Only update if values differ
    if (destJson[destKey] !== srcJson[srcKey]) {
        console.log(`Dictionary match: "${destKey}" (${segment}) updated with value from "${srcKey}"`)
        destJson[destKey] = srcJson[srcKey]
    }
    
    matchedDestKeys.add(destKey)
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

        // Guard: Skip disallowed patterns
        if (disallow.some(pattern => pattern.test(relativePath))) {
            console.log(`Skipped (disallowed): ${relativePath}`)
            continue
        }

        const destFile = path.join(destDir, relativePath)

        // Guard: Handle new files
        if (!fs.existsSync(destFile)) {
            fs.mkdirSync(path.dirname(destFile), { recursive: true })
            fs.copyFileSync(srcFile, destFile)
            console.log(`Copied new file: ${relativePath}`)
            continue
        }

        // Process existing files
        const srcJson = readJSONFile(srcFile)
        const destJson = readJSONFile(destFile)
        const matchedDestKeys = new Set()

        for (const srcKey of Object.keys(srcJson)) {
            processSingleKey(srcKey, srcJson, destJson, matchedDestKeys)
        }

        writeJSONFileSorted(destFile, destJson)
        console.log(`Synchronized: ${relativePath}`)
    }

    console.log('Synchronization complete.')
}

await main()
