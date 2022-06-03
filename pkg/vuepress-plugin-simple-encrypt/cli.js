const fs = require('fs')
const yaml = require('js-yaml')
const path = require('path')
const readline = require('readline')
const util = require('util')
const program = require('commander')
const chalk = require('chalk')
const md5 = require('md5')
const { createApp } = require('@vuepress/core')
const { globby, sort, parseFrontmatter } = require('@vuepress/shared-utils')
const { ENCRYPT_CONTAINER_BEGIN_REGEX } = require('./common')
const CryptoJS = require("crypto-js")

const DEFAULT_KEY_LENGTH = 8

const minMarkers = 3
const markerStr = ':'
const markerChar = markerStr.charCodeAt(0)
const markerLen = markerStr.length

function myEndsWith(str, ending) {
    return str.indexOf(ending, str.length - ending.length) !== -1;
}

// ===========================
// 下面是具体的业务
// ===========================
class App {
    constructor(options) {
        this.options = options
    }
    async prepareFiles(files) {
        if (files.length) {
            this.files = files
        } else if (this.options.sourceDir) {
            const patterns = ['**/*.md', '!.vuepress', '!node_modules']
            this.files = sort(await globby(patterns, { cwd: this.options.sourceDir }))
                .map(x => path.join(this.options.sourceDir, x))
            console.log(files)
        } else {
            console.error(chalk.red('[ERROR] No source specified. Use --source-dir or provide files'))
        }
    }
    async encrypt(files) {
        console.log("start encrypt files")

        await this.prepareFiles(files)
        await this.ensureLoadKeyFile()
        await this.prepareMarkdown()
        await this.forFiles(async (frontmatter, content, filename) => {

            // ==== Block-level Encryption ===
            await this.forBlocks(frontmatter, content, filename, async (tokens, match, sourceMap) => {
                if (!match.owners.includes(this.keyFile.user)) {
                    console.warn(chalk.yellow(`[WARN] Skip block with key "${match.key}" owned by other user`))
                    return
                }
                if (match.encrypted) {
                    console.warn(chalk.yellow(`[WARN] Skip encrypted block with key "${match.key}"`))
                    return
                }
                let encryptKey = match.key;

                const newKey = this.options.onNewKey
                console.log("newKey=>", newKey)
                if (newKey) {
                    encryptKey = await this.requestForNewKey(newKey)
                    if (!encryptKey) {
                        return
                    }
                    this.keyFile.keys["key"] = encryptKey
                    match.key = encryptKey
                    await this.saveKeyFile()
                }

                const html = this.markdown.renderer.render(tokens.slice(1, -1), this.markdown.options, {
                    frontmatter: frontmatter.data,
                    relativePath: path.relative(this.options.sourceDir, filename)
                        .replace(/\\/g, '/'),
                    forceInline: true
                })
                const origin = frontmatter.content.slice(sourceMap.contentBegin, sourceMap.contentEnd)
                const plaintext = JSON.stringify({
                    markdown: origin,
                    component: {
                        template: `<div>${html}</div>`
                    }
                })
                const preambleSpace = frontmatter.content.slice(sourceMap.begin, sourceMap.begin + sourceMap.shift)
                const preamble = preambleSpace + markerStr.repeat(sourceMap.markerCount)

                let encryptedText = CryptoJS.AES.encrypt(plaintext, encryptKey).toString()

                if (!myEndsWith(encryptedText, "\n")) {
                    encryptedText += "\n"
                }

                const output = `${preamble} encrypt encrypted key=${match.key} owners=${match.owners.join(',')}\n`
                    + encryptedText
                    + `${preamble}`
                console.log(chalk.green(`[INFO] Encrypt block with key "${match.key}"`))
                return output
            })
        })
    }
    async decrypt(files) {
        await this.prepareFiles(files)
        await this.ensureLoadKeyFile()
        await this.prepareMarkdown()
        console.log("start decrypt files")

        await this.forFiles(async (frontmatter, content, filename) => {
            console.log("find file:" + filename)

            // ==== Block-level Decryption ===
            await this.forBlocks(frontmatter, content, filename, async (tokens, match, sourceMap) => {
                if (!match.owners.includes(this.keyFile.user)) {
                    console.warn(chalk.yellow(`[WARN] Skip block with key "${match.key}" owned by other user`))
                    return
                }
                if (!match.encrypted) {
                    console.warn(chalk.yellow(`[WARN] Skip decrypted block with key "${match.key}"`))
                    return
                }
                // if (!this.keyFile.keys[match.key]) {
                //     console.error(chalk.red(`[ERROR] Abort due to the missing key "${match.key}"`))
                //     process.exit(1)
                // }

                let encryptKey = match.key;// this.keyFile.keys[match.key]

                const newKey = this.options.onNewKey
                console.log("newKey=>", newKey)
                if (newKey) {
                    encryptKey = await this.requestForNewKey(newKey)
                    if (!encryptKey) {
                        return
                    }
                    this.keyFile.keys["key"] = encryptKey
                    match.key = encryptKey
                    await this.saveKeyFile()
                }

                const block = frontmatter.content.slice(sourceMap.contentBegin, sourceMap.contentEnd)

                // Decrypt
                var bytes = CryptoJS.AES.decrypt(
                    block.replace(/\s*/g, ''),
                    encryptKey
                );
                var originalText = bytes.toString(CryptoJS.enc.Utf8);

                const { markdown } = JSON.parse(originalText)
                const preambleSpace = frontmatter.content.slice(sourceMap.begin, sourceMap.begin + sourceMap.shift)
                const preamble = preambleSpace + markerStr.repeat(sourceMap.markerCount)
                if (!myEndsWith(markdown, "\n")) {
                    markdown += "\n"
                }
                const output = `${preamble} encrypt key=${match.key} owners=${match.owners.join(',')}\n` + markdown + `${preamble}`
                console.log(chalk.green(`[INFO] Decrypt block with key "${match.key}"`))
                return output
            })
        });
    }
    async loadKeyFile() {
        this.keyFile = JSON.parse(await util.promisify(fs.readFile)(this.options.keyFile, 'utf8'))
    }
    async ensureLoadKeyFile() {
        try {
            await this.loadKeyFile()
        } catch (e) {
            console.error(chalk.red('[ERROR] Failed to load key file. Use "oth-encrypt init" to create a valid one'))
            console.error(chalk.red(`[ERROR] ${e.message}`))
            process.exit(1)
        }
    }
    async writeBackToFile(filename, content) {
        await util.promisify(fs.writeFile)(filename, content, 'utf8')
    }
    async requestForNewKey (key) {
        if (this.options.onNewKey === 'abort') {
            console.log(chalk.red(`[ERROR] Aborted due to new key "${key}" request`))
            process.exit(1)
        } else if (this.options.onNewKey === 'skip') {
            console.warn(chalk.yellow(`[WARN] Skip key "${key}"`))
            return false
        } else if (this.options.onNewKey === 'ask') {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })
            rl.question[util.promisify.custom] = (question) => {
                return new Promise((resolve) => {
                    rl.question(question, resolve)
                })
            }
            let answer
            do {
                answer = await util.promisify(rl.question)(`[PROMPT] Key for "${key}" does not exist. Please input the key: `)
            } while (!answer)
            rl.close()
            return answer
        }
        return randomKey(DEFAULT_KEY_LENGTH)
    }
    async prepareMarkdown() {
        const app = createApp({
            sourceDir: path.resolve(this.options.sourceDir),
            theme: '@vuepress/default',
            temp: this.options.temp
        })
        await app.process()
        this.markdown = app.markdown
        this.markdown.block.ruler.at('container_encrypt', (state, startLine, endLine, silent) => {
            // These codes are copied from https://github.com/markdown-it/markdown-it-container/blob/master/index.js
            let start = state.bMarks[startLine] + state.tShift[startLine]
            let max = state.eMarks[startLine]
            if (markerChar !== state.src.charCodeAt(start)) { return false }
            let pos
            for (pos = start + 1; pos <= max; pos++) {
                if (markerStr[(pos - start) % markerLen] !== state.src[pos]) {
                    break
                }
            }
            const markerCount = Math.floor((pos - start) / markerLen)
            if (markerCount < minMarkers) { return false }
            const markup = state.src.slice(start, pos)
            const params = state.src.slice(pos, max)
            const match = params.match(ENCRYPT_CONTAINER_BEGIN_REGEX)
            if (!match) { return false }
            if (silent) { return true }
            let nextLine = startLine
            let autoClosed
            for (; ;) {
                nextLine++
                if (nextLine >= endLine) {
                    break
                }
                start = state.bMarks[nextLine] + state.tShift[nextLine]
                max = state.eMarks[nextLine]
                if (start < max && state.sCount[nextLine] < state.blkIndent) {
                    break
                }
                if (markerChar !== state.src.charCodeAt(start)) { continue }
                if (state.sCount[nextLine] - state.blkIndent >= 4) {
                    continue
                }
                for (pos = start + 1; pos <= max; pos++) {
                    if (markerStr[(pos - start) % markerLen] !== state.src[pos]) {
                        break
                    }
                }
                if (Math.floor((pos - start) / markerLen) < markerCount) { continue }
                pos -= (pos - start) % markerLen
                pos = state.skipSpaces(pos)
                if (pos < max) { continue }
                autoClosed = true
                break
            }
            const oldParent = state.parentType
            const oldLineMax = state.lineMax
            state.parentType = 'container'
            state.lineMax = nextLine
            const openToken = state.push('container_encrypt_open', 'div', 1)
            openToken.markup = markup
            openToken.block = true
            openToken.info = params
            openToken.map = [startLine, nextLine]
            state.md.block.tokenize(state, startLine + 1, nextLine)
            const closeToken = state.push('container_encrypt_close', 'div', -1)
            closeToken.markup = state.src.slice(start, pos)
            closeToken.block = true
            state.parentType = oldParent
            state.lineMax = oldLineMax
            state.line = nextLine + (autoClosed ? 1 : 0)
            const encrypt = this.markdown.$data.encrypt || (this.markdown.$data.encrypt = [])
            encrypt.push({
                openToken,
                closeToken,
                match: {
                    encrypted: !!match[1],
                    key: match[2],
                    owners: match[3].split(',')
                },
                sourceMap: {
                    begin: state.bMarks[startLine],
                    end: state.eMarks[nextLine],
                    contentBegin: state.bMarks[startLine + 1],
                    contentEnd: state.bMarks[nextLine],
                    shift: state.tShift[startLine],
                    markerCount
                }
            })
            return true
        }, {
            alt: ['paragraph', 'reference', 'blockquote', 'list']
        })
    }
    async saveKeyFile () {
        try {
            await util.promisify(fs.writeFile)(this.options.keyFile, JSON.stringify(this.keyFile, null, 2), 'utf8')
        } catch (e) {
            console.log(chalk.red('[ERROR] Cannot store the key file!'))
            console.log(chalk.red(`[ERROR] ${e.message}`))
            process.exit(1)
        }
    }
    async forFiles(callback) {
        for (const filename of this.files) {
            const content = await util.promisify(fs.readFile)(filename, 'utf8')
            const frontmatter = parseFrontmatter(content)
            if (!content.endsWith(frontmatter.content)) {
                throw new Error('Parsed content returned by parseFrontmatter is incorrect')
            }

            // 只保留一个目录，防止每次都去遍历所有
            if ("docs/temp/temp.md" != filename) {
                continue;
            } else {
                await callback(frontmatter, content, filename)
                break;
            }
        }
    }
    async forBlocks(frontmatter, content, filename, callback) {
        this.markdown.$data = {}
        this.markdown.$data.__data_block = {}
        this.markdown.$dataBlock = this.markdown.$data.__data_block
        const tokens = this.markdown.parse(frontmatter.content, {
            frontmatter: frontmatter.data,
            relativePath: path.relative(this.options.sourceDir, filename)
                .replace(/\\/g, '/')
        })
        if (!this.markdown.$data.encrypt) {
            return
        }
        const tokensMap = new Map()
        for (let i = 0; i < tokens.length; ++i) {
            tokensMap.set(tokens[i], i)
        }
        let offset = content.length - frontmatter.content.length
        let modified = false
        let lastEndingLine = 0
        for (const block of this.markdown.$data.encrypt) {
            if (block.openToken.map[0] < lastEndingLine) {
                throw new Error('Nested encryption is not supported')
            }
            lastEndingLine = block.openToken.map[1] + 1
            const openIndex = tokensMap.get(block.openToken)
            const closeIndex = tokensMap.get(block.closeToken)
            if (openIndex === undefined || closeIndex === undefined) {
                throw new Error('Cannot find the open and close token')
            }
            const newContent = await callback(tokens.slice(openIndex, closeIndex + 1), block.match, block.sourceMap)
            if (typeof newContent === 'string') {
                content = content.slice(0, block.sourceMap.begin + offset) + newContent + content.slice(block.sourceMap.end + offset)
                offset += newContent.length - (block.sourceMap.end - block.sourceMap.begin)
                modified = true
            }
        }
        if (modified) {
            console.log(chalk.green(`[INFO] Write changes back to file "${filename}"`))
            await this.writeBackToFile(filename, content)
        }
    }
}

