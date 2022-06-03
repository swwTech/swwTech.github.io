<template>
  <div>
    <MyClientOnly @contentReady="onContentReady">
      <div class="encrypted-header">
        <p v-if="icon" class="encrypted-icon">
          <i :class="icon" />
        </p>
        <p class="encrypted-title">
          {{ contentTitle }}
        </p>
        <div v-if="!encrypted">
          <p>{{ unencryptedText }}</p>
        </div>
        <div v-else-if="!decryptedComponent">
          <p>{{ encryptedText }}</p>
          <p>
            <input
              v-model.lazy="keyFromInput"
              type="password"
              @keyup.enter="onConfirm"
            />
            <button @click="onConfirm">
              {{ decryptButtonText }}
            </button>
          </p>
        </div>
        <div v-else>
          <p>{{ decryptedText }}</p>
        </div>
      </div>
      <!-- for decrypted component -->
      <div v-show="!encrypted" ref="content">
        <slot />
      </div>
      <component :is="decryptedComponent" v-if="decryptedComponent" />
    </MyClientOnly>
  </div>
</template>


<script>
import event from "@encrypt-event";
import MyClientOnly from "./MyClientOnly.vue";
const CryptoJS = require("crypto-js");

export default {
  name: "EncryptedContent",
  components: {
    MyClientOnly,
  },
  props: {
    keyName: {
      type: String,
      required: true,
    },
    owners: {
      type: String,
      required: true,
    },
    encrypted: {
      type: Boolean,
      required: true,
    },
  },
  data: () => ({
    encryptedContent: "",
    keyFromInput: "",
    decryptedComponent: "",
  }),
  computed: {
    contentTitle() {
      return EN_CONTENT_TITLE;
    },
    unencryptedText() {
      return EN_UNENCRYPTED_TEXT;
    },
    encryptedText() {
      return EN_ENCRYPTED_TEXT;
    },
    decryptedText() {
      return EN_DECRYPTED_TEXT;
    },
    decryptButtonText() {
      return EN_DECRYPT_BUTTON_TEXT;
    },
    icon() {
      if (!this.encrypted) {
        return EN_UNENCRYPTED_ICON || "";
      } else if (!this.decryptedComponent) {
        return EN_ENCRYPTED_ICON || "";
      } else {
        return EN_DECRYPTED_ICON || "";
      }
    },
  },
  methods: {
    onContentReady() {
      this.$nextTick(() => {
        if (this.encrypted) {
          this.encryptedContent = this.$refs.content.innerText
            .replace(/\s/g, "")
            .replace(/\*/g, "=");
        } else {
          event.$emit("decrypt-already");
        }
      });
    },
    onConfirm() {
      try {
        // Decrypt
        var bytes = CryptoJS.AES.decrypt(
          this.encryptedContent,
          this.keyFromInput
        );
        var originalText = bytes.toString(CryptoJS.enc.Utf8);
        // console.log("originalText=>" + originalText);

        this.$nextTick(() => {
          const cmpText = originalText.replace(/\s*/g, "");
          // console.log("txt=>[", cmpText + "]");
          // console.log("txt len", cmpText.length);
          if (cmpText.length == 0 || cmpText == "") {
            alert("密码错误，请留言获取密码，或者联系 youweics@163.com");
            event.$emit("decrypt-failed");
          } else {
            const { component } = JSON.parse(originalText);
            this.decryptedComponent = component;
            // console.log("this.decryptedComponent=>", component);
            event.$emit("decrypt-succeed");
          }
        });
      } catch (e) {
        alert("密码错误，请留言获取密码，或者联系 youweics@163.com");
        console.log(e);
        event.$emit("decrypt-failed");
      }
    },
  },
};
</script>

<style>
.encrypted-header {
  padding: 0.1rem 1.5rem;
  border-left-width: 0.5rem;
  border-left-style: solid;
  margin: 1rem 0;
  border-color: #42b983;
  background-color: lightcyan;
}
.encrypted-title {
  font-weight: 600;
}
.encrypted-icon {
  float: right;
  font-size: 1.4em;
  margin-top: 0.6em !important;
}
.encrypted-header input[type="text"] {
  border-radius: 5px;
  padding: 2px 8px;
  background-color: #e8ffff;
  box-shadow: 0 0 3px #42b983;
  margin: 0.5em 1em 0.5em 0;
}
.encrypted-header button {
  border: none;
  width: 50px;
  cursor: pointer;
  background-color: #42b983;
  color: white;
  border-radius: 5px;
  padding: 2px 8px;
  box-shadow: 0 0 3px #42b983;
  transition: box-shadow 0.2s ease-in-out;
  margin: 0.5em 0;
}
.encrypted-header button:hover {
  box-shadow: 0 0 5px #42b983;
}
</style>
