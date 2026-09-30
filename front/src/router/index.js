import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ImageView from "../views/image.vue"
const routes = [
  {
    path: '/face',
    component: () => import('../views/face.vue')
  },
  {
    path: '/pose',
    component: () => import('../views/pose.vue')
  },
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: "/image",
    component: ImageView
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