program
    .version('0.1.0')
    .description('Encrypt or decrypt markdown files for VuePress')
program
    .command('encrypt [files...]')
    .description('encrypt files or directories, default to source dir')
    .requiredOption('-s, --source-dir <dir>', 'source of VuePress (will load customized plugins from it)')
    .requiredOption('-k, --key-file <file>', 'file that stores key. Should be in .gitignore when using public repo')
    .option('--on-new-key [newkey]', 'action when new key is needed, default to generate a key. can be [abort/ask/skip/generate]', 'generate')
    .option('--temp [dir]', 'the temporary directory for client')
    .action(async (files, options) => {
        const app = new App(options)
        await app.encrypt(files)
    })
program
    .command('decrypt [files...]')
    .description('decrypt files or directories, default to source dir')
    .requiredOption('-s, --source-dir <dir>', 'source of VuePress (will load customized plugins from it)')
    .requiredOption('-k, --key-file <file>', 'file that stores key. Should be in .gitignore when using public repo')
    .option('--on-new-key [newkey]', 'action when new key is needed, default to generate a key. can be [abort/ask/skip/generate]', 'generate')
    .option('--temp [dir]', 'the temporary directory for client')
    .action(async (files, options) => {
        const app = new App(options)
        await app.decrypt(files)
    })
program
    .command('check [files...]')
    .description('check files or directories is encrypted')
    .requiredOption('-s, --source-dir <dir>', 'source of VuePress (will load customized plugins from it)')
    .requiredOption('-k, --key-file <file>', 'file that stores key. Should be in .gitignore when using public repo')
    .option('--temp [dir]', 'the temporary directory for client')
    .action(async (files, options) => {
        const app = new App(options)
        await app.check(files)
    })
program.command('help')
    .description('print this help message')
    .action(() => { program.outputHelp() })

program.parseAsync(process.argv).catch(err => {
    console.error(err)
})