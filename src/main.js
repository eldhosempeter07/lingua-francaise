import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index";
import { createPinia } from "pinia";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";

const vuetify = createVuetify({
  components,
  directives,
});

const app = createApp(App);
const pinia = createPinia();
app.use(router);
app.use(vuetify);
app.use(pinia);
app.mount("#app");
