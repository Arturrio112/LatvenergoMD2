import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import VueChartkick from 'vue-chartkick'
import 'chartkick/chart.js'
import router from './router'


createApp(App).use(router).use(VueChartkick).mount('#app')
