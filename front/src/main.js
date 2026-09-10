import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import axios from "axios"

loadFonts()

var app = createApp(App)
  .use(router)
  .use(store)
  .use(vuetify)
axios.defaults.baseURL = "/api"
app.config.globalProperties.$axios = axios;

app.mount('#app')
