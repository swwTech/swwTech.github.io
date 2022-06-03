const basePath = process.cwd() + "/pkg/vuepress-plugin-simple-encrypt";
// console.log("basePath=>", basePath)
const { ENCRYPT_CONTAINER_BEGIN_REGEX } = require('./common')

module.exports = (options, ctx) => {
    options = options || {}
    return {
        name: 'vuepress-plugin-simple-encrypt',
        extendMarkdown: md => {
            // console.log("extendMarkdown");
            md.use(require('../../node_modules/markdown-it-container/dist/markdown-it-container.js'), 'encrypt', {
                validate(params) {
                    // console.log("params=>", params)
                    // console.log("match=>", params.match(ENCRYPT_CONTAINER_BEGIN_REGEX))
                    return params.match(ENCRYPT_CONTAINER_BEGIN_REGEX)
                },
                render(tokens, idx) {
                    const m = tokens[idx].info.match(ENCRYPT_CONTAINER_BEGIN_REGEX)
                    // console.log("match=>", tokens[idx].info.match(ENCRYPT_CONTAINER_BEGIN_REGEX))
                    // console.log("nesting=>", tokens[idx].nesting)
                    if (tokens[idx].nesting === 1) {
                        // console.log("encrypt content opening tag")
                        // opening tag
                        return `<EncryptedContent key-name="${m[2]}" owners="${m[3]}" :encrypted="${!!m[1]}">`
                    } else {
                        // console.log("encrypt content end tag")
                        // closing tag
                        return '</EncryptedContent>\n'
                    }
                }
            })
        },
        alias: {
            vue: 'vue/dist/vue.esm.js',
            '@encrypt-event': `${basePath}/event.js`
        },
        define: {
            'EN_CONTENT_TITLE': options.contentTitle || 'Encrypted Content',
            'EN_UNENCRYPTED_TEXT': options.unencryptedText || 'The content is shown below. It should be encrypted when published.',
            'EN_ENCRYPTED_TEXT': options.encryptedText || 'This part of content is encrypted. To view it, you need to enter the correct key in the input field below.',
            'EN_DECRYPTED_TEXT': options.decryptedText || 'The encrypted content is successfully decrypted and shown below.',
            'EN_DECRYPT_BUTTON_TEXT': options.decryptButtonText || 'Decrypt',
            'EN_UNENCRYPTED_ICON': options.unencryptedIcon,
            'EN_ENCRYPTED_ICON': options.encryptedIcon,
            'EN_DECRYPTED_ICON': options.decryptedIcon
        },
        plugins: [
            ['@vuepress/register-components', {
                components: [
                    {
                        name: 'EncryptedContent',
                        path: `${basePath}/EncryptedContent.vue`
                    }
                ]
            }]
        ]
    }
}